import { ChatOpenAI } from "@langchain/openai";
import { OPENROUTER_API_KEY } from '$env/static/private';

export function createLLM(modelName: string, maxTokens: number, temperature: number, apiKey?: string) {
    return new ChatOpenAI({
        modelName: modelName,
        configuration: {
            baseURL: 'https://openrouter.ai/api/v1'
        },
        apiKey: apiKey || OPENROUTER_API_KEY,
        temperature: temperature,
            maxTokens: maxTokens
    });
}