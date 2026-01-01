import Application from '../models/Application';
import AgentLog from '../models/AgentLog';
import { jobCount, jobDuration, llmTokens } from '../metrics';
import { fetchResume } from '../tools/fetchResume';
import { parseResume } from '../tools/parseResume';
import { extractData } from '../tools/extractData';

export async function processApplication(applicationId: string) {
    let logEntry: any = null;
    try {
        console.log(`[Processor] Processing Application ID: ${applicationId}`);

        // Start Log
        logEntry = await AgentLog.create({
            agentName: 'ResumeAnalyst',
            applicationId: applicationId,
            status: 'running',
            llmModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
        });

        // 1. Fetch Resume & Job ID
        console.log(`[Processor] Fetching resume...`);
        const { resumeBuffer, jobId } = await fetchResume(applicationId);
        if (logEntry) await AgentLog.findByIdAndUpdate(logEntry._id, { jobId: jobId });

        // Update status to processing
        await Application.findByIdAndUpdate(applicationId, { status: 'processing' });

        // 2. Parse PDF
        console.log(`[Processor] Parsing PDF...`);
        const resumeText = await parseResume(resumeBuffer);

        // 3. Extract Data (RAG)
        console.log(`[Processor] Running RAG Extraction...`);
        const extractedData = await extractData(resumeText, jobId);

        // 4. Update Application with Results
        console.log(`[Processor] Saving results...`);

        // Calculate Preliminary AI Score (Agent 1 only)
        // Agent 2 (Analyst) will update this later.
        // Base score = (Skill + Evidence) / 20 * 100
        const prelimAiScore = Math.min(100, Math.round(((extractedData.skillScore + extractedData.evidenceScore) / 20) * 100));

        await Application.findByIdAndUpdate(applicationId, {
            status: 'reviewed',
            applicantEmail: extractedData.email,
            skills: extractedData.skills,
            evidence: extractedData.evidence,
            years_experience_estimate: extractedData.years_experience_estimate,
            seniority: extractedData.seniority,

            // Scores
            score: extractedData.similarityScore, // Legacy Raw Cosine
            skillScore: extractedData.skillScore,
            evidenceScore: extractedData.evidenceScore,
            analystScore: 0, // Pending

            aiScore: prelimAiScore,

            extractedLinks: extractedData.extractedLinks,
            researchStatus: 'pending', // Ready for Agent 2

            aiReasoning: `Agent 1 Analysis: Skills ${extractedData.skillScore}/10, Evidence ${extractedData.evidenceScore}/10. Research Pending.`
        });

        // Success Log
        if (logEntry) {
            logEntry.status = 'success';
            logEntry.endTime = new Date();

            // Use Real Tokens if available, else fallback to estimate
            if (extractedData.usage) {
                logEntry.tokensInput = extractedData.usage.promptTokens;
                logEntry.tokensOutput = extractedData.usage.completionTokens;
            } else {
                // Estimate tokens (Roughly 1.3 tokens per char)
                const inputChars = resumeText.length;
                const outputChars = JSON.stringify(extractedData).length;
                logEntry.tokensInput = Math.round(inputChars * 1.3);
                logEntry.tokensOutput = Math.round(outputChars * 1.3);
            }

            logEntry.metadata = { skillScore: extractedData.skillScore, evidenceCount: extractedData.evidence.length };
            await logEntry.save();

            // --- Prometheus Metrics ---
            jobCount.inc({ agent: 'processor', status: 'success' });
            if (logEntry.durationMs) {
                jobDuration.observe({ agent: 'processor', status: 'success' }, logEntry.durationMs / 1000);
            }
            if (logEntry.tokensInput) {
                llmTokens.inc({ type: 'input', model: logEntry.llmModel, agent: 'processor' }, logEntry.tokensInput);
            }
            if (logEntry.tokensOutput) {
                llmTokens.inc({ type: 'output', model: logEntry.llmModel, agent: 'processor' }, logEntry.tokensOutput);
            }
        }

        console.log(`[Processor] processing complete for ${applicationId}`);

    } catch (error: any) {
        console.error(`[Processor] Error processing ${applicationId}:`, error);

        // Error Log
        if (logEntry) {
            logEntry.status = 'failure';
            logEntry.endTime = new Date();
            logEntry.error = error.message;
            await logEntry.save();

            // --- Prometheus Metrics ---
            jobCount.inc({ agent: 'processor', status: 'failure' });
            if (logEntry.durationMs) {
                jobDuration.observe({ agent: 'processor', status: 'failure' }, logEntry.durationMs / 1000);
            }
        }

        await Application.findByIdAndUpdate(applicationId, {
            status: 'rejected',
            aiReasoning: `Error during processing: ${error.message}`
        });
    }
}
