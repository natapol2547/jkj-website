import { TavilySearch } from "@langchain/tavily";
import dotenv from 'dotenv';
dotenv.config();

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

console.log(TAVILY_API_KEY);

const internet_search_tool = new TavilySearch({
    name: "internet_search",
    maxResults: 5,
    topic: "general",
    country: "thailand",
    tavilyApiKey: TAVILY_API_KEY,
    // includeAnswer: false,
    // includeRawContent: false,
    // includeImages: false,
    // includeImageDescriptions: false,
    // searchDepth: "basic",
    // timeRange: "day",
    // includeDomains: [],
    // excludeDomains: [],
});

const result = await internet_search_tool.invoke({
    query: "What is the capital of Thailand?"
});

console.log(result);