import AgentLog from '../models/AgentLog';
import Application from '../models/Application';
import Job from '../models/Job';
import { researcherGraph } from './researcherGraph';
import { getExtractor } from './modelLoader';

// Helper: Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return (magA * magB) === 0 ? 0 : dotProduct / (magA * magB);
}

async function getEmbeddings(texts: string[]): Promise<number[][]> {
    const extractor = await getExtractor();
    const embeddings: number[][] = [];
    for (const text of texts) {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data));
    }
    return embeddings;
}

export async function performResearch(applicationId: string) {
    console.log(`[ResearchService] Starting research for ${applicationId}`);

    const app = await Application.findById(applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found`);

    // 1. Mark as researching
    app.researchStatus = 'researching';
    await app.save();

    let logEntry: any = await AgentLog.create({
        agentName: 'BackgroundResearcher',
        applicationId: app._id,
        jobId: app.jobId,
        status: 'running',
        llmModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    });

    try {
        if (!app.extractedLinks || app.extractedLinks.length === 0) {
            console.log(`[ResearchService] No links to research. Marking complete.`);
            app.researchStatus = 'completed';
            app.researchResults = [];
            if (!app.analystScore) app.analystScore = 0;
            await app.save();

            // Log Update
            logEntry.status = 'success';
            logEntry.endTime = new Date();
            logEntry.metadata = { resultsFound: 0, analystScore: 0 };
            await logEntry.save();
            return { results: [], analystScore: 0 };
        }

        // 2. Fetch Job Requirements
        let jobRequirements = "General Software Engineering";
        if (app.jobId) {
            try {
                const job = await Job.findById(app.jobId);
                if (job && job.requirements.length > 0) {
                    jobRequirements = job.requirements.join(", ");
                }
            } catch (e) {
                console.error("[ResearchService] Failed to fetch Job:", e);
            }
        }

        // 3. Run LangGraph
        console.log(`[ResearchService] Spawning Agents for ${app.extractedLinks.length} links...`);

        const initialState = {
            applicationId: app._id.toString(),
            linksToVisit: app.extractedLinks.map(l => ({ type: l.type, url: l.url })),
            jobRequirements: jobRequirements,
            currentIndex: 0,
            results: []
        };

        const resultState: any = await researcherGraph.invoke(initialState);
        const results = resultState.results;
        console.log(`[ResearchService] Research complete. Found ${results.length} results.`);

        // 4. Calculate Analyst Score
        let analystScore = 0;
        if (results.length > 0) {
            const validForScoring = results.filter((r: any) => !r.url.includes("linkedin.com") && r.status === 'valid');
            if (validForScoring.length > 0) {
                const texts = validForScoring.map((r: any) => r.summary).join(" ");
                const researchVectors = await getEmbeddings([texts]);

                if (jobRequirements) {
                    const jobVectors = await getEmbeddings([jobRequirements]);
                    const rawScore = cosineSimilarity(researchVectors[0], jobVectors[0]);
                    analystScore = Math.min(10, Math.max(0, Math.round(rawScore * 100 / 10)));
                }
            }
        }

        // 5. Update Application
        const finalAiScore = Math.round(((app.skillScore || 0) + (app.evidenceScore || 0) + analystScore) / 30 * 100);
        const aiReasoning = `Analysis Complete. Skills: ${app.skillScore}/10, Evidence: ${app.evidenceScore}/10, Research: ${analystScore}/10.`;

        await Application.findByIdAndUpdate(app._id, {
            researchStatus: 'completed',
            researchResults: results,
            analystScore: analystScore,
            aiScore: finalAiScore,
            aiReasoning: aiReasoning
        });

        // End Log
        logEntry.status = 'success';
        logEntry.endTime = new Date();
        logEntry.metadata = { resultsFound: results.length, analystScore: analystScore };
        await logEntry.save();

        return { results, analystScore, finalAiScore };

    } catch (error: any) {
        console.error("[ResearchService] Error:", error);
        logEntry.status = 'failure';
        logEntry.endTime = new Date();
        logEntry.error = error.message;
        await logEntry.save();
        throw error;
    }
}
