import { tool } from "@langchain/core/tools";
import { tavily } from "@tavily/core";
import axios from "axios";
import * as cheerio from "cheerio";
import "dotenv/config";

// Initialize Tavily
const tavilyClient = tavily({
    apiKey: process.env.TAVILY_API_KEY
});

// TOOL 1: WEB SEARCH

export const webSearch = tool(
    async ({ query }) => {
        const results = await tavilyClient.search(query, {
            maxResults: 5
        });

        const output = [];

        for (const r of results.results) {
            output.push(
                `Title: ${r.title}\n` +
                `URL: ${r.url}\n` +
                `Snippet: ${r.content.slice(0, 300)}\n`
            );
        }

        return output.join("\n----\n");
    },
    {
        name: "web_search",
        description:
            "Search the web for recent and reliable information. Returns titles, URLs and snippets.",
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query"
                }
            },
            required: ["query"]
        }
    }
);


// TOOL 2: SCRAPE URL

export const scrapeUrl = tool(
    async ({ url }) => {
        try {
            const response = await axios.get(url, {
                timeout: 8000,
                headers: { 
                    "User-Agent": "Mozilla/5.0"
                }
            });

            const $ = cheerio.load(response.data);
 
            $("script, style, nav, footer").remove();

            const text = $("body")
                .text()
                .replace(/\s+/g, " ")
                .trim();

            return text.slice(0, 3000);

        } catch (error) {
            return `Could not scrape URL: ${error.message}`;
        }
    },
    {
        name: "scrape_url",
        description:
            "Scrape and return clean text content from a given URL.",
        schema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "Website URL to scrape"
                }
            },
            required: ["url"]
        }
    }
);
