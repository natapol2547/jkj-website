import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import { streamDeepResearch } from '$lib/server/agents/deepResearch';
import type { ResearchRequest, ResearchResult, ResearchDocument } from '$lib/types/project';
import { FieldValue } from 'firebase-admin/firestore';

// Maximum concurrent research operations
const MAX_CONCURRENT = 5;

/**
 * POST /api/v1/research
 * 
 * Start research on one or more companies in a project
 * Body: { projectId, companyIds[], topic }
 * 
 * Returns immediately with research IDs, research continues in background
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body: ResearchRequest = await request.json();

		// Validate request
		if (!body.projectId) {
			return json(
				{ success: false, error: 'Project ID is required' },
				{ status: 400 }
			);
		}

		if (!body.companyIds || !Array.isArray(body.companyIds) || body.companyIds.length === 0) {
			return json(
				{ success: false, error: 'Company IDs array is required and must not be empty' },
				{ status: 400 }
			);
		}

		if (!body.topic || typeof body.topic !== 'string' || body.topic.trim().length === 0) {
			return json(
				{ success: false, error: 'Research topic is required' },
				{ status: 400 }
			);
		}

		// Verify project exists and user owns it
		const projectRef = adminDB.collection('projects').doc(body.projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return json(
				{ success: false, error: 'Project not found' },
				{ status: 404 }
			);
		}

		const projectData = projectDoc.data();
		if (projectData?.userId !== locals.userID) {
			return json(
				{ success: false, error: 'Forbidden' },
				{ status: 403 }
			);
		}

		// Get company data from subcollection
		const companiesCollection = projectRef.collection('companies');
		const companyDocs = await Promise.all(
			body.companyIds.map(id => companiesCollection.doc(id).get())
		);

		// Filter out non-existent companies and create research documents
		const researchPromises: Promise<ResearchResult>[] = [];
		const validCompanies: { id: string; data: any }[] = [];

		for (let i = 0; i < companyDocs.length; i++) {
			const doc = companyDocs[i];
			const companyId = body.companyIds[i];

			if (!doc.exists) {
				researchPromises.push(
					Promise.resolve({
						companyId,
						researchId: '',
						success: false,
						error: 'Company not found in project'
					})
				);
				continue;
			}

			validCompanies.push({ id: companyId, data: doc.data() });
		}

		// Create research documents and start research for valid companies
		const researchResults: ResearchResult[] = [];

		// Process in batches to respect concurrency limit
		for (let i = 0; i < validCompanies.length; i += MAX_CONCURRENT) {
			const batch = validCompanies.slice(i, i + MAX_CONCURRENT);
			
			const batchResults = await Promise.all(
				batch.map(async ({ id: companyId, data: companyData }) => {
					try {
						// Create research document with 'running' status
						const researchRef = companiesCollection
							.doc(companyId)
							.collection('research')
							.doc();

						const initialResearch: Omit<ResearchDocument, 'id'> = {
							content: '',
							topic: body.topic,
							status: 'running',
							createdAt: FieldValue.serverTimestamp() as any
						};

						await researchRef.set(initialResearch);

						// Start research in background (don't await completion)
						runResearchInBackground(
							researchRef,
							body.topic,
							companyData.name,
							{
								businessdomain: companyData.businessdomain,
								address: companyData.address
							},
							`${body.projectId}_${companyId}_${researchRef.id}`
						);

						return {
							companyId,
							researchId: researchRef.id,
							success: true
						};
					} catch (error) {
						console.error(`Failed to start research for company ${companyId}:`, error);
						return {
							companyId,
							researchId: '',
							success: false,
							error: error instanceof Error ? error.message : 'Failed to start research'
						};
					}
				})
			);

			researchResults.push(...batchResults);
		}

		// Add any failed companies from initial validation
		const failedResults = await Promise.all(researchPromises);
		researchResults.push(...failedResults);

		// Calculate summary
		const successful = researchResults.filter(r => r.success).length;
		const failed = researchResults.filter(r => !r.success).length;

		return json({
			success: true,
			results: researchResults,
			summary: {
				total: researchResults.length,
				successful,
				failed
			}
		});
	} catch (error) {
		console.error('Research API error:', error);
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
 * Run research in background and update Firestore with progress
 * Note: In serverless environment, this may be interrupted if the function times out.
 * For production, consider using Vercel background functions or a job queue.
 */
async function runResearchInBackground(
	researchRef: FirebaseFirestore.DocumentReference,
	topic: string,
	companyName: string,
	companyContext: { businessdomain?: string; address?: string },
	threadId: string
): Promise<void> {
	try {
		console.log(`[Research] Starting background research for "${companyName}"`);

		const result = await streamDeepResearch({
			topic,
			companyName,
			companyContext,
			threadId,
			recursionLimit: 25,
			onProgress: async (content: string, isComplete: boolean) => {
				try {
					// Update Firestore with progress
					await researchRef.update({
						content,
						...(isComplete && { 
							status: 'completed',
							completedAt: FieldValue.serverTimestamp()
						})
					});
					console.log(`[Research] Updated progress for "${companyName}" (complete: ${isComplete})`);
				} catch (err) {
					console.error(`[Research] Failed to update progress for "${companyName}":`, err);
				}
			}
		});

		// Ensure final status is set
		await researchRef.update({
			content: result.content,
			status: 'completed',
			completedAt: FieldValue.serverTimestamp()
		});

		console.log(`[Research] Completed research for "${companyName}"`);
	} catch (error) {
		console.error(`[Research] Research failed for "${companyName}":`, error);
		
		// Update status to failed
		try {
			await researchRef.update({
				status: 'failed',
				error: error instanceof Error ? error.message : 'Research failed',
				completedAt: FieldValue.serverTimestamp()
			});
		} catch (updateErr) {
			console.error(`[Research] Failed to update error status for "${companyName}":`, updateErr);
		}
	}
}

/**
 * GET /api/v1/research?projectId=xxx&companyId=yyy
 * 
 * Get all research for a company
 */
export const GET: RequestHandler = async ({ url, locals }) => {
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
		// Verify project ownership
		const projectRef = adminDB.collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return json(
				{ success: false, error: 'Project not found' },
				{ status: 404 }
			);
		}

		const projectData = projectDoc.data();
		if (projectData?.userId !== locals.userID) {
			return json(
				{ success: false, error: 'Forbidden' },
				{ status: 403 }
			);
		}

		// Get research documents
		const researchSnapshot = await projectRef
			.collection('companies')
			.doc(companyId)
			.collection('research')
			.orderBy('createdAt', 'desc')
			.get();

		const researches = researchSnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		}));

		return json({
			success: true,
			data: researches
		});
	} catch (error) {
		console.error('Get research error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
