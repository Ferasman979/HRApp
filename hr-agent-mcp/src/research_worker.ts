import connectDB from './config/db';
import AgentLog from './models/AgentLog';
import Application from './models/Application';
import Job from './models/Job';
import { researcherGraph } from './services/researcherGraph';
import { pipeline, env } from '@xenova/transformers';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { startMetricsServer } from './metrics';

dotenv.config();


startMetricsServer(parseInt(process.env.METRICS_PORT || '9090'));

// Embeddings Config
env.allowLocalModels = false;
env.useBrowserCache = false;
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

// Helper: Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return (magA * magB) === 0 ? 0 : dotProduct / (magA * magB);
}

// Helper: Get Embeddings
let extractor: any = null;
async function getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!extractor) {
        console.log("Loading embedding model for Analyst Scoring...");
        extractor = await pipeline('feature-extraction', EMBEDDING_MODEL);
    }
    const embeddings: number[][] = [];
    for (const text of texts) {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data));
    }
    return embeddings;
}


async function startResearchWorker() {
    await connectDB();
    console.log("Starting Research Worker (Agent 2)...");
    console.log("Polling for applications with researchStatus: 'pending'...");

    // Polling loop
    while (true) {
        let logEntry: any = null;
        try {
            const app = await Application.findOne({ researchStatus: 'pending' });

            if (app) {
                console.log(`\n[Research Worker] Picked up Application ID: ${app._id}`);

                // 1. Mark as researching
                app.researchStatus = 'researching';
                await app.save();

                logEntry = await AgentLog.create({
                    agentName: 'BackgroundResearcher',
                    applicationId: app._id,
                    jobId: app.jobId,
                    status: 'running',
                    llmModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
                });

                if (!app.extractedLinks || app.extractedLinks.length === 0) {
                    console.log(`[Research Worker] No links to research for ${app._id}. Marking complete.`);
                    app.researchStatus = 'completed';
                    app.researchResults = [];
                    // Ensure scores are defaulted if missing
                    if (!app.analystScore) app.analystScore = 0;
                    await app.save();
                    continue;
                }

                // 2. Fetch Job Requirements for Scoring
                let jobRequirements = "General Software Engineering";
                if (app.jobId) {
                    try {
                        const job = await Job.findById(app.jobId);
                        if (job && job.requirements.length > 0) {
                            jobRequirements = job.requirements.join(", ");
                            console.log(`[Research Worker] Loaded Requirements: ${jobRequirements.substring(0, 50)}...`);
                        }
                    } catch (e) {
                        console.error("[Research Worker] Failed to fetch Job:", e);
                    }
                }

                // 3. Run LangGraph
                console.log(`[Research Worker] Spawning Agents for ${app.extractedLinks.length} links...`);

                const initialState = {
                    applicationId: app._id.toString(),
                    linksToVisit: app.extractedLinks.map(l => ({ type: l.type, url: l.url })),
                    jobRequirements: jobRequirements, // Pass to Graph
                    currentIndex: 0,
                    results: []
                };

                const resultState: any = await researcherGraph.invoke(initialState);
                const results = resultState.results;
                console.log(`[Research Worker] Research complete. Found ${results.length} results.`);

                // 4. Calculate Analyst Score (Vector Verification)
                let analystScore = 0;
                if (results.length > 0) {
                    // Filter out LinkedIn for Scoring
                    const validForScoring = results.filter((r: any) => !r.url.includes("linkedin.com") && r.status === 'valid');

                    if (validForScoring.length > 0) {
                        const texts = validForScoring.map((r: any) => r.summary).join(" ");
                        const researchVectors = await getEmbeddings([texts]);

                        if (jobRequirements) {
                            const jobVectors = await getEmbeddings([jobRequirements]);
                            const rawScore = cosineSimilarity(researchVectors[0], jobVectors[0]);
                            analystScore = Math.min(10, Math.max(0, Math.round(rawScore * 100 / 10))); // Scale to 0-10
                            console.log(`[Research Worker] Analyst Score: ${analystScore}/10 (Raw: ${rawScore.toFixed(4)})`);
                        }
                    } else {
                        console.log("[Research Worker] No valid non-LinkedIn findings to score. Score = 0.");
                    }
                }

                // 5. Update Application
                app.researchStatus = 'completed';
                app.researchResults = results;
                app.analystScore = analystScore;

                // Update AI Score (Average of 3 scores)
                const finalAiScore = Math.round(((app.skillScore || 0) + (app.evidenceScore || 0) + analystScore) / 30 * 100);
                app.aiScore = finalAiScore;
                app.aiReasoning = `Analysis Complete. Skills: ${app.skillScore}/10, Evidence: ${app.evidenceScore}/10, Research: ${analystScore}/10.`;

                await app.save();
                console.log(`[Research Worker] Saved results for ${app._id}`);

                // End Log
                if (logEntry) {
                    logEntry.status = 'success';
                    logEntry.endTime = new Date();
                    logEntry.metadata = { resultsFound: results.length, analystScore: analystScore };
                    await logEntry.save();
                }

            } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error: any) {
            console.error("[Research Worker] Error:", error);

            if (logEntry) {
                logEntry.status = 'failure';
                logEntry.endTime = new Date();
                logEntry.error = error.message;
                await logEntry.save();
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

startResearchWorker();
