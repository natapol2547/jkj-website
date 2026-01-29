import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import type { CreateProjectRequest, Project, ApiResponse } from '$lib/types/project';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/v1/projects
 * 
 * List all projects for authenticated user
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const projectsRef = adminDB.collection('projects');
		const snapshot = await projectsRef
			.where('userId', '==', locals.userID)
			.orderBy('updatedAt', 'desc')
			.get();

		const projects = snapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		})) as Project[];

		return json({
			success: true,
			data: projects
		});
	} catch (error) {
		console.error('Get projects error:', error);
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
 * POST /api/v1/projects
 * 
 * Create a new project
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body: CreateProjectRequest = await request.json();

		// Validate required fields
		if (!body.name || body.name.trim() === '') {
			return json(
				{ success: false, error: 'Project name is required' },
				{ status: 400 }
			);
		}

		// Create project document
		const projectData = {
			name: body.name.trim(),
			description: body.description || '',
			status: body.status || 'active',
			tags: body.tags || [],
			notes: body.notes || '',
			userId: locals.userID,
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
			companies: {}
		};

		const projectRef = await adminDB.collection('projects').add(projectData);
		const projectDoc = await projectRef.get();

		const project: Project = {
			id: projectRef.id,
			...projectDoc.data()
		} as Project;

		return json(
			{ success: true, data: project },
			{ status: 201 }
		);
	} catch (error) {
		console.error('Create project error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
