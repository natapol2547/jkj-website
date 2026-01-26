import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { runSearchAgent, streamSearchAgent } from '$lib/server/agents/searchAgent';
import type { AIMessage } from '@langchain/core/messages';

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

		// Validate request
		if (!body.query || typeof body.query !== 'string') {
			return json(
				{ error: 'Missing or invalid query parameter' },
				{ status: 400 }
			);
		}

		const { query, threadId, stream = false } = body;

		// Generate a unique thread ID if not provided (use user ID for persistence)
		const conversationThreadId = threadId || `user_${locals.userID}_${Date.now()}`;

		if (stream) {
			// Streaming response
			const agentStream = await streamSearchAgent({
				query,
				threadId: conversationThreadId
			});

			// Convert to readable stream for SSE
			const encoder = new TextEncoder();
			const readable = new ReadableStream({
				async start(controller) {
					try {
						for await (const chunk of agentStream) {
							const messages = chunk.messages;
							if (messages && messages.length > 0) {
								const lastMessage = messages[messages.length - 1];
								if (lastMessage && 'content' in lastMessage) {
									const data = JSON.stringify({
										type: 'message',
										content: lastMessage.content,
										role: lastMessage._getType()
									});
									controller.enqueue(encoder.encode(`data: ${data}\n\n`));
								}
							}
						}
						controller.enqueue(encoder.encode('data: [DONE]\n\n'));
						controller.close();
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : 'Stream error';
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
						);
						controller.close();
					}
				}
			});

			return new Response(readable, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive'
				}
			});
		} else {
			// Non-streaming response
			const result = await runSearchAgent({
				query,
				threadId: conversationThreadId
			});

			// Extract the final AI response
			const messages = result.messages || [];
			const lastAIMessage = messages
				.slice()
				.reverse()
				.find((msg: { _getType: () => string }) => msg._getType() === 'ai') as AIMessage | undefined;

			const response = lastAIMessage?.content || 'No response generated';

			return json({
				success: true,
				threadId: conversationThreadId,
				response: typeof response === 'string' ? response : JSON.stringify(response),
				messageCount: messages.length
			});
		}
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
