import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import EventSource from "eventsource";
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Polyfill EventSource for Node.js
// @ts-ignore
global.EventSource = EventSource;

export class McpWorkerClient {
    private connected: boolean = false;
    private serverUrl: string;
    private apiKey: string | undefined;

    constructor(serverUrl: string, apiKey?: string) {
        this.serverUrl = serverUrl;
        this.apiKey = apiKey;
    }

    async connect() {
        // No-op: HTTP is stateless, no connection needed
        this.connected = true;
        console.log(`[MCP Client] Ready (HTTP Mode) for ${this.serverUrl}`);
    }

    async callTool(toolName: string, args: any) {
        // FALLBACK: Bypass SSE and hit the server directly via HTTP
        const url = `${this.serverUrl.replace('/sse', '')}/rpc`;

        console.log(`[MCP Client] Calling tool via HTTP: ${toolName} at ${url}`);
        try {
            const response = await axios.post(url, {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: toolName,
                    arguments: args
                },
                id: Date.now()
            }, {
                headers: this.apiKey ? { "X-API-KEY": this.apiKey } : {}
            });

            return response.data;
        } catch (error: any) {
            console.error(`[MCP Client] HTTP Tool call failed: ${toolName}`, error.message);
            if (error.response) {
                console.error("Server Response:", error.response.data);
            }
            throw error;
        }
    }
}

