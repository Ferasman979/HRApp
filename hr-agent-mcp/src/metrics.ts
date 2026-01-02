
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

// 4. DB Application Count (Gauge)
export const dbAppCount = new client.Gauge({
    name: 'db_applications_total',
    help: 'Number of applications in MongoDB by status',
    labelNames: ['status'],
    registers: [register]
});

// --- Server Helper ---
import Application from './models/Application';

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

        // Start Polling DB Metrics (every 30s)
        setInterval(async () => {
            try {
                // 1. Real DB Stats
                const stats = await Application.aggregate([
                    { $group: { _id: "$processingStatus", count: { $sum: 1 } } }
                ]);

                // Reset gauge before setting to ensure we don't keep stale tags (basic approach)
                register.getSingleMetric('db_applications_total')?.reset();

                stats.forEach((s: any) => {
                    const status = s._id || 'unknown';
                    dbAppCount.set({ status }, s.count);
                });

                // 2. Dummy Simulation (Fake Activity for Demo)
                simulateAgentActivity();

            } catch (e) {
                console.error("[Metrics] Failed to poll DB stats:", e);
            }
        }, 15000); // Increased frequency for demo purposes (15s)
    });
}

function simulateAgentActivity() {
    // A. Simulate Token Usage
    // Random input/output tokens for 'processor' and 'researcher'
    const agents = ['processor', 'researcher'];
    const models = ['llama-3.3-70b', 'llama-3.1-8b'];

    agents.forEach(agent => {
        // Input tokens
        llmTokens.inc({ type: 'input', model: models[0], agent }, Math.floor(Math.random() * 500));
        // Output tokens
        llmTokens.inc({ type: 'output', model: models[0], agent }, Math.floor(Math.random() * 200));
    });

    // B. Simulate Job Completions & Duration
    if (Math.random() > 0.3) { // 70% chance to record a "job"
        const agent = agents[Math.floor(Math.random() * agents.length)];
        const status = Math.random() > 0.9 ? 'failure' : 'success'; // 10% failure rate
        const duration = Math.random() * 60 + 5; // 5s to 65s

        jobCount.inc({ agent, status });
        jobDuration.observe({ agent, status }, duration);
    }
}
