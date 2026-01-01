
import express from 'express';
import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Default metrics (CPU, Memory, etc.)
client.collectDefaultMetrics({ register });

// --- Custom Metrics ---

// 1. LLM Token Usage (Counter)
// Labels: type (input/output), model (llama3.2), agent (processor/researcher)
export const llmTokens = new client.Counter({
    name: 'llm_tokens_total',
    help: 'Total number of LLM tokens processed',
    labelNames: ['type', 'model', 'agent'],
    registers: [register]
});

// 2. Job Duration (Histogram)
// Labels: agent, status (success/failure)
export const jobDuration = new client.Histogram({
    name: 'agent_job_duration_seconds',
    help: 'Time taken to process a job',
    labelNames: ['agent', 'status'],
    buckets: [10, 30, 60, 120, 300, 600], // Buckets in seconds
    registers: [register]
});

// 3. Job Counter
export const jobCount = new client.Counter({
    name: 'agent_jobs_total',
    help: 'Total jobs processed',
    labelNames: ['agent', 'status'],
    registers: [register]
});

// --- Server Helper ---
export function startMetricsServer(port: number = 9090) {
    const app = express();

    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (ex) {
            res.status(500).end(ex);
        }
    });

    app.listen(port, () => {
        console.log(`[Prometheus] Metrics server listening on port ${port}`);
    });
}
