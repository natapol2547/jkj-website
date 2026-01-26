import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from "langchain";
import { MemorySaver } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { companySearchTool } from '../tools/companySearchTool';
import { OPENROUTER_API_KEY } from '$env/static/private';

// Memory checkpointer for conversation history
const checkpointer = new MemorySaver();

// System prompt for the search agent
const SYSTEM_PROMPT = `You are Julist AI, an intelligent assistant specialized in helping users find and research Thai companies.

Your capabilities:
- Search for companies by name, industry, location, or business description
- Find companies similar to a concept or business idea
- Filter results by operating status, entity type, location, or business domain
- Provide detailed company information including contact details

When searching:
1. Use the company_search tool to find relevant companies
2. Analyze the results and present them clearly to the user
3. Highlight key information like company name, location, industry, and contact details
4. If the search returns no results, suggest alternative search terms or filters

Always be helpful, accurate, and provide actionable information about Thai businesses.
Respond in the same language as the user's query (Thai or English).`;

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
		streamMode: 'values'
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
