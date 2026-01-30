import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import { streamDeepResearch } from '$lib/server/agents/deepResearch';
import type { ResearchRequest, ResearchResult, ResearchDocument } from '$lib/types/project';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Run research for a single company and update Firestore
 */
async function runResearchForCompany(
	researchRef: FirebaseFirestore.DocumentReference,
	topic: string,
	companyName: string,
	companyContext: { businessdomain?: string; address?: string },
	threadId: string
): Promise<void> {
	const startTime = Date.now();
	let lastContent = '';

	try {
		console.log(`[Research] Starting research for "${companyName}"`);

		const result = await streamDeepResearch({
			topic,
			companyName,
			companyContext,
			threadId,
			recursionLimit: 15,
			onProgress: async (content: string, isComplete: boolean) => {
				lastContent = content;
				try {
					await researchRef.update({
						content,
						...(isComplete && {
							status: 'completed',
							completedAt: FieldValue.serverTimestamp()
						})
					});
				} catch (err) {
					console.warn(`[Research] Progress update failed for "${companyName}":`, err);
				}
			}
		});

		// Ensure final status is saved
		await researchRef.update({
			content: result.content || lastContent,
			status: 'completed',
			completedAt: FieldValue.serverTimestamp()
		});

		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`[Research] Completed research for "${companyName}" in ${elapsed}s`);

	} catch (error) {
		console.error(`[Research] Failed for "${companyName}":`, error);

		// Update status to failed
		try {
			await researchRef.update({
				content: lastContent,
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
 * POST /api/v1/research
 * 
 * Start research on one or more companies in a project.
 * Body: { projectId, companyIds[], topic }
 * 
 * Uses Vercel's waitUntil to run research in background after response is sent.
 * Returns immediately with research IDs.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
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
		console.log('body.projectId', body.projectId);
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

		// Create research documents and collect results
		const researchResults: ResearchResult[] = [];
		const backgroundTasks: Promise<void>[] = [];

		for (let i = 0; i < companyDocs.length; i++) {
			const doc = companyDocs[i];
			const companyId = body.companyIds[i];

			if (!doc.exists) {
				researchResults.push({
					companyId,
					researchId: '',
					success: false,
					error: 'Company not found in project'
				});
				continue;
			}

			const companyData = doc.data()!;

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

				// Queue background task for research
				const researchTask = runResearchForCompany(
					researchRef,
					body.topic,
					companyData.name,
					{
						businessdomain: companyData.businessdomain,
						address: companyData.address
					},
					`${body.projectId}_${companyId}_${researchRef.id}`
				);

				backgroundTasks.push(researchTask);

				researchResults.push({
					companyId,
					researchId: researchRef.id,
					success: true
				});

			} catch (error) {
				console.error(`Failed to create research for company ${companyId}:`, error);
				researchResults.push({
					companyId,
					researchId: '',
					success: false,
					error: error instanceof Error ? error.message : 'Failed to start research'
				});
			}
		}

		// Use Vercel's waitUntil to run research in background
		// This keeps the function alive after the response is sent
		if (backgroundTasks.length > 0) {
			const allResearch = Promise.all(backgroundTasks).then(() => {
				console.log(`[Research] All ${backgroundTasks.length} research tasks completed`);
			}).catch((err) => {
				console.error('[Research] Background research failed:', err);
			});

			// Use platform.context.waitUntil for Vercel adapter
			// Type assertion needed because SvelteKit's Platform type may not include Vercel's context
			const vercelPlatform = platform as { context?: { waitUntil?: (promise: Promise<unknown>) => void } } | undefined;
			
			if (vercelPlatform?.context?.waitUntil) {
				console.log('[Research] Using Vercel waitUntil for background processing');
				vercelPlatform.context.waitUntil(allResearch);
			} else {
				// Fallback: log warning but don't block
				console.warn('[Research] waitUntil not available - research may not complete in serverless');
				// Still run in background, but may be terminated
				allResearch.catch(console.error);
			}
		}

		// Calculate summary
		const successful = researchResults.filter(r => r.success).length;
		const failed = researchResults.filter(r => !r.success).length;

		// Return immediately - research continues in background via waitUntil
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
