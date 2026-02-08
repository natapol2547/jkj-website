import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { tools, createDraftEmailTool } from '../tools/index';
import { getConnectedClient } from '../mongo';
import { createLLM } from '../llm';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { Company } from '../types/company';

const RESEARCH_SYSTEM_PROMPT_BASE = `You are an expert business researcher specializing in company analysis and market intelligence.

Your job is to conduct thorough research on companies and produce comprehensive, well-structured reports in Markdown format.

## Available Tools

### \`company_search\`
Use this to search for company information in our database. This is your primary source for Thai company data including business domain, registration details, and contact information.

### \`internet_search\`
Use this for general internet research to find:
- Recent news and press releases
- Market analysis and industry trends
- Competitor information
- Company websites and social media presence
- Financial reports and business updates

## Research Guidelines

1. **Start with our database**: Always begin by searching for the company in our database using \`company_search\`
2. **Expand with internet research**: Use \`internet_search\` to gather additional context, news, and market information
3. **Be thorough**: Make multiple searches with different queries to gather comprehensive information
4. **Cross-reference**: Verify information from multiple sources when possible
5. **Stay focused**: Keep the research relevant to the user's specified topic
6. **Cite your sources**: Always cite your sources in the format [source](url)

## Output Format

Structure your final report in Markdown with clear sections:
- Executive Summary
- Company Overview
- Key Findings (based on research topic)
- Analysis and Insights
- Sources and References

Respond in the same language as the user's request (Thai or English).
Use proper Markdown formatting including headers, bullet points, and links.

## Diagrams (Mermaid)

When helpful, include Mermaid diagrams in your report. Use fenced code blocks with \`\`\`mermaid. Useful diagram types:
- **Flowchart**: Process flows, decision trees, workflows
- **Sequence diagram**: Interactions between parties
- **Entity Relationship**: Company structure, partnerships
- **Mindmap**: Key themes, market segments
- **Graph (LR/TB)**: Organizational charts, market position

Example:
\`\`\`mermaid
flowchart LR
  A[Company] --> B[Market]
  B --> C[Opportunity]
\`\`\``;

const RESEARCH_SYSTEM_PROMPT_WITH_EMAIL = `

### \`draft_email\`
Use this to save a draft email for the company (e.g. cold outreach, partnership proposal, follow-up). Provide subject, body, and optionally the recipient email (to). The draft is stored and the user can send it via Gmail from the company page. Only call this when the research topic or user request involves drafting an email.`;

// Lazy checkpointer creation to handle serverless connection issues
let checkpointer: MongoDBSaver | null = null;

async function getCheckpointer(): Promise<MongoDBSaver> {
	const client = await getConnectedClient();
	if (!checkpointer) {
		checkpointer = new MongoDBSaver({ client: client as any, dbName: 'research_history' });
	}
	return checkpointer;
}

/**
 * Create the deep research agent
 * When projectId and companyId are provided, the agent gets the draft_email tool.
 */
