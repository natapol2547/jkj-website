import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import { streamDeepResearch } from '$lib/server/agents/deepResearch';
import type { ResearchRequest, ResearchResult, ResearchDocument } from '$lib/types/project';
import { FieldValue } from 'firebase-admin/firestore';

// Maximum concurrent research operations
const MAX_CONCURRENT = 3;

// Track active research promises to allow awaiting them before serverless freeze
const activeResearchPromises: Map<string, Promise<void>> = new Map();

/**
 * POST /api/v1/research
 * 
 * Start research on one or more companies in a project
 * Body: { projectId, companyIds[], topic, waitForCompletion?: boolean }
 * 
 * If waitForCompletion is true (default), waits for all research to complete
 * If false, returns immediately but research may not complete in serverless
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body: ResearchRequest & { waitForCompletion?: boolean } = await request.json();
		const waitForCompletion = body.waitForCompletion !== false; // Default to true

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
		const backgroundPromises: Promise<void>[] = [];

		// Process sequentially to avoid overwhelming resources in serverless
		for (const { id: companyId, data: companyData } of validCompanies) {
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

				const researchKey = `${body.projectId}_${companyId}_${researchRef.id}`;
				
				// Start research and track the promise
				const researchPromise = runResearchInBackground(
					researchRef,
					body.topic,
					companyData.name,
					{
						businessdomain: companyData.businessdomain,
						address: companyData.address
					},
					researchKey
				);
				
				activeResearchPromises.set(researchKey, researchPromise);
				backgroundPromises.push(researchPromise);

				researchResults.push({
					companyId,
					researchId: researchRef.id,
					success: true
				});
			} catch (error) {
				console.error(`Failed to start research for company ${companyId}:`, error);
				researchResults.push({
					companyId,
					researchId: '',
					success: false,
					error: error instanceof Error ? error.message : 'Failed to start research'
				});
			}
		}

		// Add any failed companies from initial validation
		const failedResults = await Promise.all(researchPromises);
		researchResults.push(...failedResults);

		// Wait for all research to complete if requested
		// This is critical for serverless - without awaiting, the process will freeze
		if (waitForCompletion && backgroundPromises.length > 0) {
			console.log(`[Research] Waiting for ${backgroundPromises.length} research tasks to complete...`);
			await Promise.allSettled(backgroundPromises);
			console.log(`[Research] All research tasks completed`);
		}

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
 * Helper to update Firestore with timeout protection
 */
async function updateWithTimeout(
	researchRef: FirebaseFirestore.DocumentReference,
	data: Record<string, any>,
	timeoutMs: number = 10000
): Promise<boolean> {
	try {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Firestore update timeout')), timeoutMs);
		});
		
		await Promise.race([
			researchRef.update(data),
			timeoutPromise
		]);
		return true;
	} catch (error) {
		console.error('[Research] Firestore update failed:', error);
		return false;
	}
}

/**
 * Run research and update Firestore with progress
 * Now properly awaited to work in serverless environments
 */
async function runResearchInBackground(
	researchRef: FirebaseFirestore.DocumentReference,
	topic: string,
	companyName: string,
	companyContext: { businessdomain?: string; address?: string },
	researchKey: string
): Promise<void> {
	let lastSuccessfulContent = '';
	const startTime = Date.now();
	
	try {
		console.log(`[Research] Starting research for "${companyName}" (key: ${researchKey})`);

		const result = await streamDeepResearch({
			topic,
			companyName,
			companyContext,
			threadId: researchKey,
			recursionLimit: 20, // Reduced to prevent timeout
			onProgress: async (content: string, isComplete: boolean) => {
				// Update Firestore with progress using timeout protection
				const updateData: Record<string, any> = { content };
				if (isComplete) {
					updateData.status = 'completed';
					updateData.completedAt = FieldValue.serverTimestamp();
				}
				
				const success = await updateWithTimeout(researchRef, updateData);
				if (success) {
					lastSuccessfulContent = content;
					console.log(`[Research] Updated progress for "${companyName}" (complete: ${isComplete})`);
				} else {
					console.warn(`[Research] Progress update skipped for "${companyName}" due to timeout`);
				}
			}
		});

		// Ensure final status is set with retry logic
		let retries = 3;
		while (retries > 0) {
			const success = await updateWithTimeout(researchRef, {
				content: result.content || lastSuccessfulContent,
				status: 'completed',
				completedAt: FieldValue.serverTimestamp()
			}, 15000);
			
			if (success) {
				const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
				console.log(`[Research] Completed research for "${companyName}" in ${elapsed}s`);
				return;
			}
			
			retries--;
			if (retries > 0) {
				console.log(`[Research] Retrying final update for "${companyName}" (${retries} retries left)`);
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}
		
		console.error(`[Research] Failed to save final result for "${companyName}" after all retries`);
	} catch (error) {
		console.error(`[Research] Research failed for "${companyName}":`, error);
		
		// Update status to failed with timeout protection
		await updateWithTimeout(researchRef, {
			status: 'failed',
			content: lastSuccessfulContent || '',
			error: error instanceof Error ? error.message : 'Research failed',
			completedAt: FieldValue.serverTimestamp()
		}, 10000);
	} finally {
		// Clean up tracking
		activeResearchPromises.delete(researchKey);
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
