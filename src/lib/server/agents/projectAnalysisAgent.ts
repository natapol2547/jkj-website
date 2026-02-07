import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { tools } from '../tools/index';
import { getConnectedClient } from '../mongo';
import { createLLM } from '../llm';
import { ToolNode } from "@langchain/langgraph/prebuilt";

/**
 * Build the system prompt for the project analysis agent.
 * Injects all completed research data as context.
 */
function buildSystemPrompt(researchContext: string): string {
	return `You are a project analysis agent specializing in company research analysis and business intelligence.

You have access to research data on companies in a project. Your job is to analyze, compare, and provide insights based on the research done on these companies.

## Your Capabilities
- Analyze and summarize research across multiple companies
- Compare companies based on their research data
- Identify trends, opportunities, and risks
- Provide actionable insights and recommendations
- Answer questions about specific companies or the project as a whole

## Available Tools
- \`company_search\`: Search for additional company information in our database
- \`internet_search\`: Search the internet for current information, news, and market data

## Research Data
Below is the research data available for companies in this project:

${researchContext || 'No research data available yet. You can still help the user by using the available tools to gather information.'}

## Guidelines
1. Base your analysis primarily on the provided research data
2. Use tools to supplement with additional information when needed
3. Be specific and cite which company/research you're referring to
4. Provide structured, actionable insights
5. Respond in the user's language (Thai or English)
6. Use Markdown formatting for clear, readable responses`;
}

// Lazy checkpointer creation
let checkpointer: MongoDBSaver | null = null;

async function getCheckpointer(): Promise<MongoDBSaver> {
	const client = await getConnectedClient();
	if (!checkpointer) {
		checkpointer = new MongoDBSaver({ client: client as any, dbName: 'project_chat_history' });
	}
	return checkpointer;
}

/**
 * Create the project analysis agent
 */
async function createProjectAnalysisAgent(
	researchContext: string,
	apiKey?: string,
	recursionLimit: number = 15
) {
	const model = createLLM('google/gemini-2.0-flash-001', 8192, 0.3, apiKey);
	const saver = await getCheckpointer();

	const systemPrompt = buildSystemPrompt(researchContext);

	async function callModel(state: typeof MessagesAnnotation.State, config: any) {
		const currentStep = config?.metadata?.langgraph_step || 0;
		const remainingSteps = recursionLimit - currentStep;

		const shouldForceResponse = remainingSteps <= 2 &&
			state.messages.length > 0 &&
			state.messages[state.messages.length - 1].type === 'tool';

		// Add system message if this is the first call
		const messages = state.messages[0]?.type === 'system'
			? state.messages
			: [new SystemMessage(systemPrompt), ...state.messages];

		let response;

		if (shouldForceResponse) {
			console.log(`[ProjectAnalysis] Approaching recursion limit (step ${currentStep}/${recursionLimit}), forcing final response`);
			response = await model.invoke(messages, config);
		} else {
			const modelWithTools = model.bindTools(tools);
			response = await modelWithTools.invoke(messages, config);
		}

		return { messages: [response] };
	}

	function shouldContinue(state: typeof MessagesAnnotation.State) {
		const lastMessage = state.messages[state.messages.length - 1];

		if (lastMessage._getType() === 'ai' && (lastMessage as AIMessage).tool_calls?.length) {
			return 'tools';
		}

		return END;
	}

	const toolNode = new ToolNode(tools);

	const workflow = new StateGraph(MessagesAnnotation)
		.addNode('agent', callModel)
		.addNode('tools', toolNode)
		.addEdge(START, 'agent')
		.addConditionalEdges('agent', shouldContinue, ['tools', END])
		.addEdge('tools', 'agent');

	const agent = workflow.compile({ checkpointer: saver });

	return agent;
}

export interface ProjectAnalysisOptions {
	query: string;
	researchContext: string;
	threadId: string;
	apiKey?: string;
	recursionLimit?: number;
}

/**
 * Stream the project analysis agent response
 */
export async function streamProjectAnalysis(options: ProjectAnalysisOptions) {
	const {
		query,
		researchContext,
		threadId,
		apiKey,
		recursionLimit = 15
	} = options;

	const agent = await createProjectAnalysisAgent(researchContext, apiKey, recursionLimit);

	const config = {
		configurable: {
			thread_id: threadId
		},
		recursionLimit: recursionLimit
	};

	const input = {
		messages: [new HumanMessage(query)]
	};

	const stream = await agent.stream(input, {
		...config,
		streamMode: ['values', 'messages']
	});

	return stream;
}

/**
 * Get project chat history for a thread
 */
export async function getProjectChatHistory(threadId: string) {
	const saver = await getCheckpointer();
	const state = await saver.get({ configurable: { thread_id: threadId } });
	return state?.channel_values?.messages || [];
}
