import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import type { BatchAddCompaniesRequest, BatchOperationResult, ProjectCompany } from '$lib/types/project';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/v1/project-companies-batch
 * 
 * Add multiple companies to multiple projects in a batch operation (using subcollections)
 * Body: { companies: [...], projectIds: [...] }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body: BatchAddCompaniesRequest = await request.json();

		// Validate request
		if (!body.companies || !Array.isArray(body.companies) || body.companies.length === 0) {
			return json(
				{ success: false, error: 'Companies array is required and must not be empty' },
				{ status: 400 }
			);
		}

		if (!body.projectIds || !Array.isArray(body.projectIds) || body.projectIds.length === 0) {
			return json(
				{ success: false, error: 'Project IDs array is required and must not be empty' },
				{ status: 400 }
			);
		}

		// Validate companies data
		for (const company of body.companies) {
			if (!company.document_id || !company.name) {
				return json(
					{ success: false, error: 'Each company must have document_id and name' },
					{ status: 400 }
				);
			}
		}

		const results: BatchOperationResult[] = [];

		// Verify all projects exist and user owns them
		const projectRefs = body.projectIds.map(id => adminDB.collection('projects').doc(id));
		const projectDocs = await adminDB.getAll(...projectRefs);

		const validProjects = new Map<string, { ref: FirebaseFirestore.DocumentReference; data: any }>();
		for (let i = 0; i < projectDocs.length; i++) {
			const doc = projectDocs[i];
			const projectId = body.projectIds[i];

			if (!doc.exists) {
				// Mark all companies for this project as failed
				body.companies.forEach(company => {
					results.push({
						companyId: company.document_id,
						projectId: projectId,
						success: false,
						error: 'Project not found'
					});
				});
				continue;
			}

			const projectData = doc.data();
			if (projectData?.userId !== locals.userID) {
				// Mark all companies for this project as failed
				body.companies.forEach(company => {
					results.push({
						companyId: company.document_id,
						projectId: projectId,
						success: false,
						error: 'Forbidden: You do not own this project'
					});
				});
				continue;
			}

			validProjects.set(projectId, { ref: doc.ref, data: projectData });
		}

		// For each valid project, check existing companies in subcollection
		const existingCompaniesMap = new Map<string, Set<string>>();
		
		for (const [projectId, projectInfo] of validProjects.entries()) {
			const companiesSnapshot = await projectInfo.ref.collection('companies').get();
			const existingIds = new Set(companiesSnapshot.docs.map(doc => doc.id));
			existingCompaniesMap.set(projectId, existingIds);
		}

		// Process each company-project combination using batch
		const batch = adminDB.batch();
		const timestamp = FieldValue.serverTimestamp();

		for (const [projectId, projectInfo] of validProjects.entries()) {
			const existingCompanies = existingCompaniesMap.get(projectId) || new Set();

			for (const company of body.companies) {
				// Check if company already exists in this project's subcollection
				if (existingCompanies.has(company.document_id)) {
					results.push({
						companyId: company.document_id,
						projectId: projectId,
						success: false,
						error: 'Company already exists in this project'
					});
					continue;
				}

				// Create company document in subcollection
				const companyRef = projectInfo.ref.collection('companies').doc(company.document_id);
				const companyData: ProjectCompany = {
					document_id: company.document_id,
					name: company.name,
					businessdomain: company.businessdomain || '',
					address: company.address || '',
					addedAt: timestamp as any
				};

				batch.set(companyRef, companyData);

				results.push({
					companyId: company.document_id,
					projectId: projectId,
					success: true
				});
			}

			// Update project's updatedAt timestamp
			batch.update(projectInfo.ref, {
				updatedAt: timestamp
			});
		}

		// Commit batch
		await batch.commit();

		// Calculate summary
		const successful = results.filter(r => r.success).length;
		const failed = results.filter(r => !r.success).length;

		return json(
			{
				success: true,
				results: results,
				summary: {
					total: results.length,
					successful: successful,
					failed: failed
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Batch add companies error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
