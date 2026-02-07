import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import { streamProjectAnalysis } from '$lib/server/agents/projectAnalysisAgent';
import { createUIMessageStreamResponse, type UIMessage } from 'ai';
import { toUIMessageStream } from '@ai-sdk/langchain';

/**
 * Build research context string from all completed research in a project
 */
async function buildResearchContext(projectId: string): Promise<string> {
	const projectRef = adminDB.collection('projects').doc(projectId);
	const companiesSnapshot = await projectRef.collection('companies').get();

	if (companiesSnapshot.empty) {
		return '';
	}

	const contextParts: string[] = [];

	for (const companyDoc of companiesSnapshot.docs) {
		const companyData = companyDoc.data();
		const companyName = companyData.name || companyDoc.id;

		// Get all completed research for this company
		const researchSnapshot = await companyDoc.ref
			.collection('research')
			.where('status', '==', 'completed')
			.orderBy('createdAt', 'desc')
			.get();

		if (researchSnapshot.empty) continue;

		contextParts.push(`\n## Company: ${companyName}`);
		contextParts.push(`Business Domain: ${companyData.businessdomain || 'N/A'}`);
		contextParts.push(`Address: ${companyData.address || 'N/A'}`);

		for (const researchDoc of researchSnapshot.docs) {
			const research = researchDoc.data();
			contextParts.push(`\n### Research: ${research.topic}`);
			contextParts.push(`Status: ${research.status}`);
			if (research.content) {
				// Truncate very long research to avoid exceeding context limits
				const content = research.content.length > 5000
					? research.content.substring(0, 5000) + '\n... [truncated]'
					: research.content;
				contextParts.push(content);
			}
		}

		contextParts.push('---');
	}

	return contextParts.join('\n');
}

/**
 * POST /api/v1/project-chat
 * 
 * Chat with the project analysis agent.
 * 
 * Request body:
 * - messages: UIMessage[] (required)
 * - projectId: string (required)
 * - threadId: string (required) - Thread ID for persistence (typically `project_{projectId}`)
 * 
 * Response:
 * - Streamed UI message response
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.userID) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { messages, projectId, threadId }: { messages: UIMessage[]; projectId: string; threadId: string } = body;

		if (!projectId) {
			return json({ success: false, error: 'Project ID is required' }, { status: 400 });
		}

		if (!messages || messages.length === 0) {
			return json({ success: false, error: 'Messages are required' }, { status: 400 });
		}

		// Verify project ownership
		const projectRef = adminDB.collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return json({ success: false, error: 'Project not found' }, { status: 404 });
		}

		const projectData = projectDoc.data();
		if (projectData?.userId !== locals.userID) {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		// Extract the last user message
		const lastMessage = messages[messages.length - 1];
		const query = lastMessage.parts[0]?.type === 'text' ? lastMessage.parts[0]?.text : '';

		if (!query) {
			return json({ success: false, error: 'No query text found' }, { status: 400 });
		}

		// Build research context from all completed research in the project
		const researchContext = await buildResearchContext(projectId);

		// Use provided threadId or generate one
		const conversationThreadId = threadId || `project_${projectId}`;

		// Stream the analysis agent response
		const agentStream = await streamProjectAnalysis({
			query,
			researchContext,
			threadId: conversationThreadId
		});

		return createUIMessageStreamResponse({
			stream: toUIMessageStream(agentStream),
		});
	} catch (error) {
		console.error('Project chat API error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
