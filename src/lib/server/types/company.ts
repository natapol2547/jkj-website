import type { ObjectId } from 'mongodb';

/**
 * GeoJSON Point for location
 */
export interface GeoPoint {
	type: 'Point';
	coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Company document structure in MongoDB
 */
export interface Company {
	_id: ObjectId;
	company_id: string;
	name: string;
	businessdomain?: string;
	location?: GeoPoint; // Geospatial location
	operating_status?: string;
	type_of_entity?: string;
	created_date?: string | null;
	mission_embedding?: number[];
	// Registration fields
	register_capital_thb?: number;
	register_date?: string | { $date: string } | null;
	report_financialyear?: string;
	typecode?: string;
	old_id?: string | null;
	pull_date?: string;
	// Business details
	mission?: string;
	description?: string;
	industry?: string;
	employees?: string;
	// Contact fields
	address?: string;
	telephone?: string | null;
	fax?: string | null;
	email?: string | null;
	website?: string | null;
	phone?: string;
	[key: string]: unknown; // Allow additional fields
}

/**
 * Search result with score information
 */
export interface CompanySearchResult {
	company: Company;
	score: number;
	searchType: 'fulltext' | 'vector' | 'hybrid';
	textScore?: number;
	vectorScore?: number;
}

/**
 * Search options for company search
 */
export interface CompanySearchOptions {
	query: string;
	searchType?: 'auto' | 'fulltext' | 'vector' | 'hybrid';
	limit?: number;
	filters?: CompanySearchFilters;
}

/**
 * Filters that can be applied to search
 */
export interface CompanySearchFilters {
	operating_status?: string;
	type_of_entity?: string;
	location?: string; // When provided, uses geo search around Bangkok (hardcoded for now)
}

/**
 * Response from search operations
 */
export interface SearchResponse {
	results: CompanySearchResult[];
	total: number;
	searchType: 'fulltext' | 'vector' | 'hybrid';
	query: string;
	executionTimeMs: number;
}

/**
 * Internal result type for RRF fusion
 */
export interface RankedResult {
	company: Company;
	rank: number;
	score: number;
	source: 'fulltext' | 'vector';
}
