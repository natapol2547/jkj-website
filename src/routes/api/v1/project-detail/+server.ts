import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import type { UpdateProjectRequest, Project } from '$lib/types/project';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/v1/project-detail?id=xxx
 * 
 * Get a single project by ID
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const projectId = url.searchParams.get('id');
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

		const project: Project = {
			id: projectDoc.id,
			...projectData
		} as Project;

		return json({
			success: true,
			data: project
		});
	} catch (error) {
		console.error('Get project error:', error);
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
 * PATCH /api/v1/project-detail?id=xxx
 * 
 * Update a project
 */
export const PATCH: RequestHandler = async ({ url, request, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const projectId = url.searchParams.get('id');
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

		const body: UpdateProjectRequest = await request.json();

		// Build update object with only provided fields
		const updateData: any = {
			updatedAt: FieldValue.serverTimestamp()
		};

		if (body.name !== undefined) {
			if (body.name.trim() === '') {
				return json(
					{ success: false, error: 'Project name cannot be empty' },
					{ status: 400 }
				);
			}
			updateData.name = body.name.trim();
		}

		if (body.description !== undefined) {
			updateData.description = body.description;
		}

		if (body.status !== undefined) {
			updateData.status = body.status;
		}

		if (body.tags !== undefined) {
			updateData.tags = body.tags;
		}

		if (body.notes !== undefined) {
			updateData.notes = body.notes;
		}

		// Update the project
		await projectRef.update(updateData);

		// Fetch updated project
		const updatedDoc = await projectRef.get();
		const project: Project = {
			id: updatedDoc.id,
			...updatedDoc.data()
		} as Project;

		return json({
			success: true,
			data: project
		});
	} catch (error) {
		console.error('Update project error:', error);
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
 * DELETE /api/v1/project-detail?id=xxx
 * 
 * Delete a project
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const projectId = url.searchParams.get('id');
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

		// Delete the project
		await projectRef.delete();

		return json({
			success: true,
			data: { id: projectId }
		});
	} catch (error) {
		console.error('Delete project error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
