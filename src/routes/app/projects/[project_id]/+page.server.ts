import type { PageServerLoad } from './$types';
import { getProjectChatHistory } from '$lib/server/agents/projectAnalysisAgent';
import { convertLangChainToUIMessages } from '$lib/server/utils/messageConverter';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { project_id } = params;

	if (!locals.userID) {
		return {
			projectId: project_id,
			initialChatMessages: []
		};
	}

	try {
		// Load existing project chat history from MongoDB
		const threadId = `project_${project_id}`;
		const langchainMessages = await getProjectChatHistory(threadId);

		if (!langchainMessages || langchainMessages.length === 0) {
			return {
				projectId: project_id,
				initialChatMessages: []
			};
		}

		const uiMessages = convertLangChainToUIMessages(langchainMessages);

		return {
			projectId: project_id,
			initialChatMessages: uiMessages
		};
	} catch (error) {
		console.error(`[ProjectChat] Failed to load history for project ${project_id}:`, error);
		return {
			projectId: project_id,
			initialChatMessages: []
		};
	}
};
