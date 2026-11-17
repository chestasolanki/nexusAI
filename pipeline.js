import { fileURLToPath } from "url";
import {
    build_reader_agent,
    build_search_agent,
    writer_chain,
    critic_chain
} from "./agents.js";

// Agent messages can be a string or an array of content blocks
const toText = (c) => {
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
        return c.map((b) => (typeof b === "string" ? b : b?.text || "")).join("");
    }
    return JSON.stringify(c ?? "");
};

// onProgress(step, status, payload) -> used by server.js to stream updates to the UI
export const run_researchPipeline = async (topic, onProgress = () => {}) => {

    const state = {};

    // STEP 1: Search Agent
    console.log("\nSTEP 1 - Search agent is working...");
    onProgress(1, "running");

    const search_agent = await build_search_agent();
    const search_result = await search_agent.invoke({
        messages: [
            {
                role: "user",
                content: `Find recent, reliable and detailed information about: ${topic}`
            }
        ]
    });

    state.search_results = toText(search_result.messages.at(-1)?.content);
    onProgress(1, "done", state.search_results);


    // STEP 2: Reader Agent
    console.log("\nSTEP 2 - Reader agent is scraping top resources...");
    onProgress(2, "running");

    const reader_agent = await build_reader_agent();
    const reader_result = await reader_agent.invoke({
        messages: [
            {
                role: "user",
                content: `Based on the following search results about '${topic}', 
                pick the most relevant URL and scrape it for deeper content.

                Search Results:
                ${state.search_results.slice(0, 800)}`
            }
        ]
    });

    state.scraped_content = toText(reader_result.messages.at(-1)?.content).slice(0, 5000);
    onProgress(2, "done", state.scraped_content);


    // STEP 3: Writer Chain
    console.log("\nSTEP 3 - Writer is drafting the report...");
    onProgress(3, "running");

    const research_combined = `
        SEARCH RESULTS:
        ${state.search_results}

        DETAILED SCRAPED CONTENT:
        ${state.scraped_content}
    `;

    state.report = toText(await writer_chain.invoke({
        topic,
        research: research_combined
    }));
    onProgress(3, "done", state.report);


    // STEP 4: Critic Chain
    console.log("\nSTEP 4 - Critic is reviewing the report...");
    onProgress(4, "running");

    state.feedback = toText(await critic_chain.invoke({ report: state.report }));
    onProgress(4, "done", state.feedback);

    return state;
};


// CLI mode still works: node pipeline.js "your topic"
// (only runs when this file is executed directly, not when imported by server.js)
const main = async () => {
    const topic = process.argv.slice(2).join(" ").trim();

    if (!topic) {
        console.log("Please provide a research topic.");
        console.log('Example: node pipeline.js "Agentic AI developments"');
        return;
    }

    try {
        const result = await run_researchPipeline(topic);
        console.log("\nFinal Report:\n", result.report);
        console.log("\nCritic Report:\n", result.feedback);
    } catch (error) {
        console.error("\nPipeline failed:", error.message);
    }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();