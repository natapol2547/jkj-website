import { connectToMongo, getCompaniesCollection } from '../mongo';
import { getEmbedding } from '../embeddings';
import { getLocationCoordinates, DEFAULT_LOCATION } from '../maps';
import type {
	Company,
	CompanySearchResult,
	CompanySearchOptions,
	CompanySearchFilters,
	SearchResponse
} from '../types/company';

// Atlas Search index names
const TEXT_SEARCH_INDEX_NAME = 'company_text_search';
const VECTOR_INDEX_NAME = 'mission_vector_index';

// RRF constant (standard value)
const RRF_K = 60;

// Default search radius in meters (50km)
const DEFAULT_SEARCH_RADIUS_METERS = 50000;

/**
 * Build Atlas Search compound filter clauses from search filters
 * For use with $search aggregation
 * Updated to use 'text' operator for string-indexed fields
 * @param filters - The search filters
 * @param locationCoords - Pre-resolved location coordinates (if location filter is used)
 */
function buildSearchFilterClauses(
	filters?: CompanySearchFilters,
	locationCoords?: { lat: number; lng: number }
): any[] {
	if (!filters) return [];

	const filterClauses: any[] = [];

	// String fields use 'text' operator for fuzzy matching
	if (filters.operating_status) {
		filterClauses.push({
			text: {
				query: filters.operating_status,
				path: 'operating_status'
			}
		});
	}

	if (filters.type_of_entity) {
		filterClauses.push({
			text: {
				query: filters.type_of_entity,
				path: 'type_of_entity'
			}
		});
	}

	// Geo filter for location (using geoWithin with circle)
	if (filters.location && locationCoords) {
		filterClauses.push({
			geoWithin: {
				path: 'location',
				circle: {
					center: {
						type: 'Point',
						coordinates: [locationCoords.lng, locationCoords.lat]
					},
					radius: DEFAULT_SEARCH_RADIUS_METERS
				}
			}
		});
	}

	return filterClauses;
}

/**
 * Build MongoDB aggregation filter for vector search pre-filtering
 * Note: Vector search only supports simple operators ($eq, $in, $gt, $lt, etc.)
 * Geo filtering is NOT supported in vector search pre-filter
 * 
 * For string fields, we use $eq for exact matching since vector search
 * doesn't support $regex or Atlas Search operators
 */
