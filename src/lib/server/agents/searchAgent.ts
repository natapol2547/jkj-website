import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { tools } from '../tools/index';
import { client } from '../mongo';
import { createLLM } from '../llm';
import { ToolNode } from "@langchain/langgraph/prebuilt";

// System prompt for the search agent
const SYSTEM_PROMPT = `You are Julist AI, a AI search assistant. You can use tools to find relevant information and give it in a concise and informative way according to user's request.

You can choose to use tools to find information that is relevant to the user's request.
Use 'company_search' tool (recommended) to find information about companies.
Use 'internet_search' tool to find general information.

Respond in user's language (Thai/English). Use Markdown. Every link should be in "[link text](link url)" format. Relative links are allowed.`;

// Memory checkpointer for conversation history
const checkpointer = new MongoDBSaver({ client: client as any, dbName: 'conversation_history' });

/**
 * Create the search agent with the company search tool
 */
function createSearchAgent(apiKey?: string, recursionLimit: number = 10) {
	// Use OpenRouter as the LLM provider (OpenAI-compatible API)
	const model = createLLM('openai/gpt-oss-120b:nitro', 4096, 0.5, apiKey);

	// Define the agent node with recursion limit awareness
	async function callModel(state: typeof MessagesAnnotation.State, config: any) {
		const currentStep = config?.metadata?.langgraph_step || 0;
		const remainingSteps = recursionLimit - currentStep;
		
		// If we're within 2 steps of the limit and the last message is a tool message,
		// force a final response by removing tools
		const shouldForceResponse = remainingSteps <= 2 && 
			state.messages.length > 0 && 
			state.messages[state.messages.length - 1].type === 'tool';
		
		// Add system message if this is the first call
		const messages = state.messages[0].type === 'system' 
			? state.messages 
			: [new SystemMessage(SYSTEM_PROMPT), ...state.messages];
		
		let response;
		
		if (shouldForceResponse) {
			// Call model without tools to force a final response
			console.log(`Approaching recursion limit (step ${currentStep}/${recursionLimit}), forcing final response without tools`);
			response = await model.invoke(messages, config);
		} else {
			// Bind tools for normal operation
			const modelWithTools = model.bindTools(tools);
			response = await modelWithTools.invoke(messages, config);
		}
		
		return { messages: [response] };
	}

	// Define the function that determines whether to continue or end
	function shouldContinue(state: typeof MessagesAnnotation.State) {
		const lastMessage = state.messages[state.messages.length - 1];
		
		// If the last message has tool calls, continue to the tools node
		if (lastMessage._getType() === 'ai' && (lastMessage as AIMessage).tool_calls?.length) {
			return 'tools';
		}
		
		// Otherwise, end the agent execution
		return END;
	}

	// Create the tool node
	const toolNode = new ToolNode(tools);

	// Build the graph
	const workflow = new StateGraph(MessagesAnnotation)
		.addNode('agent', callModel)
		.addNode('tools', toolNode)
		.addEdge(START, 'agent')
		.addConditionalEdges('agent', shouldContinue, ['tools', END])
		.addEdge('tools', 'agent');

	// Compile the graph with checkpointer
	const agent = workflow.compile({ checkpointer });

	return agent;
}

export interface SearchAgentOptions {
	query: string;
	threadId?: string;
	apiKey?: string;
	recursionLimit?: number;
}

/**
 * Run the search agent with a query
 */
export async function runSearchAgent(options: SearchAgentOptions) {
	const { query, threadId = 'default', apiKey, recursionLimit = 10 } = options;

	const agent = createSearchAgent(apiKey, recursionLimit);

	const config = {
		configurable: {
			thread_id: threadId
		},
		recursionLimit: recursionLimit
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
	const { query, threadId = 'default', apiKey, recursionLimit = 10 } = options;

	const agent = createSearchAgent(apiKey, recursionLimit);

	const config = {
		configurable: {
			thread_id: threadId
		},
		recursionLimit: recursionLimit
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
