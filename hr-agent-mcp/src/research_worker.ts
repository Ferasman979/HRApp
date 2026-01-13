import './tracing'; // Must be first
import connectDB from './config/db';
import Application from './models/Application';
import { McpWorkerClient } from './services/mcpClient';
import dotenv from 'dotenv';
import { startMetricsServer } from './metrics';


// Start Metrics Server
startMetricsServer(parseInt(process.env.METRICS_PORT || '9090'));

const RESEARCHER_URL = process.env.RESEARCHER_MCP_URL || 'http://localhost:3002/sse';
const mcpClient = new McpWorkerClient(RESEARCHER_URL, process.env.MCP_API_KEY);

async function startResearchWorker() {
    await connectDB();
    console.log(`Starting Research Worker (Agent 2) [MCP CLIENT MODE] connecting to ${RESEARCHER_URL}...`);
    console.log("Polling for applications with researchStatus: 'pending'...");

    // Polling loop
    while (true) {
        let logEntry: any = null;
        try {
            const app = await Application.findOne({ researchStatus: 'pending' });

            if (app) {
                console.log(`\n[Research Worker] Picked up Application ID: ${app._id}`);

                try {
                    console.log(`[Research Worker] Calling MCP Tool: perform_research for ${app._id}`);
                    await mcpClient.callTool("perform_research", { applicationId: app._id.toString() });
                } catch (err) {
                    console.error(`[Research Worker] Failed to research application ${app._id}:`, err);
                }

                // Wait a bit before next poll to avoid hammering if there are many
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error: any) {
            console.error("[Research Worker] Error:", error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

startResearchWorker();
