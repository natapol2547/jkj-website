import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { searchCompanies } from '../search/companySearch';
import type { CompanySearchFilters } from '../types/company';

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
			.describe('Thai province name: "กรุงเทพมหานคร", "เชียงใหม่", "ภูเก็ต", etc.')
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
		.max(15)
		.default(10)
		.describe('Number of results (default: 10)'),
	filters: filtersSchema.describe('Optional filters. Only use when user explicitly requests filtering by status, type, or location.')
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
			const formattedResults = response.results.map((result, index) => ({
				rank: index + 1,
				document_id: result.company._id.toString(),
				company_id: result.company.company_id,
				name: result.company.name,
				businessdomain: result.company.businessdomain || 'N/A',
				address: result.company.address || 'N/A',
				location: result.company.location || 'N/A',
				operating_status: result.company.operating_status || 'N/A',
				type_of_entity: result.company.type_of_entity || 'N/A',
				website: result.company.website || 'N/A',
				phone: result.company.phone || result.company.telephone || 'N/A',
				email: result.company.email || 'N/A',
				relevance_score: Math.round(result.score * 1000) / 1000,
				match_type: result.searchType
			}));

			return JSON.stringify(
				{
					success: true,
					query: response.query,
					searchType: response.searchType,
					totalResults: response.total,
					executionTimeMs: response.executionTimeMs,
					results: formattedResults
				},
				null,
				2
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.log('error', errorMessage);
			return JSON.stringify(
				{
					success: false,
					error: errorMessage,
					query: input.query
				},
				null,
				2
			);
		}
	},
	{
		name: 'company_search',
		description: `Search Thai companies by name, industry, or description.

RULE: Only add filters when user explicitly requests them. No filters for general searches.

Examples:
- "บริษัทขนส่ง" → query: "บริษัทขนส่ง"
- "IT ในกรุงเทพ" → query: "IT", filters: {location: "กรุงเทพมหานคร"}
- "บริษัทมหาชน อาหาร" → query: "อาหาร", filters: {type_of_entity: "บริษัทมหาชนจำกัด"}`,
		schema: companySearchSchema
	}
);

export const tools = [companySearchTool];
export type CompanySearchToolInput = z.infer<typeof companySearchSchema>;
