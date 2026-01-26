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
			.describe('Filter by operating status (e.g., "ยังดำเนินกิจการอยู่", "เสร็จการชำระบัญชี", "เลิก", "ร้าง", "แปรสภาพ", "พิทักษ์ทรัพย์เด็ดขาด", "ล้มละลาย", "คืนสู่ทะเบียน", "ฟื้นฟู", "ควบ", "สิ้นสภาพ")'),
		type_of_entity: z
			.string()
			.optional()
			.describe(
				'Filter by entity type (e.g., "บริษัทจำกัด", "ห้างหุ้นส่วนจำกัด")'
			),
		location: z
			.string()
			.optional()
			.describe('Filter by location/province (e.g., "กรุงเทพมหานคร", "กระบี่", "พัทลุง")')
	})
	.optional();

/**
 * Zod schema for the company search tool input
 */
const companySearchSchema = z.object({
	query: z
		.string()
		.min(1)
		.describe(
			'The search query to find companies. Can be a Thai company name (ex. ซีพี แอ็กซ์ตร้า จำกัด), business description, industry, or semantic query like "บริษัทขนส่ง"'
		),
	searchType: z
		.enum(['auto', 'fulltext', 'vector', 'hybrid'])
		.default('auto')
		.describe(
			'Search type: "auto" (recommended - automatically determines best approach), "fulltext" (keyword-based), "vector" (semantic similarity), "hybrid" (combines both with RRF fusion)'
		),
	limit: z
		.number()
		.min(1)
		.max(15)
		.default(10)
		.describe('Maximum number of results to return (1-15, default: 10)'),
	filters: filtersSchema.describe('Optional filters to narrow down search results')
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
				company_id: result.company.company_id,
				name: result.company.name,
				businessdomain: result.company.businessdomain || 'N/A',
				location: result.company.location || 'N/A',
				operating_status: result.company.operating_status || 'N/A',
				type_of_entity: result.company.type_of_entity || 'N/A',
				website: result.company.website || 'N/A',
				phone: result.company.phone || 'N/A',
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
		description: `Search for Thai companies in the database. You may only use Thai language to search for companies.

Use this tool when you need to:
- Find companies by name, industry, or business domain
- Search for companies in a specific location/province in Thailand
- Find companies similar to a description or business concept
- Look up company details like contact information, operating status, and entity type

The tool supports three search modes:
1. "auto" (default) - Automatically picks the best strategy based on your query
2. "fulltext" - Best for exact names, IDs, or specific keywords
3. "vector" - Best for semantic/conceptual queries like "companies that do X"
4. "hybrid" - Combines both methods for comprehensive results

You can also filter results by operating_status, type_of_entity, location.

Returns company information including: name, business domain, location, operating status, entity type, contact details, and relevance score.`,
		schema: companySearchSchema
	}
);

export const tools = [companySearchTool];
export type CompanySearchToolInput = z.infer<typeof companySearchSchema>;
