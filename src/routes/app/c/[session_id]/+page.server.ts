import type { PageServerLoad } from './$types';
import { getConversationHistory } from '$lib/server/agents/searchAgent';
import { convertLangChainToUIMessages } from '$lib/server/utils/messageConverter';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { session_id } = params;

	// Don't load messages if user is not authenticated
	if (!locals.userID) {
		return {
			sessionId: session_id,
			initialMessages: []
		};
	}

	try {
		// Load conversation history from MongoDB checkpoint
		const langchainMessages = await getConversationHistory(session_id);

		if (!langchainMessages || langchainMessages.length === 0) {
			return {
				sessionId: session_id,
				initialMessages: []
			};
		}

		// Convert LangChain messages to UIMessage format
		const uiMessages = convertLangChainToUIMessages(langchainMessages);

		return {
			sessionId: session_id,
			initialMessages: uiMessages
		};
	} catch (error) {
		console.error(`[ChatSession] Failed to load history for session ${session_id}:`, error);
		return {
			sessionId: session_id,
			initialMessages: []
		};
	}
};
