import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { searchCompanies } from '../search/companySearch';
import type { CompanySearchFilters } from '../types/company';
import { createLLM } from '../llm';

// Check if in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
const baseURL = isDevelopment ? 'http://localhost:5173' : 'https://jkj-website.vercel.app';

/**
 * Fast, cheap LLM for reranking results
 */
const rerankerModel = createLLM('openai/gpt-oss-120b:nitro', 2000, 0);

interface CompanyResult {
	rank: number;
	document_id: string;
	company_id: string;
	name: string;
	businessdomain: string;
	address: string;
	operating_status: string;
	// type_of_entity: string;
	company_website: string;
    company_info_link: string;
    google_maps_link: string;
	phone: string;
	email: string;
	relevance_score: number;
}

/**
 * Rerank search results using a fast LLM to filter for relevance
 * Returns indices of relevant results
 */
async function rerankResults(query: string, results: CompanyResult[]): Promise<number[]> {
	if (results.length === 0) return [];
	
	// Create a compact representation for the LLM
	const compactResults = results.map((r, i) => 
		`${i}: ${r.name} | ${r.businessdomain} | ${r.address} | ${r.operating_status}`
	).join('\n');
	
	const prompt = `You are a helpful assistant that reranks search results.

You are given a query and a list of results. You need to rerank the results based on the query.

Query: "${query}"

Results: ${compactResults}

Return JSON array of indices (0-based) for results relevant to the query. Only include truly relevant matches.
Example: [0, 2, 5]
If none relevant: []`;

	try {
		const response = await rerankerModel.invoke(prompt);
		const content = typeof response.content === 'string' 
			? response.content 
			: JSON.stringify(response.content);
		
		// Extract JSON array from response
		const match = content.match(/\[[\d,\s]*\]/);
		if (match) {
			const indices = JSON.parse(match[0]) as number[];
			// Validate indices are within bounds
			return indices.filter(i => i >= 0 && i < results.length);
		}
		// If parsing fails, return all results
		return results.map((_, i) => i);
	} catch (error) {
		console.error('Reranking failed, returning all results:', error);
		// On error, return all results
		return results.map((_, i) => i);
	}
}

/**
 * Zod schema for company search filters
 */
const filtersSchema = z
	.object({
		operating_status: z
			.string()
			.optional()
			.describe('Filter by status: "ยังดำเนินกิจการอยู่" (active), "เลิก" (closed), "ล้มละลาย" (bankrupt)'),
		type_of_entity: z
			.string()
			.optional()
			.describe('Filter by type: "บริษัทจำกัด", "บริษัทมหาชนจำกัด", "ห้างหุ้นส่วนจำกัด"'),
		location: z
			.string()
			.optional()
			.describe('Filter by location: "กรุงเทพมหานคร", "เชียงใหม่", "ภูเก็ต", etc.')
	})
	.optional();

/**
 * Zod schema for the company search tool input
 */
const companySearchSchema = z.object({
	query: z
		.string()
		.min(1)
		.describe('Thai search query: company name, industry, or business description'),
	searchType: z
		.enum(['auto', 'fulltext', 'vector', 'hybrid'])
		.default('auto')
		.describe('Search mode. Use "auto" (default) unless searching exact names ("fulltext")'),
	limit: z
		.number()
		.min(1)
		.max(30)
		.default(20)
		.describe('Number of results (default: 20)'),
	filters: filtersSchema.describe('Optional filters. Use operating_status, type_of_entity, or location to filter the results. This may give more relevant results.')
});

/**
 * Company Search Tool for LangGraph Agent
 *
 * This tool allows searching for Thai companies using:
 * - Full-text search: Keyword-based search on indexed fields (name, location, etc.)
 * - Vector search: Semantic similarity search using mission embeddings
 * - Hybrid search: Combines both using Reciprocal Rank Fusion (RRF) algorithm
 *
 * The tool automatically determines the best search strategy when using "auto" mode.
 */
export const companySearchTool = tool(
	async (input) => {
		try {
			const { query, searchType, limit, filters } = input;

			const response = await searchCompanies({
				query,
				searchType,
				limit,
				filters: filters as CompanySearchFilters | undefined
			});

			// Format results for LLM consumption
			const formattedResults: CompanyResult[] = response.results.map((result, index) => ({
				rank: index + 1,
				document_id: result.company._id.toString(),
				company_id: result.company.company_id,
				name: result.company.name,
				businessdomain: result.company.businessdomain || 'N/A',
				address: result.company.address || 'N/A',
				operating_status: result.company.operating_status || 'N/A',
				// type_of_entity: result.company.type_of_entity || 'N/A',
				company_website: result.company.website || 'N/A',
				company_info_link: `[ข้อมูลเพิ่มเติม](${baseURL}/app/company/${result.company._id})`,
				google_maps_link: `[แผนที่](https://www.google.com/maps/search/?api=1&query=${result.company.name + '+' + result.company.address})`,
				phone: result.company.phone || result.company.telephone || 'N/A',
				email: result.company.email || 'N/A',
				relevance_score: Math.round(result.score * 1000) / 1000
			}));

			// // Rerank results using LLM to filter for relevance
			const relevantIndices = await rerankResults(query, formattedResults);
			const rerankedResults = relevantIndices.map((i, newRank) => ({
				...formattedResults[i],
				rank: newRank + 1 // Update rank after reranking
			}));

			console.log(`Reranked: ${formattedResults.length} → ${rerankedResults.length} results`);

            if (rerankedResults.length === 0) {
                const errorMessage = "No results found on `company_search` tool. Please retry by using `internet_search` tool to find more information. If you still can't find the information, please try again with a different query.";
                return JSON.stringify(
                    {
                        success: false,
                        error: errorMessage,
                        query: input.query
                    }
                );
            }

			return JSON.stringify(
				{
					success: true,
					query: response.query,
					searchType: response.searchType,
					totalResults: rerankedResults.length,
					originalResults: formattedResults.length,
					executionTimeMs: response.executionTimeMs,
					results: rerankedResults
				}
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.log('error', errorMessage);
			return JSON.stringify(
				{
					success: false,
					error: errorMessage,
					query: input.query
				}
			);
		}
	},
	{
		name: 'company_search',
		description: `Search Thai companies by name, industry, or description.

Examples:
- "บริษัทขนส่ง" → query: "บริษัทขนส่ง"
- "โรงแรมในภูเก็ต" → query: "โรงแรม", filters: {location: "ภูเก็ต"}
- "IT ในกรุงเทพ" → query: "IT", filters: {location: "กรุงเทพมหานคร"}
- "บริษัทมหาชน อาหาร" → query: "อาหาร", filters: {type_of_entity: "บริษัทมหาชนจำกัด"}`,
		schema: companySearchSchema
	}
);
export type CompanySearchToolInput = z.infer<typeof companySearchSchema>;
