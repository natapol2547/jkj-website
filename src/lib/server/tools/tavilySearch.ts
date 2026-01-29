import { TavilySearch } from "@langchain/tavily";
import { TAVILY_API_KEY } from '$env/static/private';

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

export { internet_search_tool };