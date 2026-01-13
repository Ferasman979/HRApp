import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import connectDB from "./config/db";
import { fetchResume } from "./tools/fetchResume";
import { parseResume } from "./tools/parseResume";
import { researcherGraph } from "./services/researcherGraph";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.MCP_API_KEY;

if (!API_KEY) {
    console.warn("WARNING: MCP_API_KEY is not set. The server is unprotected!");
}

// --- MCP Server Definition ---
const server = new McpServer({
    name: "hr-agent-mcp",
    version: "1.0.0",
});

// Tool 1: Read-Only Get Resume (For Chat)
server.tool(
    "get_candidate_resume",
    {
        applicationId: z.string().describe("The ID of the application to fetch resume for"),
    },
    async ({ applicationId }) => {
        try {
            await connectDB();
            const { resumeBuffer } = await fetchResume(applicationId);
            const text = await parseResume(resumeBuffer);
            return {
                content: [{ type: "text", text: text }],
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            }
        }
    }
);

// Tool 2: Research Candidate Links (Legacy Direct)
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

// Tool 3: Trigger Full Processing (For Worker & Admin)
server.tool(
    "process_application",
    {
        applicationId: z.string().describe("The ID of the application to process (Parse + Extract)"),
    },
    async ({ applicationId }) => {
        try {
            await connectDB();
            const { processApplication } = await import('./services/processor');
            await processApplication(applicationId);
            return {
                content: [{ type: "text", text: `Application ${applicationId} processed successfully.` }],
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error processing application: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Tool 4: Trigger Research (For Worker & Admin)
server.tool(
    "perform_research",
    {
        applicationId: z.string().describe("The ID of the application to research"),
    },
    async ({ applicationId }) => {
        try {
            await connectDB();
            const { performResearch } = await import('./services/researchService');
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

// --- HTTP Bypass (RPC) ---
// MOVED HERE TO FIX REFERENCE ERROR
app.use(express.json()); // Ensure JSON parsing is enabled

app.post("/rpc", async (req, res) => {
    const { method, params } = req.body;
    console.log(`[RPC] Received request: ${method}`, params);

    if (method !== "tools/call") {
        res.status(400).json({ error: "Only tools/call is supported via RPC bypass" });
        return;
    }


    try {
        await connectDB(); // Ensure DB is connected for RPC bypass

        const toolName = params.name;
        const toolArgs = params.arguments;

        let result = null;
        if (toolName === "process_application") {
            const { processApplication } = await import('./services/processor');
            await processApplication(toolArgs.applicationId);
            result = { content: [{ type: "text", text: `Processed ${toolArgs.applicationId}` }] };
        }
        else if (toolName === "perform_research") {
            const { performResearch } = await import('./services/researchService');
            result = await performResearch(toolArgs.applicationId);
        }
        else {
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

    // BYPASS AUTH FOR LOCALHOST DEBUGGING
    const clientIp = req.socket.remoteAddress;
    console.log(`[Auth] Check Client IP: ${clientIp}`);

    if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === '::ffff:127.0.0.1') {
        console.log(`[Auth] Bypassing auth for localhost.`);
        return next();
    }

    const clientKey = req.headers['x-api-key'] || req.headers['authorization'];
    console.log(`[Auth] Checking Key: ${clientKey ? 'Present' : 'Missing'}`);

    const isValid = clientKey === API_KEY || clientKey === `Bearer ${API_KEY}`;

    if (!isValid) {
        console.error(`[Auth] Invalid Key. Rejecting.`);
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
    console.log(`[SSE] Created session: ${sessionId}`);

    // Debug: Log active sessions
    console.log(`[SSE] Active sessions before: ${transports.size}`);

    const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
    transports.set(sessionId, transport);

    req.on("close", () => {
        console.log(`[SSE] Connection closed for session: ${sessionId}`);
        transports.delete(sessionId);
        console.log(`[SSE] Active sessions after close: ${transports.size}`);
    });

    await server.connect(transport);
});

app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    console.log(`[POST] Received message for session: ${sessionId}`);

    const transport = transports.get(sessionId);

    if (!transport) {
        console.warn(`[POST] Session ${sessionId} NOT FOUND. Active sessions: ${[...transports.keys()].join(', ')}`);
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

app.listen(PORT, () => {
    console.log(`HR Agent MCP Server running on port ${PORT}`);
    console.log(`SSE URL: http://localhost:${PORT}/sse`);
    if (API_KEY) console.log("Protected by API Key");
});
