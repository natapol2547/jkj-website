import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from "langchain";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { MessagesAnnotation } from '@langchain/langgraph';
import { companySearchTool } from '../tools/companySearchTool';
import { OPENROUTER_API_KEY } from '$env/static/private';
import { client } from '../mongo';

// System prompt for the search agent
const SYSTEM_PROMPT = `You are Julist AI, a Thai company search assistant.

Use company_search tool to find companies. Put main intent in query, only add filters when user explicitly asks.

Filter values:
- operating_status: "ยังดำเนินกิจการอยู่" (active), "เลิก" (closed), "ล้มละลาย" (bankrupt)
- type_of_entity: "บริษัทจำกัด", "บริษัทมหาชนจำกัด", "ห้างหุ้นส่วนจำกัด"
- location: Thai province name (e.g., "กรุงเทพมหานคร", "เชียงใหม่")

Respond in user's language (Thai/English). Use Markdown.`;

// Memory checkpointer for conversation history
const checkpointer = new MongoDBSaver({ client: client as any, dbName: 'conversation_history' });

/**
 * Create the search agent with the company search tool
 */
function createSearchAgent(apiKey?: string) {
	// Use OpenRouter as the LLM provider (OpenAI-compatible API)
	const model = new ChatOpenAI({
		modelName: 'openai/gpt-oss-120b:nitro',
		configuration: {
			baseURL: 'https://openrouter.ai/api/v1'
		},
		apiKey: apiKey || OPENROUTER_API_KEY,
		temperature: 0.7,
		maxTokens: 4096
	});

	// Create the React agent with tools
	const agent = createAgent({
		model: model,
		tools: [companySearchTool],
		checkpointer: checkpointer,
		systemPrompt: SYSTEM_PROMPT,
	});

	return agent;
}

export interface SearchAgentOptions {
	query: string;
	threadId?: string;
	apiKey?: string;
}

/**
 * Run the search agent with a query
 */
export async function runSearchAgent(options: SearchAgentOptions) {
	const { query, threadId = 'default', apiKey } = options;

	const agent = createSearchAgent(apiKey);

	const config = {
		configurable: {
			thread_id: threadId
		},
		recursionLimit: 10,
        onAgentAction: (action: any) => {
            console.log(action);
        }
	};

	const input = {
		messages: [new HumanMessage(query)]
	};

	// Run the agent and collect the response
	const result = await agent.invoke(input, config);

	return result;
}

/**
 * Stream the search agent response
 */
export async function streamSearchAgent(options: SearchAgentOptions) {
	const { query, threadId = 'default', apiKey } = options;

	const agent = createSearchAgent(apiKey);

	const config = {
		configurable: {
			thread_id: threadId
		},
		recursionLimit: 10
	};

	const input = {
		messages: [new HumanMessage(query)]
	};

	// Stream the agent response
	const stream = await agent.stream(input, {
		...config,
		streamMode: ['values', 'messages']
	});

	return stream;
}

/**
 * Get conversation history for a thread
 */
export async function getConversationHistory(threadId: string) {
	const state = await checkpointer.get({ configurable: { thread_id: threadId } });
	return state?.channel_values?.messages || [];
}
