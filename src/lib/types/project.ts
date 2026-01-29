import type { Timestamp } from 'firebase/firestore';

/**
 * Company snapshot stored within a project
 */
export interface ProjectCompany {
  document_id: string;
  name: string;
  businessdomain: string;
  address: string;
  addedAt: Timestamp;
}

/**
 * Project status enum
 */
export type ProjectStatus = 'active' | 'archived';

/**
 * Main project interface
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
  companies: {
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
 * API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
