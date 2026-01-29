import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import type { AddCompanyRequest, ApiResponse, ProjectCompany } from '$lib/types/project';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/v1/projects/[id]/companies
 * 
 * Add a company to a project
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const projectRef = adminDB.collection('projects').doc(params.id);
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

		// Check if company already exists in project
		const companies = projectData?.companies || {};
		if (companies[body.document_id]) {
			return json(
				{ success: false, error: 'Company already exists in this project' },
				{ status: 409 }
			);
		}

		// Create company snapshot
		const companyData: ProjectCompany = {
			document_id: body.document_id,
			name: body.name,
			businessdomain: body.businessdomain || '',
			address: body.address || '',
			addedAt: FieldValue.serverTimestamp() as any
		};

		// Update project with new company
		await projectRef.update({
			[`companies.${body.document_id}`]: companyData,
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
 * DELETE /api/v1/projects/[id]/companies?companyId=xxx
 * 
 * Remove a company from a project
 */
export const DELETE: RequestHandler = async ({ params, url, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const companyId = url.searchParams.get('companyId');

		if (!companyId) {
			return json(
				{ success: false, error: 'companyId query parameter is required' },
				{ status: 400 }
			);
		}

		const projectRef = adminDB.collection('projects').doc(params.id);
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

		// Check if company exists in project
		const companies = projectData?.companies || {};
		if (!companies[companyId]) {
			return json(
				{ success: false, error: 'Company not found in this project' },
				{ status: 404 }
			);
		}

		// Remove company from project
		await projectRef.update({
			[`companies.${companyId}`]: FieldValue.delete(),
			updatedAt: FieldValue.serverTimestamp()
		});

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
