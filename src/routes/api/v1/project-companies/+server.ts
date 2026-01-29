import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import type { AddCompanyRequest, ProjectCompany } from '$lib/types/project';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/v1/project-companies?projectId=xxx
 * 
 * Add a company to a project (using subcollection)
 */
export const POST: RequestHandler = async ({ url, request, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const projectId = url.searchParams.get('projectId');
	if (!projectId) {
		return json(
			{ success: false, error: 'Project ID is required' },
			{ status: 400 }
		);
	}

	try {
		const projectRef = adminDB.collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return json(
				{ success: false, error: 'Project not found' },
				{ status: 404 }
			);
		}

		const projectData = projectDoc.data();

		// Verify ownership
		if (projectData?.userId !== locals.userID) {
			return json(
				{ success: false, error: 'Forbidden' },
				{ status: 403 }
			);
		}

		const body: AddCompanyRequest = await request.json();

		// Validate required fields
		if (!body.document_id || !body.name) {
			return json(
				{ success: false, error: 'Company document_id and name are required' },
				{ status: 400 }
			);
		}

		// Check if company already exists in project subcollection
		const companyRef = projectRef.collection('companies').doc(body.document_id);
		const existingCompany = await companyRef.get();
		
		if (existingCompany.exists) {
			return json(
				{ success: false, error: 'Company already exists in this project' },
				{ status: 409 }
			);
		}

		// Create company document in subcollection
		const companyData: ProjectCompany = {
			document_id: body.document_id,
			name: body.name,
			businessdomain: body.businessdomain || '',
			address: body.address || '',
			addedAt: FieldValue.serverTimestamp() as any
		};

		await companyRef.set(companyData);

		// Update project's updatedAt timestamp
		await projectRef.update({
			updatedAt: FieldValue.serverTimestamp()
		});

		return json(
			{ success: true, data: companyData },
			{ status: 201 }
		);
	} catch (error) {
		console.error('Add company to project error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/v1/project-companies?projectId=xxx&companyId=yyy
 * 
 * Remove a company from a project (and delete research subcollection)
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const projectId = url.searchParams.get('projectId');
	const companyId = url.searchParams.get('companyId');

	if (!projectId) {
		return json(
			{ success: false, error: 'Project ID is required' },
			{ status: 400 }
		);
	}

	if (!companyId) {
		return json(
			{ success: false, error: 'Company ID is required' },
			{ status: 400 }
		);
	}

	try {
		const projectRef = adminDB.collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return json(
				{ success: false, error: 'Project not found' },
				{ status: 404 }
			);
		}

		const projectData = projectDoc.data();

		// Verify ownership
		if (projectData?.userId !== locals.userID) {
			return json(
				{ success: false, error: 'Forbidden' },
				{ status: 403 }
			);
		}

		// Check if company exists in project subcollection
		const companyRef = projectRef.collection('companies').doc(companyId);
		const companyDoc = await companyRef.get();
		
		if (!companyDoc.exists) {
			return json(
				{ success: false, error: 'Company not found in this project' },
				{ status: 404 }
			);
		}

		// Delete all research documents in the research subcollection
		const researchCollection = companyRef.collection('research');
		const researchDocs = await researchCollection.listDocuments();
		
		const batch = adminDB.batch();
		for (const researchDoc of researchDocs) {
			batch.delete(researchDoc);
		}
		
		// Delete the company document
		batch.delete(companyRef);
		
		// Update project's updatedAt timestamp
		batch.update(projectRef, {
			updatedAt: FieldValue.serverTimestamp()
		});

		await batch.commit();

		return json({
			success: true,
			data: { companyId }
		});
	} catch (error) {
		console.error('Remove company from project error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};

/**
 * GET /api/v1/project-companies?projectId=xxx
 * 
 * Get all companies in a project
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const projectId = url.searchParams.get('projectId');
	if (!projectId) {
		return json(
			{ success: false, error: 'Project ID is required' },
			{ status: 400 }
		);
	}

	try {
		const projectRef = adminDB.collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return json(
				{ success: false, error: 'Project not found' },
				{ status: 404 }
			);
		}

		const projectData = projectDoc.data();

		// Verify ownership
		if (projectData?.userId !== locals.userID) {
			return json(
				{ success: false, error: 'Forbidden' },
				{ status: 403 }
			);
		}

		// Get all companies from subcollection
		const companiesSnapshot = await projectRef
			.collection('companies')
			.orderBy('addedAt', 'desc')
			.get();

		const companies = companiesSnapshot.docs.map(doc => ({
			...doc.data(),
			id: doc.id
		}));

		return json({
			success: true,
			data: companies
		});
	} catch (error) {
		console.error('Get project companies error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
