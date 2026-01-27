import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { runSearchAgent, streamSearchAgent } from '$lib/server/agents/searchAgent';
import type { AIMessage } from '@langchain/core/messages';
import { createUIMessageStreamResponse, type UIMessage } from 'ai';
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';

/**
 * POST /api/v1/search
 * 
 * Search for Thai companies using the AI-powered search agent.
 * 
 * Request body:
 * - query: string (required) - The search query
 * - threadId: string (optional) - Conversation thread ID for context
 * - stream: boolean (optional) - Whether to stream the response
 * 
 * Response:
 * - success: boolean
 * - response: string - The AI agent's response
 * - messages: array - Full conversation messages
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	// if (!locals.userID) {
	// 	return json({ error: 'Unauthorized' }, { status: 401 });
	// }

	try {
		const body = await request.json();

		const { messages, threadId }: { messages: UIMessage[], threadId: string } = body;

            const lastMessage = messages[messages.length - 1];
        const query = lastMessage.parts[0]?.type === 'text' ? lastMessage.parts[0]?.text : '';

		// Generate a unique thread ID if not provided (use user ID for persistence)
		const conversationThreadId = threadId || `user_${locals.userID}_${Date.now()}`;

        // Test stream
        const agentStream = await streamSearchAgent({
            query,
            threadId: conversationThreadId
        });

        return createUIMessageStreamResponse({
            stream: toUIMessageStream(agentStream),
        });
	} catch (error) {
		console.error('Search API error:', error);
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
 * GET /api/v1/search
 * 
 * Simple search endpoint for testing (requires authentication)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// if (!locals.userID) {
	// 	return json({ error: 'Unauthorized' }, { status: 401 });
	// }

	const query = url.searchParams.get('q');

	if (!query) {
		return json(
			{ error: 'Missing query parameter "q"' },
			{ status: 400 }
		);
	}

	try {
		const result = await runSearchAgent({
			query,
			threadId: `user_${1}_get`
		});

		const messages = result.messages || [];
		const lastAIMessage = messages
			.slice()
			.reverse()
			.find((msg: { _getType: () => string }) => msg._getType() === 'ai') as AIMessage | undefined;

		return json({
			success: true,
			query,
			response: lastAIMessage?.content || 'No response generated'
		});
	} catch (error) {
		console.error('Search API error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
