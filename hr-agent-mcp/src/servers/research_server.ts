import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import connectDB from "../config/db";
import { researcherGraph } from "../services/researcherGraph";
import crypto from "crypto";
import { HumanMessage } from "@langchain/core/messages";


import { startMetricsServer } from "../metrics";
import { preloadModel } from "../services/modelLoader";

// --- Configuration ---
const PORT = process.env.RESEARCHER_PORT || 3002;
const METRICS_PORT = parseInt(process.env.RESEARCHER_METRICS_PORT || '9092');
const API_KEY = process.env.MCP_API_KEY;

if (!API_KEY) {
    console.warn("WARNING: MCP_API_KEY is not set. The server is unprotected!");
}

// Start Metrics Server
startMetricsServer(METRICS_PORT);

// Preload Embedding Model
preloadModel().catch(err => console.error("Failed to preload model:", err));


// --- MCP Server Definition ---
const server = new McpServer({
    name: "hr-researcher-mcp",
    version: "1.0.0",
});

// Tool 1: Research Candidate Links (Direct/Legacy)
server.tool(
    "research_candidate_links",
    {
        links: z.array(z.string()).describe("List of URLs to research (GitHub, Portfolio, etc.)"),
        jobRequirements: z.string().describe("The job requirements to check against"),
    },
    async ({ links, jobRequirements }) => {
        try {
            await connectDB();

            const linksToVisit = links.map(url => {
                let type = "portfolio";
                if (url.includes("github")) type = "github";
                if (url.includes("linkedin")) type = "linkedin";
                return { type, url };
            });

            const initialState = {
                applicationId: "manual-mcp-request",
                linksToVisit: linksToVisit,
                jobRequirements: jobRequirements,
                currentIndex: 0,
                results: []
            };

            const resultState: any = await researcherGraph.invoke(initialState);

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(resultState.results, null, 2)
                }]
            };

        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            }
        }
    }
);

// Tool 2: Trigger Research (For Worker & Admin)
server.tool(
    "perform_research",
    {
        applicationId: z.string().describe("The ID of the application to research"),
    },
    async ({ applicationId }) => {
        try {
            await connectDB();
            const { performResearch } = await import('../services/researchService');
            const result = await performResearch(applicationId);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error performing research: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// --- Express App & Transports ---
const app = express();
app.use(cors());
app.use(express.json());

// --- HTTP Bypass (RPC) ---
app.post("/rpc", async (req, res) => {
    const { method, params } = req.body;
    console.log(`[RPC] Received request: ${method}`, params);

    if (method !== "tools/call") {
        res.status(400).json({ error: "Only tools/call is supported via RPC bypass" });
        return;
    }

    try {
        await connectDB();

        const toolName = params.name;
        const toolArgs = params.arguments;

        let result = null;
        if (toolName === "perform_research") {
            const { performResearch } = await import('../services/researchService');
            result = await performResearch(toolArgs.applicationId);
        }
        else {
            // For research_candidate_links we need to reimplement the logic or extract it to a service
            // Simplification: We only support perform_research in RPC currently as that is what the worker uses
            if (toolName === 'research_candidate_links') {
                throw new Error("research_candidate_links not yet supported in RPC bypass");
            }
            throw new Error(`Tool ${toolName} not found in RPC bypass`);
        }

        res.json({ result });
    } catch (error: any) {
        console.error("[RPC] Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Auth Middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!API_KEY) return next();

    const clientIp = req.socket.remoteAddress;

    if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === '::ffff:127.0.0.1') {
        return next();
    }

    const clientKey = req.headers['x-api-key'] || req.headers['authorization'];
    const isValid = clientKey === API_KEY || clientKey === `Bearer ${API_KEY}`;

    if (!isValid) {
        res.status(401).send("Unauthorized: Invalid API Key");
        return;
    }
    next();
};

app.use(authMiddleware);

const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (req, res) => {
    console.log("New SSE connection request...");
    const sessionId = crypto.randomUUID();
    const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
    transports.set(sessionId, transport);

    req.on("close", () => {
        transports.delete(sessionId);
    });

    await server.connect(transport);
});

app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (!transport) {
        res.status(404).send("Session not found");
        return;
    }

    try {
        await transport.handlePostMessage(req, res);
    } catch (error) {
        console.error("Error handling message:", error);
        res.status(500).send("Internal Server Error");
    }
});

// --- Worker Logic (Embedded) ---
async function startEmbeddedWorker() {
    console.log("[Worker] Starting embedded Research Poller...");
    await connectDB();
    const Application = (await import('../models/Application')).default;

    console.log("Polling for applications with researchStatus: 'pending'...");

    // Polling loop (non-blocking via setInterval/loop with sleep)
    // We use a loop with await to prevent overlapping calls if processing is slow
    const poll = async () => {
        while (true) {
            try {
                const app = await Application.findOne({ researchStatus: 'pending' });

                if (app) {
                    console.log(`\n[Research Worker] Picked up Application ID: ${app._id}`);

                    try {
                        console.log(`[Research Worker] Triggering perform_research for ${app._id}`);
                        const { performResearch } = await import('../services/researchService');
                        await performResearch(app._id.toString());
                    } catch (err: any) {
                        console.error(`[Research Worker] Failed to research application ${app._id}:`, err);
                    }

                    // Small delay after success
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    // Longer delay if empty
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (error: any) {
                console.error("[Research Worker] Error:", error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    };

    poll().catch(err => console.error("[Worker] Polling loop crashed:", err));
}


app.listen(PORT, () => {
    console.log(`HR Researcher MCP Server running on port ${PORT}`);
    console.log(`SSE URL: http://localhost:${PORT}/sse`);

    // Start embedded worker
    startEmbeddedWorker().catch(err => console.error("[Worker] Failed to start:", err));
});