function buildVectorSearchFilter(filters?: CompanySearchFilters): Record<string, unknown> | undefined {
	if (!filters) return undefined;

	const filter: Record<string, unknown> = {};

	if (filters.operating_status) {
		// Use $eq for exact matching on operating_status
		filter.operating_status = { $eq: filters.operating_status };
	}

	if (filters.type_of_entity) {
		// Use $eq for exact matching on type_of_entity
		filter.type_of_entity = { $eq: filters.type_of_entity };
	}

	// Note: Location/geo filtering is NOT supported in vector search pre-filter
	// Geo filtering is only available in Atlas Search ($search)
	// If location filter is needed with vector search, consider using hybrid search instead

	return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Perform full-text search using MongoDB Atlas Search ($search aggregation)
 */
export async function fullTextSearch(
	query: string,
	limit: number = 10,
	filters?: CompanySearchFilters
): Promise<CompanySearchResult[]> {
	await connectToMongo();
	const collection = getCompaniesCollection();

	// Pre-fetch location coordinates if location filter is specified
	let locationCoords: { lat: number; lng: number } | undefined;
	if (filters?.location) {
		locationCoords = await getLocationCoordinates(filters.location);
		console.log(`Geocoded "${filters.location}" to:`, locationCoords);
	}

	const filterClauses = buildSearchFilterClauses(filters, locationCoords);

    console.log('filterClauses', filterClauses);

	// Build the $search stage with compound query
	const searchStage: any = {
		$search: {
			index: TEXT_SEARCH_INDEX_NAME,
			compound: {
				must: [
					{
						text: {
							query: query,
							path: ['name', 'businessdomain'], // String fields that support full-text search
							fuzzy: {
								maxEdits: 1 // Allow 1 typo
							}
						}
					}
				]
			}
		}
	};

	// Add filter clauses if any
	if (filterClauses.length > 0) {
		searchStage.$search.compound.filter = filterClauses;
	}

	const pipeline: any[] = [
		searchStage,
		{
			$addFields: {
				searchScore: { $meta: 'searchScore' }
			}
		},
		{
			$project: {
				mission_embedding: 0 // Exclude large embedding array
			}
		},
		{
			$limit: limit
		}
	];

    console.log('compound filter', searchStage.$search.compound);
    console.log('pipeline', pipeline);

	const results = await collection.aggregate(pipeline).toArray();

	return results.map((doc) => ({
		company: doc as unknown as Company,
		score: (doc as any).searchScore || 0,
		searchType: 'fulltext' as const,
		textScore: (doc as any).searchScore || 0
	}));
}

/**
 * Perform vector search using MongoDB Atlas vector search
 */
export async function vectorSearch(
	query: string,
	limit: number = 10,
	filters?: CompanySearchFilters
): Promise<CompanySearchResult[]> {
	await connectToMongo();
	const collection = getCompaniesCollection();

	// Generate embedding for the query
	const queryEmbedding = await getEmbedding(query);

	// Build the filter for vector search
	const preFilter = buildVectorSearchFilter(filters);

	// MongoDB Atlas $vectorSearch aggregation pipeline
	const pipeline: any[] = [
		{
			$vectorSearch: {
				index: VECTOR_INDEX_NAME,
				path: 'mission_embedding',
				queryVector: queryEmbedding,
				numCandidates: limit * 10, // Search more candidates for better results
				limit: limit,
				...(preFilter && { filter: preFilter })
			}
		},
		{
			$addFields: {
				vectorScore: { $meta: 'vectorSearchScore' }
			}
		},
		{
			$project: {
				mission_embedding: 0 // Exclude large embedding array
			}
		}
	];

	const results = await collection.aggregate(pipeline).toArray();

	return results.map((doc) => ({
		company: doc as unknown as Company,
		score: (doc as any).vectorScore || 0,
		searchType: 'vector' as const,
		vectorScore: (doc as any).vectorScore || 0
	}));
}

/**
 * Reciprocal Rank Fusion (RRF) algorithm
 * Combines results from multiple search methods
 *
 * Formula: score = Σ 1/(k + rank) where k=60
 */
function reciprocalRankFusion(
	fulltextResults: CompanySearchResult[],
	vectorResults: CompanySearchResult[]
): CompanySearchResult[] {
	const scoreMap = new Map<
		string,
		{
			company: Company;
			rrfScore: number;
			textScore?: number;
			vectorScore?: number;
		}
	>();

	// Process full-text results
	fulltextResults.forEach((result, index) => {
		const id = result.company.company_id || result.company._id.toString();
		const rrfScore = 1 / (RRF_K + index + 1);

		if (scoreMap.has(id)) {
			const existing = scoreMap.get(id)!;
			existing.rrfScore += rrfScore;
			existing.textScore = result.textScore;
		} else {
			scoreMap.set(id, {
				company: result.company,
				rrfScore,
				textScore: result.textScore
			});
		}
	});

	// Process vector results
	vectorResults.forEach((result, index) => {
		const id = result.company.company_id || result.company._id.toString();
		const rrfScore = 1 / (RRF_K + index + 1);

		if (scoreMap.has(id)) {
			const existing = scoreMap.get(id)!;
			existing.rrfScore += rrfScore;
			existing.vectorScore = result.vectorScore;
		} else {
			scoreMap.set(id, {
				company: result.company,
				rrfScore,
				vectorScore: result.vectorScore
			});
		}
	});

	// Sort by RRF score and convert to results
	const fusedResults = Array.from(scoreMap.values())
		.sort((a, b) => b.rrfScore - a.rrfScore)
		.map((item) => ({
			company: item.company,
			score: item.rrfScore,
			searchType: 'hybrid' as const,
			textScore: item.textScore,
			vectorScore: item.vectorScore
		}));

	return fusedResults;
}

/**
 * Perform hybrid search combining full-text and vector search with RRF
 */
export async function hybridSearch(
	query: string,
	limit: number = 10,
	filters?: CompanySearchFilters
): Promise<CompanySearchResult[]> {
	// Run both searches in parallel
	const [fulltextResults, vectorResults] = await Promise.all([
		fullTextSearch(query, limit * 2, filters),
		vectorSearch(query, limit * 2, filters)
	]);

	// Combine using RRF
	const fusedResults = reciprocalRankFusion(fulltextResults, vectorResults);

	// Return top results
	return fusedResults.slice(0, limit);
}

/**
 * Determine the best search type based on query characteristics and filters
 */
function determineSearchType(query: string, filters?: CompanySearchFilters): 'fulltext' | 'vector' | 'hybrid' {
	// Simple heuristics for auto-detection
	const words = query.trim().split(/\s+/);

	// Short queries (1-2 words) likely benefit from full-text search
	if (words.length <= 2) {
		// Check if it looks like a company name or ID
		const looksLikeId = /^[A-Z0-9-]+$/i.test(query.trim());
		if (looksLikeId) {
			return 'fulltext';
		}
	}

	// Longer, more descriptive queries benefit from semantic search
	if (words.length >= 7) {
		return 'hybrid';
	}

	// Questions or semantic queries (Thai and English)
	const semanticIndicators = [
		'what',
		'how',
		'why',
		'find',
		'looking for',
		'similar to',
		'like',
		'about',
		'related',
		'หา',
		'ค้นหา',
		'ต้องการ',
		'เกี่ยวกับ',
		'คล้าย',
		'แบบ'
	];
	const lowerQuery = query.toLowerCase();
	if (semanticIndicators.some((indicator) => lowerQuery.includes(indicator))) {
		return 'hybrid';
	}

	// Default to hybrid for best coverage
	return 'hybrid';
}

/**
 * Main search function that handles all search types
 */
export async function searchCompanies(options: CompanySearchOptions): Promise<SearchResponse> {
	const startTime = Date.now();
	const { query, searchType = 'auto', limit = 10, filters } = options;

    console.log('query', query);
    console.log('searchType', searchType);
    console.log('limit', limit);
    console.log('filters', filters);

	// Determine actual search type
	let actualSearchType = searchType === 'auto' ? determineSearchType(query, filters) : searchType;

	// If location filter is used and vector-only search is requested,
	// fall back to hybrid since vector search doesn't support geo filtering
	if (filters?.location && actualSearchType === 'vector') {
		console.log('Location filter detected, falling back to hybrid search (vector search does not support geo filtering)');
		actualSearchType = 'hybrid';
	}

	let results: CompanySearchResult[];

	switch (actualSearchType) {
		case 'fulltext':
			results = await fullTextSearch(query, limit, filters);
			break;
		case 'vector':
			results = await vectorSearch(query, limit, filters);
			break;
		case 'hybrid':
		default:
			results = await hybridSearch(query, limit, filters);
			break;
	}

	const executionTimeMs = Date.now() - startTime;

	return {
		results,
		total: results.length,
		searchType: actualSearchType,
		query,
		executionTimeMs
	};
}
