import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import connectDB from "../config/db";
import { fetchResume } from "../tools/fetchResume";
import { parseResume } from "../tools/parseResume";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

import { startMetricsServer } from "../metrics";
import { preloadModel } from "../services/modelLoader";

// --- Configuration ---
const PORT = process.env.PROCESSOR_PORT || 3001;
const METRICS_PORT = parseInt(process.env.PROCESSOR_METRICS_PORT || '9091');
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
    name: "hr-processor-mcp",
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

// Tool 2: Trigger Full Processing (For Worker & Admin)
server.tool(
    "process_application",
    {
        applicationId: z.string().describe("The ID of the application to process (Parse + Extract)"),
    },
    async ({ applicationId }) => {
        try {
            await connectDB();
            const { processApplication } = await import('../services/processor');
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
        if (toolName === "process_application") {
            const { processApplication } = await import('../services/processor');
            await processApplication(toolArgs.applicationId);
            result = { content: [{ type: "text", text: `Processed ${toolArgs.applicationId}` }] };
        }
        else if (toolName === "get_candidate_resume") {
            const { resumeBuffer } = await fetchResume(toolArgs.applicationId);
            const text = await parseResume(resumeBuffer);
            result = { content: [{ type: "text", text: text }] };
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

    if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === '::ffff:127.0.0.1') {
        return next();
    }

    const clientKey = req.headers['x-api-key'] || req.headers['authorization'];
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
// This allows the server to trigger itself when new DB entries arrive.
async function startEmbeddedWorker() {
    console.log("[Worker] Starting embedded MongoDB watcher...");

    // Ensure DB is connected (it should be by now, but safe to call again)
    await connectDB();
    const Application = (await import('../models/Application')).default;

    const changeStream = Application.watch([
        { $match: { operationType: 'insert' } }
    ]);

    changeStream.on('change', async (change) => {
        if (change.operationType === 'insert') {
            const docId = change.documentKey._id;
            console.log(`\n[Worker] New Application Detected: ${docId}`);

            try {
                // Call Logic Directly (Fastest) or via Loopback (Cleanest)
                // We choose Direct Logic for performance and simplicity in a merged service.
                console.log(`[Worker] Triggering process_application for ${docId}`);
                const { processApplication } = await import('../services/processor');
                await processApplication(docId.toString());
            } catch (err) {
                console.error(`[Worker] Failed to process application ${docId}:`, err);
            }
        }
    });

    console.log("[Worker] Watching 'applications' collection for new inserts...");
}

app.listen(PORT, () => {
    console.log(`HR Processor MCP Server running on port ${PORT}`);
    console.log(`SSE URL: http://localhost:${PORT}/sse`);

    // Start the embedded worker
    startEmbeddedWorker().catch(err => console.error("[Worker] Failed to start:", err));
});
