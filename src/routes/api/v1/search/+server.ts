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
 * - messages: UIMessage[] (required) - The conversation messages
 * - threadId: string (required) - Conversation thread ID (session ID) for persistence
 * 
 * Response:
 * - Streamed UI message response
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.userID) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();

		const { messages, threadId }: { messages: UIMessage[], threadId: string } = body;

		const lastMessage = messages[messages.length - 1];
		const query = lastMessage.parts[0]?.type === 'text' ? lastMessage.parts[0]?.text : '';

		if (!query) {
			return json(
				{ success: false, error: 'No query text found in the last message' },
				{ status: 400 }
			);
		}

		// Use the provided threadId (session ID) or generate one as fallback
		const conversationThreadId = threadId || `user_${locals.userID}_${Date.now()}`;

		// Stream the search agent response
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
	if (!locals.userID) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

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
			threadId: `user_${locals.userID}_get`
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
