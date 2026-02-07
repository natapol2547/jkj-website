import type { UIMessage } from 'ai';

/**
 * Convert LangChain messages (from MongoDBSaver checkpoint) to Vercel AI SDK UIMessage format.
 * 
 * LangChain message types:
 * - HumanMessage: user messages
 * - AIMessage: assistant messages (may contain tool_calls)
 * - ToolMessage: tool execution results
 * - SystemMessage: system prompts (skipped)
 * 
 * UIMessage format:
 * - role: 'user' | 'assistant'
 * - parts: Array of { type: 'text', text } | { type: 'dynamic-tool', ... }
 */

export interface LangChainMessage {
	type?: string;
	content: string | Array<{ type: string; text?: string; [key: string]: any }>;
	tool_calls?: Array<{
		id: string;
		name: string;
		args: Record<string, any>;
	}>;
	tool_call_id?: string;
	name?: string;
	id?: string[];
	_getType?: () => string;
}

function getMessageType(msg: LangChainMessage): string {
	if (msg._getType) {
		return msg._getType();
	}
	if (msg.type) {
		return msg.type;
	}
	return 'unknown';
}

function extractTextContent(content: string | Array<{ type: string; text?: string }>): string {
	if (typeof content === 'string') {
		return content;
	}
	if (Array.isArray(content)) {
		return content
			.filter((c) => c.type === 'text' && c.text)
			.map((c) => c.text!)
			.join('\n');
	}
	return '';
}

function generateId(): string {
	// Use crypto.randomUUID if available, otherwise fallback
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert an array of LangChain messages to Vercel AI SDK UIMessage[] format.
 * 
 * This handles the mapping between:
 * - HumanMessage -> user message with text parts
 * - AIMessage -> assistant message with text parts and optional tool call parts
 * - ToolMessage -> merged into the preceding assistant message as dynamic-tool parts
 * - SystemMessage -> skipped (not shown in UI)
 */
export function convertLangChainToUIMessages(langchainMessages: LangChainMessage[]): UIMessage[] {
	const uiMessages: UIMessage[] = [];
	let currentAssistantMessage: UIMessage | null = null;

	// Map to track tool calls by their ID for matching with ToolMessages
	const pendingToolCalls = new Map<string, { name: string; args: Record<string, any>; messageIndex: number }>();

	/**
	 * Check if the current assistant message has any meaningful text content.
	 * Used to determine whether to merge a follow-up AIMessage into the current one.
	 */
	function currentMessageHasText(): boolean {
		if (!currentAssistantMessage) return false;
		return currentAssistantMessage.parts.some(
			(p) => p.type === 'text' && (p as any).text?.trim()
		);
	}

	for (const msg of langchainMessages) {
		const msgType = getMessageType(msg);

		if (msgType === 'system') {
			// Skip system messages - they're not shown in UI
			continue;
		}

		if (msgType === 'human') {
			// Finalize any pending assistant message
			if (currentAssistantMessage) {
				uiMessages.push(currentAssistantMessage);
				currentAssistantMessage = null;
				pendingToolCalls.clear();
			}

			const text = extractTextContent(msg.content);
			if (text) {
				uiMessages.push({
					id: generateId(),
					role: 'user',
					parts: [{ type: 'text', text }],
					createdAt: new Date()
				} as UIMessage);
			}
		} else if (msgType === 'ai') {
			const text = extractTextContent(msg.content);
			const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;

			// Merge with current assistant message when it only has tool parts (no text).
			// This handles the LangChain sequence: AIMessage(tools) -> ToolMessage -> AIMessage(text)
			// which should produce a single UIMessage with [step-start, dynamic-tool(output), text].
			const shouldMerge = currentAssistantMessage && !currentMessageHasText();

			if (!shouldMerge) {
				// Finalize current message and start a new one
				if (currentAssistantMessage) {
					uiMessages.push(currentAssistantMessage);
					pendingToolCalls.clear();
				}

				currentAssistantMessage = {
					id: generateId(),
					role: 'assistant',
					parts: [{ type: 'step-start' } as any],
					createdAt: new Date()
				} as UIMessage;
			}

			// Add tool call parts (as dynamic-tool with state 'call')
			if (hasToolCalls) {
				for (const toolCall of msg.tool_calls!) {
					const toolPart = {
						type: 'dynamic-tool' as const,
						toolName: toolCall.name,
						toolCallId: toolCall.id,
						args: toolCall.args,
						state: 'call' as const
					};
					currentAssistantMessage!.parts.push(toolPart as any);
					pendingToolCalls.set(toolCall.id, {
						name: toolCall.name,
						args: toolCall.args,
						messageIndex: currentAssistantMessage!.parts.length - 1
					});
				}
			}

			// Add text content if present
			if (text) {
				currentAssistantMessage!.parts.push({ type: 'text' as const, text });
			}
		} else if (msgType === 'tool') {
			// Tool results - merge into the current assistant message
			if (currentAssistantMessage && msg.tool_call_id) {
				const toolCallInfo = pendingToolCalls.get(msg.tool_call_id);
				if (toolCallInfo) {
					// Replace the 'call' state tool part with 'output-available'
					const toolOutput = extractTextContent(msg.content);
					const updatedPart = {
						type: 'dynamic-tool' as const,
						toolName: toolCallInfo.name,
						toolCallId: msg.tool_call_id,
						args: toolCallInfo.args,
						state: 'output-available' as const,
						output: toolOutput
					};
					currentAssistantMessage.parts[toolCallInfo.messageIndex] = updatedPart as any;
					pendingToolCalls.delete(msg.tool_call_id);
				}
			}
		}
	}

	// Finalize any remaining assistant message
	if (currentAssistantMessage) {
		uiMessages.push(currentAssistantMessage);
	}

	return uiMessages;
}
