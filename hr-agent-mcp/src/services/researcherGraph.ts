import { StateGraph, END, START } from "@langchain/langgraph";
import { scrapeUrl } from "../tools/browser";
import Groq from 'groq-sdk';

// 1. Define the State
export interface ResearchState {
    applicationId: string;
    linksToVisit: { type: string; url: string }[];
    jobRequirements: string;
    currentIndex: number;
    results: {
        url: string;
        type: string;
        summary: string;
        status: "valid" | "dead" | "irrelevant";
    }[];
    currentScrape?: any;
}

const graphState = {
    applicationId: {
        value: (x: string, y: string) => y ? y : x,
        default: () => ""
    },
    linksToVisit: {
        value: (x: any[], y: any[]) => y ? y : x,
        default: () => []
    },
    jobRequirements: {
        value: (x: string, y: string) => y ? y : x,
        default: () => ""
    },
    currentIndex: {
        value: (x: number, y: number) => y !== undefined ? y : x,
        default: () => 0
    },
    results: {
        value: (x: any[], y: any[]) => x.concat(y),
        default: () => []
    },
    currentScrape: {
        value: (x: any, y: any) => y ? y : x,
        default: () => null
    }
};

// Node: Browser (Visits the URL or Uses API)
async function browserNode(state: ResearchState) {
    const link = state.linksToVisit[state.currentIndex];
    console.log(`[Agent 2] Researching ${link.type} link: ${link.url}`);

    let pageData: any = {
        url: link.url,
        title: "",
        content: "",
        description: ""
    };

    try {
        if (link.url.includes("linkedin.com")) {
            // Case 1: LinkedIn (Skip Scraping)
            console.log("Skipping LinkedIn scraping (Anti-bot protection)...");
            pageData.title = "LinkedIn Profile";
            // Minimal content to indicate presence
            pageData.content = `LINKEDIN PROFILE DETECTED: ${link.url}`;
            pageData.manual_summary = `LinkedIn Profile identified at ${link.url}. Content not scraped to respect anti-bot measures.`;
            pageData.skip_analysis = true;
        } else {
            // Case 2: Proper Website (Portfolio, Blog, GitHub) - Puppeteer
            // User requested Puppeteer for GitHub too.
            console.log("Using Puppeteer for site...");
            pageData = await scrapeUrl(link.url);
        }
    } catch (e: any) {
        pageData.error = e.message;
    }

    return {
        currentScrape: pageData
    };
}

// Node: Analyst (Uses Groq to summarize)
async function analystNode(state: any) {
    const pageData = state.currentScrape;
    const link = state.linksToVisit[state.currentIndex];
    const requirements = state.jobRequirements;

    // Handle Errors
    if (pageData.error) {
        return {
            results: [{
                url: link.url,
                type: link.type,
                summary: `Failed to access: ${pageData.error}`,
                status: "dead"
            }],
            currentIndex: state.currentIndex + 1
        };
    }

    // Handle Explicit Skip (e.g. LinkedIn)
    if (pageData.skip_analysis && pageData.manual_summary) {
        return {
            results: [{
                url: link.url,
                type: link.type,
                summary: pageData.manual_summary,
                status: "valid"
            }],
            currentIndex: state.currentIndex + 1
        };
    }

    // Custom instructions based on link type
    let specificTask = "Summarize the key findings in 3-5 sentences, specifically highlighting relevance to the job requirements.";
    if (link.url.includes("github.com")) {
        specificTask = "Write a natural language paragraph summarizing the GitHub profile. Mention the user's bio, primary programming languages, and a general overview of their pinned or top repositories. Avoid technical lists or JSON formatting in the summary text.";
    }

    // Prompt for Agent 2 Analysis
    const prompt = `
    You are a background check researcher. Analyze the content of this webpage related to a job candidate.

    URL: ${link.url}
    Link Type: ${link.type} (e.g., GitHub, Portfolio)
    Page Title: ${pageData.title}
    Page Content Summary: 
    ${pageData.content.substring(0, 3000)}

    Task:
    1. Verify if this is a valid profile/project.
    2. ${specificTask}
    3. Do NOT assign a score.

    Format: JSON
    {
        "status": "valid|dead|irrelevant",
        "summary": "<Natural language paragraph text>"
    }
    `;

    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const response = await groq.chat.completions.create({
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0
        });

        let data;
        try {
            const content = response.choices[0].message.content || "{}";
            data = JSON.parse(content);
        } catch {
            data = { status: "valid", summary: "Content extracted but AI summarization failed." };
        }

        return {
            results: [{
                url: link.url,
                type: link.type,
                summary: (typeof data.summary === 'object') ? JSON.stringify(data.summary) : data.summary,
                status: data.status
            }],
            currentIndex: state.currentIndex + 1
        };

    } catch (e: any) {
        return {
            results: [{
                url: link.url,
                type: link.type,
                summary: "AI Analysis Failed",
                status: "valid"
            }],
            currentIndex: state.currentIndex + 1
        };
    }
}

// 3. Build Graph
const workflow = new StateGraph({
    channels: graphState
} as any)
    .addNode("browser", browserNode)
    .addNode("analyst", analystNode)

    .addConditionalEdges(
        START,
        (state: ResearchState) => {
            if (state.currentIndex >= state.linksToVisit.length) {
                return "end";
            }
            return "continue";
        },
        {
            end: END,
            continue: "browser"
        }
    )
    .addEdge("browser", "analyst")
    .addConditionalEdges(
        "analyst",
        (state: ResearchState) => {
            if (state.currentIndex >= state.linksToVisit.length) {
                return "end";
            }
            return "continue";
        },
        {
            end: END,
            continue: "browser"
        }
    );

export const researcherGraph = workflow.compile();
