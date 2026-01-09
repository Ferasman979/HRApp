import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import connectDB from "./config/db";
import { fetchResume } from "./tools/fetchResume";
import { parseResume } from "./tools/parseResume";
import { researcherGraph } from "./services/researcherGraph";
import { v4 as uuidv4 } from "uuid"; // Use built-in crypto in Node 20 or install uuid if needed, but for simplicity I'll use crypto
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

// Tool 1: Fetch and Parse Resume
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

// Tool 2: Research Candidate Links
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

// --- Express App & Transports ---
const app = express();
app.use(cors());

// Auth Middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!API_KEY) return next(); // Skip if no key configured (dev mode)

    const clientKey = req.headers['x-api-key'] || req.headers['authorization'];

    // Simple check: Allow "Bearer <key>" or just "<key>"
    const isValid = clientKey === API_KEY || clientKey === `Bearer ${API_KEY}`;

    if (!isValid) {
        res.status(401).send("Unauthorized: Invalid API Key");
        return;
    }
    next();
};

app.use(authMiddleware);

// Store active transports
const transports = new Map<string, SSEServerTransport>();

// SSE Endpoint
app.get("/sse", async (req, res) => {
    console.log("New SSE connection...");
    const sessionId = crypto.randomUUID();

    // The MCP Client will post messages to this URL
    const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
    transports.set(sessionId, transport);

    // Clean up on close
    req.on("close", () => {
        console.log(`SSE connection closed: ${sessionId}`);
        transports.delete(sessionId);
    });

    await server.connect(transport);
});

// Message Endpoint
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

app.listen(PORT, () => {
    console.log(`HR Agent MCP Server running on port ${PORT}`);
    console.log(`SSE URL: http://localhost:${PORT}/sse`);
    if (API_KEY) console.log("Protected by API Key");
});
