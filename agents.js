import { createAgent } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

import { webSearch, scrapeUrl } from "./tools.js";
import "dotenv/config";

// LLM initialization
const llm = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    apiKey: process.env.GEMINI_API_KEY,
    maxTokens: 1500
});

// 1st Agent: Search Agent
const build_search_agent = async () => {
    return await createAgent({
        model: llm,
        tools: [webSearch]
    });
};

// 2nd Agent: Reader Agent
const build_reader_agent = async () => {
    return await createAgent({
        model: llm,
        tools: [scrapeUrl]
    });
};

// 3rd: Writer Chain
const writer_prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an expert research writer. Write clear, structured and insightful reports."],
    ["human", `Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional.`]
]);

const writer_chain = writer_prompt
    .pipe(llm)
    .pipe(new StringOutputParser());

// 4th: Critic Chain
const critic_prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a sharp and constructive research critic. Be honest and specific."],
    ["human", `Review the research report below and evaluate it strictly.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas to Improve:
- ...
- ...

One line verdict:
...`]
]);

const critic_chain = critic_prompt
    .pipe(llm)
    .pipe(new StringOutputParser());

export {
    build_search_agent,
    build_reader_agent,
    writer_chain,
    critic_chain
};
