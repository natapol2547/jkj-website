import type { Timestamp } from 'firebase/firestore';

/**
 * Company snapshot stored within a project (subcollection document)
 * Path: projects/{projectId}/companies/{companyId}
 */
export interface ProjectCompany {
  document_id: string;
  name: string;
  businessdomain: string;
  address: string;
  addedAt: Timestamp;
  /** Number of completed/running research docs. 0 = not researched. Defaults to 0 for existing docs. */
  researchCount: number;
}

/**
 * Research status enum
 */
export type ResearchStatus = 'running' | 'completed' | 'failed';

/**
 * Research document stored in Firestore
 * Path: projects/{projectId}/companies/{companyId}/research/{researchId}
 */
export interface ResearchDocument {
  id?: string;
  content: string;
  topic: string;
  status: ResearchStatus;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
}

/**
 * API request to start research
 */
export interface ResearchRequest {
  projectId: string;
  companyIds: string[];
  topic: string;
}

/**
 * Research result returned from API
 */
export interface ResearchResult {
  companyId: string;
  researchId: string;
  success: boolean;
  error?: string;
}

/**
 * Project status enum
 */
export type ProjectStatus = 'active' | 'archived';

/**
 * Main project interface
 * Note: Companies are now stored in a subcollection, not as a map field
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  tags: string[];
  notes: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Legacy field - for migration purposes only
  companies?: {
    [companyId: string]: ProjectCompany;
  };
}

/**
 * API request to create a project
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  tags?: string[];
  notes?: string;
}

/**
 * API request to update a project
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  tags?: string[];
  notes?: string;
}

/**
 * API request to add a company to a project
 */
export interface AddCompanyRequest {
  document_id: string;
  name: string;
  businessdomain: string;
  address: string;
}

/**
 * API request to batch add companies to projects
 */
export interface BatchAddCompaniesRequest {
  companies: AddCompanyRequest[];
  projectIds: string[];
}

/**
 * Result of a single batch operation
 */
export interface BatchOperationResult {
  companyId: string;
  projectId: string;
  success: boolean;
  error?: string;
}

/**
 * API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Batch API response format
 */
export interface BatchApiResponse {
  success: boolean;
  results: BatchOperationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}
