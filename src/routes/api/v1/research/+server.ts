import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import { streamDeepResearch } from '$lib/server/agents/deepResearch';
import type { ResearchRequest, ResearchResult, ResearchDocument } from '$lib/types/project';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/v1/research
 * 
 * Start research on one or more companies in a project using SSE streaming.
 * Body: { projectId, companyIds[], topic }
 * 
 * Returns a Server-Sent Events stream with progress updates.
 * This keeps the connection alive and prevents Vercel function timeout.
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

		// Filter valid companies
		const validCompanies: { id: string; data: any }[] = [];
		const invalidCompanyIds: string[] = [];

		for (let i = 0; i < companyDocs.length; i++) {
			const doc = companyDocs[i];
			const companyId = body.companyIds[i];

			if (!doc.exists) {
				invalidCompanyIds.push(companyId);
				continue;
			}

			validCompanies.push({ id: companyId, data: doc.data() });
		}

		// Create SSE stream
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				
				// Helper to send SSE event
				const sendEvent = (event: string, data: any) => {
					const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(message));
				};

				// Send initial status
				sendEvent('init', {
					totalCompanies: validCompanies.length,
					invalidCompanies: invalidCompanyIds,
					topic: body.topic
				});

				// Process each company sequentially
				for (let i = 0; i < validCompanies.length; i++) {
					const { id: companyId, data: companyData } = validCompanies[i];
					
					try {
						// Create research document
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

						sendEvent('research_started', {
							companyId,
							companyName: companyData.name,
							researchId: researchRef.id,
							index: i + 1,
							total: validCompanies.length
						});

						// Run research with progress updates
						const result = await streamDeepResearch({
							topic: body.topic,
							companyName: companyData.name,
							companyContext: {
								businessdomain: companyData.businessdomain,
								address: companyData.address
							},
							threadId: `${body.projectId}_${companyId}_${researchRef.id}`,
							recursionLimit: 15, // Reduced to ensure completion
							onProgress: async (content: string, isComplete: boolean) => {
								// Send progress to client
								sendEvent('progress', {
									companyId,
									companyName: companyData.name,
									contentLength: content.length,
									isComplete
								});

								// Update Firestore
								try {
									await researchRef.update({
										content,
										...(isComplete && {
											status: 'completed',
											completedAt: FieldValue.serverTimestamp()
										})
									});
								} catch (err) {
									console.warn(`[Research] Firestore update failed:`, err);
								}
							}
						});

						// Ensure final status is saved
						await researchRef.update({
							content: result.content,
							status: 'completed',
							completedAt: FieldValue.serverTimestamp()
						});

						sendEvent('research_completed', {
							companyId,
							companyName: companyData.name,
							researchId: researchRef.id,
							contentLength: result.content.length
						});

					} catch (error) {
						console.error(`[Research] Failed for ${companyData.name}:`, error);
						
						sendEvent('research_failed', {
							companyId,
							companyName: companyData.name,
							error: error instanceof Error ? error.message : 'Research failed'
						});
					}

					// Small delay between companies to prevent rate limiting
					if (i < validCompanies.length - 1) {
						await new Promise(resolve => setTimeout(resolve, 500));
					}
				}

				// Send completion event
				sendEvent('done', {
					message: 'All research completed',
					processedCount: validCompanies.length
				});

				controller.close();
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive'
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