async function createDeepResearchAgent(
	apiKey?: string,
	recursionLimit: number = 25,
	projectId?: string,
	companyId?: string
) {
	// Build tools: base tools + optional draft_email when context is provided
	const researchTools =
		projectId && companyId
			? [...tools, createDraftEmailTool(projectId, companyId)]
			: tools;
	const systemPrompt =
		projectId && companyId
			? RESEARCH_SYSTEM_PROMPT_BASE + RESEARCH_SYSTEM_PROMPT_WITH_EMAIL
			: RESEARCH_SYSTEM_PROMPT_BASE;

	// Use a capable model for research tasks
	const model = createLLM('google/gemini-2.5-flash:nitro', 8192, 0.3, apiKey);

	// Get the checkpointer (ensures MongoDB connection is established)
	const saver = await getCheckpointer();

	// Define the agent node with recursion limit awareness
	async function callModel(state: typeof MessagesAnnotation.State, config: any) {
		const currentStep = config?.metadata?.langgraph_step || 0;
		const remainingSteps = recursionLimit - currentStep;

		// If we're within 3 steps of the limit and the last message is a tool message,
		// force a final response by removing tools
		const shouldForceResponse =
			remainingSteps <= 3 &&
			state.messages.length > 0 &&
			state.messages[state.messages.length - 1].type === 'tool';

		// Add system message if this is the first call
		const messages =
			state.messages[0]?.type === 'system'
				? state.messages
				: [new SystemMessage(systemPrompt), ...state.messages];

		let response;

		if (shouldForceResponse) {
			// Call model without tools to force a final response
			console.log(
				`[DeepResearch] Approaching recursion limit (step ${currentStep}/${recursionLimit}), forcing final response`
			);
			response = await model.invoke(messages, config);
		} else {
			// Bind tools for normal operation
			const modelWithTools = model.bindTools(researchTools);
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

	// Create the tool node with the same tools
	const toolNode = new ToolNode(researchTools);

	// Build the graph
	const workflow = new StateGraph(MessagesAnnotation)
		.addNode('agent', callModel)
		.addNode('tools', toolNode)
		.addEdge(START, 'agent')
		.addConditionalEdges('agent', shouldContinue, ['tools', END])
		.addEdge('tools', 'agent');

	// Compile the graph with checkpointer
	const agent = workflow.compile({ checkpointer: saver });

	return agent;
}

export interface DeepResearchOptions {
	topic: string;
	companyName: string;
	companyContext?: Partial<Company>;
	threadId?: string;
	apiKey?: string;
	recursionLimit?: number;
	onProgress?: (content: string, isComplete: boolean) => Promise<void>;
	/** When provided with companyId, enables the draft_email tool for this research run */
	projectId?: string;
	companyId?: string;
}

/**
 * Build the research query from topic and company context
 */
function buildResearchQuery(topic: string, companyName: string, companyContext?: Partial<Company>): string {
	let contextInfo = '';
	
	if (companyContext) {
		const parts = [];
		if (companyContext.businessdomain) parts.push(`Business: ${companyContext.businessdomain}`);
		if (companyContext.address) parts.push(`Location: ${companyContext.address}`);
		if (companyContext.mission) parts.push(`Mission: ${companyContext.mission}`);
		
		if (parts.length > 0) {
			contextInfo = `\n\nKnown company information:\n${parts.join('\n')}`;
		}
	}
	
	return `Research Topic: ${topic}

Target Company: ${companyName}${contextInfo}

Please conduct thorough research on this company based on the specified topic. Use the available tools to gather information and produce a comprehensive report.`;
}

/**
 * Extract the final content from agent messages
 */
function extractFinalContent(messages: any[]): string {
	// Get all AI messages and combine their content
	const aiMessages = messages.filter(msg => msg._getType() === 'ai');
	
	if (aiMessages.length === 0) return '';
	
	// Get the last AI message (final response)
	const lastAIMessage = aiMessages[aiMessages.length - 1] as AIMessage;
	
	if (typeof lastAIMessage.content === 'string') {
		return lastAIMessage.content;
	}
	
	// Handle array content (when there are tool calls mixed in)
	if (Array.isArray(lastAIMessage.content)) {
		return lastAIMessage.content
			.filter((c: any) => c.type === 'text')
			.map((c: any) => c.text)
			.join('\n');
	}
	
	return '';
}

/**
 * Run the deep research agent and return the full result
 */
export async function runDeepResearch(options: DeepResearchOptions): Promise<{ content: string; messages: any[] }> {
	const {
		topic,
		companyName,
		companyContext,
		threadId = `research_${Date.now()}`,
		apiKey,
		recursionLimit = 25,
		projectId,
		companyId
	} = options;

	const agent = await createDeepResearchAgent(apiKey, recursionLimit, projectId, companyId);

	const config = {
		configurable: {
			thread_id: threadId
		},
		recursionLimit: recursionLimit
	};

	const query = buildResearchQuery(topic, companyName, companyContext);
	
	const input = {
		messages: [new HumanMessage(query)]
	};

	console.log(`[DeepResearch] Starting research for "${companyName}" with topic: "${topic}"`);

	// Run the agent and collect the response
	const result = await agent.invoke(input, config);
	
	const content = extractFinalContent(result.messages);

	console.log(`[DeepResearch] Completed research for "${companyName}"`);

	return {
		content,
		messages: result.messages
	};
}

/**
 * Stream the deep research agent with periodic progress callbacks
 */
export async function streamDeepResearch(options: DeepResearchOptions): Promise<{ content: string; messages: any[] }> {
	const {
		topic,
		companyName,
		companyContext,
		threadId = `research_${Date.now()}`,
		apiKey,
		recursionLimit = 25,
		onProgress,
		projectId,
		companyId
	} = options;

	console.log(`[DeepResearch] Creating agent for "${companyName}"...`);
	const agentStartTime = Date.now();

	const agent = await createDeepResearchAgent(apiKey, recursionLimit, projectId, companyId);
	console.log(`[DeepResearch] Agent created in ${Date.now() - agentStartTime}ms`);

	const config = {
		configurable: {
			thread_id: threadId
		},
		recursionLimit: recursionLimit
	};

	const query = buildResearchQuery(topic, companyName, companyContext);
	
	const input = {
		messages: [new HumanMessage(query)]
	};

	console.log(`[DeepResearch] Starting streaming research for "${companyName}" with topic: "${topic}"`);

	// Stream the agent response with timeout protection
	const streamStartTime = Date.now();
	console.log(`[DeepResearch] Initiating stream...`);
	
	const stream = await agent.stream(input, {
		...config,
		streamMode: 'values'
	});
	console.log(`[DeepResearch] Stream initiated in ${Date.now() - streamStartTime}ms`);

	let lastContent = '';
	let allMessages: any[] = [];
	let lastUpdateTime = Date.now();
	let chunkCount = 0;
	const UPDATE_INTERVAL = 5000; // 5 seconds
	const OVERALL_TIMEOUT = 180000; // 3 minutes max for entire research

	for await (const chunk of stream) {
		chunkCount++;
		
		// Check for overall timeout
		if (Date.now() - streamStartTime > OVERALL_TIMEOUT) {
			console.warn(`[DeepResearch] Research timeout after ${OVERALL_TIMEOUT}ms for "${companyName}"`);
			break;
		}
		
		if (chunk.messages) {
			allMessages = chunk.messages;
			console.log(`[DeepResearch] Chunk ${chunkCount}: ${allMessages.length} messages`);
			
			// Extract current content
			const currentContent = extractFinalContent(allMessages);
			
			// Check if content has changed and enough time has passed
			const now = Date.now();
			if (currentContent !== lastContent && (now - lastUpdateTime) >= UPDATE_INTERVAL) {
				lastContent = currentContent;
				lastUpdateTime = now;
				
				if (onProgress && currentContent) {
					try {
						await onProgress(currentContent, false);
					} catch (err) {
						console.warn(`[DeepResearch] Progress callback failed:`, err);
					}
				}
			}
		}
	}

	// Final content extraction
	const finalContent = extractFinalContent(allMessages);
	console.log(`[DeepResearch] Stream completed with ${chunkCount} chunks, content length: ${finalContent.length}`);
	
	// Send final update
	if (onProgress && finalContent) {
		try {
			await onProgress(finalContent, true);
		} catch (err) {
			console.warn(`[DeepResearch] Final progress callback failed:`, err);
		}
	}

	console.log(`[DeepResearch] Completed streaming research for "${companyName}" in ${Date.now() - streamStartTime}ms`);

	return {
		content: finalContent,
		messages: allMessages
	};
}

/**
 * Get research history for a thread
 */
export async function getResearchHistory(threadId: string) {
	const saver = await getCheckpointer();
	const state = await saver.get({ configurable: { thread_id: threadId } });
	return state?.channel_values?.messages || [];
}
