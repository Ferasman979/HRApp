import Groq from 'groq-sdk';
import Job from '../models/Job';
import { getExtractor } from '../services/modelLoader';

// Interface for Extracted Data
export interface ExtractedData {
    email?: string;
    skills: string[];
    extractedLinks: { type: 'github' | 'linkedin' | 'portfolio' | 'other', url: string }[];
    evidence: {
        action: string;
        tool: string;
        outcome: string;
        scope: "self" | "team" | "org" | "external";
        complexity: "low" | "medium" | "high";
        specificity: boolean;
    }[];
    years_experience_estimate: {
        value: number;
        confidence: number;
        basis: string;
    };
    seniority: {
        level: string;
        rationale: string[];
    };
    similarityScore: number; // 0-100 (Legacy/Raw)
    skillScore: number;      // 0-10
    evidenceScore: number;   // 0-10
    analystScore?: number;   // 0-10 (Added by Agent 2 later)
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
}

// RAG Configuration
const CHUNK_SIZE = 1500;
const OVERLAP = 200;

// Helper: Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return (magA * magB) === 0 ? 0 : dotProduct / (magA * magB);
}

// Helper: Get Embeddings (Uses Singleton Service)
async function getEmbeddings(texts: string[]): Promise<number[][]> {
    const extractor = await getExtractor();

    const embeddings: number[][] = [];
    for (const text of texts) {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data));
    }
    return embeddings;
}

export async function extractData(resumeText: string, jobId?: string): Promise<ExtractedData> {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    console.log(`Starting Data Extraction (Agent 1) using ${modelName}...`);

    // 1. Fetch Context
    let jobContext = "";
    let jobRequirementsText = "";
    let jobRequirements: string[] = [];

    if (jobId) {
        try {
            const job = await Job.findById(jobId);
            if (job) {
                console.log(`Fetched Job Description for: ${job.title}`);
                jobContext = `${job.title}\n${job.description}\n${job.requirements.join(", ")}`;
                jobRequirementsText = job.requirements.join(", ");
                jobRequirements = job.requirements;
            }
        } catch (error) {
            console.error("Error fetching job:", error);
        }
    }

    // 2. Compute Similarity Score (Job vs Resume)
    let similarityScore = 0;
    if (jobContext && resumeText) {
        console.log("Calculating Similarity Score...");
        // Truncate resume to first 3000 chars for scoring to fit in model
        const resumeSummary = resumeText.substring(0, 3000);
        const vectors = await getEmbeddings([jobContext, resumeSummary]);
        const rawScore = cosineSimilarity(vectors[0], vectors[1]);

        // Map Cosine (-1 to 1) directly to 0-100 percentage
        similarityScore = Math.max(0, rawScore * 100);
        console.log(`Raw Cosine: ${rawScore.toFixed(4)} | Scaled Score: ${similarityScore.toFixed(0)}`);
    }

    // 3. Context Preparation (Smart RAG Bypass)
    // If resume is small enough (< 25k chars ~ 6k tokens), send WHOLE text to avoid missing links/headers.
    let context = "";
    if (resumeText.length < 25000) {
        console.log(`Resume is small (${resumeText.length} chars). Sending FULL text (Skipping RAG).`);
        context = resumeText;
    } else {
        console.log(`Resume is large (${resumeText.length} chars). Using RAG retrieval...`);
        const chunks: string[] = [];
        let start = 0;
        while (start < resumeText.length) {
            const end = Math.min(start + CHUNK_SIZE, resumeText.length);
            chunks.push(resumeText.substring(start, end));
            if (end === resumeText.length) break;
            start += (CHUNK_SIZE - OVERLAP);
        }

        const chunkEmbeddings = await getEmbeddings(chunks);

        // Queries
        const queries = [
            "technical skills programming languages tools",
            "work experience roles responsibilities company names",
            "quantitative results metrics achievements",
            "github linkedin portfolio links urls contact info"
        ];
        if (jobContext) queries.push(`Relevant skills for: ${jobContext}`);

        const queryEmbeddings = await getEmbeddings(queries);

        const relevantChunkIndices = new Set<number>();
        for (const queryVec of queryEmbeddings) {
            const scores = chunkEmbeddings.map((chunkVec, i) => ({
                index: i,
                score: cosineSimilarity(queryVec, chunkVec)
            }));
            scores.sort((a, b) => b.score - a.score);
            scores.slice(0, 5).forEach(s => relevantChunkIndices.add(s.index));
        }

        const relevantChunks = Array.from(relevantChunkIndices).sort((a, b) => a - b).map(i => chunks[i]);
        context = relevantChunks.join("\n---\n");
    }

    // 4. LLM Generation
    const systemPrompt = `
You are an expert HR Analyst. Extract structured data from the resume.

CLASSIFICATION RULES:
- Scope "ORG": Work done within a company, agency, or official team.
- Scope "SELF": Personal projects, freelance work (unless agency based), or individual practice.
- Scope "TEAM": Hackathons, academic group projects, or non-corporate team efforts.

LINK EXTRACTION (CRITICAL):
- Extract **FULL** URLs found (e.g. "https://github.com/username", NOT "https://github.com").
- If the text says "github.com/foo", output "https://github.com/foo".
- Do NOT truncate paths.

EVIDENCE EXTRACTION RULES:
- Extract **ALL** distinct pieces of evidence found in the text. 
- Do NOT limit to top items. If there are 10 achievements, list all 10.
- Ensure each evidence item has a clear Action, Tool, and Outcome.

TARGET JSON FORMAT:
{
  "email": "<candidate email address>",
  "skills": ["<string>"],
  "extractedLinks": [ { "type": "github|linkedin|portfolio|other", "url": "<FULL_URL_STRING>" } ],
  "evidence": [
    {
      "action": "<what did they do>",
      "tool": "<main tool/tech>",
      "outcome": "<result/impact>",
      "scope": "self|team|org",
      "complexity": "low|medium|high",
      "specificity": <boolean>
    }
  ],
  "years_experience_estimate": { "value": <number>, "confidence": <0-1>, "basis": "<string>" },
  "seniority": { "level": "<Junior|Mid|Senior>", "rationale": ["<string>"] }
}
`;

    try {
        console.log("Sending context to LLM...");
        const response = await groq.chat.completions.create({
            model: modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Resume Content:\n${context}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
            stream: false
        });

        const rawJson = response.choices[0].message.content?.trim() || "{}";
        const data = JSON.parse(rawJson) as ExtractedData;

        // --- SPECIALIST LINK EXTRACTION (Lightweight LLM) ---
        // Using Llama-3.1-8b-instant for direct text extraction to avoid 70b's tendency to "clean" URLs.
        console.log("Running Specialist Link Extractor (llama-3.1-8b-instant)...");
        try {
            const linkResponse = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant', // Fast, cheap model
                messages: [
                    {
                        role: 'system',
                        content: `You are a strict URL Extractor.
1. Return JSON with a "links" array.
2. EXTRACT EXACT URL STRINGS ONLY. Do not modify, truncate, or add "https://" if not present.
3. If the text says "github.com/username", output "github.com/username".
4. If the text says "linkedin.com/in/foo", output "linkedin.com/in/foo".
5. WARNING: Do NOT output root domains like "github.com" if a path is available.
6. Look for "Website:", "GitHub:", "LinkedIn:" labels.

JSON Output: { "links": [ { "type": "github", "url": "https://github.com/username" } ] }`
                    },
                    { role: 'user', content: `Please find the links in this resume text:\n\n${context}` }
                ],
                response_format: { type: 'json_object' },
                temperature: 0
            });

            // DEBUG: Log what text the 8b model actually saw
            console.log("\n[LinkExtractor] Context Preview (First 500 chars):", context.substring(0, 500));
            if (context.toLowerCase().includes('github')) {
                const idx = context.toLowerCase().indexOf('github');
                console.log("[LinkExtractor] Context Preview (Around 'github'):", context.substring(idx - 50, idx + 100));
            }

            const linkJson = JSON.parse(linkResponse.choices[0].message.content || "{}");

            if (linkJson.links && Array.isArray(linkJson.links) && linkJson.links.length > 0) {
                console.log(`[LinkExtractor] Lightweight model found ${linkJson.links.length} potential links.`);

                // VALIDATION: Filter out root domains and junk
                const validLinks = linkJson.links.filter((l: any) => {
                    if (!l.url) return false;
                    let url = l.url.toLowerCase().trim();

                    // Fix missing protocol
                    if (!url.startsWith('http')) {
                        l.url = 'https://' + l.url;
                        url = l.url.toLowerCase();
                    }

                    // Normalize Type (Fixes ValidationError)
                    if (l.type) {
                        l.type = l.type.toLowerCase();
                        if (l.type === 'website') l.type = 'portfolio'; // Map website -> portfolio
                    } else {
                        l.type = 'other';
                    }

                    // Enforce Enum
                    const allowedTypes = ['github', 'linkedin', 'portfolio', 'other'];
                    if (!allowedTypes.includes(l.type)) {
                        l.type = 'other';
                    }

                    // Reject Roots
                    if (url === 'https://github.com' || url === 'https://github.com/') return false;
                    if (url === 'https://linkedin.com' || url === 'https://linkedin.com/') return false;
                    if (url === 'https://www.github.com' || url === 'https://www.linkedin.com') return false;

                    return true;
                });

                console.log(`[LinkExtractor] Validated Links: ${validLinks.length} remaining.`);
                data.extractedLinks = validLinks;
            } else {
                console.log("[LinkExtractor] Lightweight model found no links. Keeping original.");
            }

        } catch (err: any) {
            console.error("Lightweight extraction failed:", err.message);
            // Fallback: keep original data.extractedLinks from 70b model
        }

        // DEBUG: Final Links
        console.log("--------------------------------------------------");
        console.log("[ExtractData] FINAL LINKS:", JSON.stringify(data.extractedLinks, null, 2));
        console.log("--------------------------------------------------");

        // Attach the calculated score
        data.similarityScore = Math.round(similarityScore);

        // --- Granular Scoring ---
        if (jobRequirementsText) {
            console.log("Calculating Granular Scores...");
            const skillsText = data.skills.join(", ");

            // Skill Score: New "Coverage + Bonus" Logic
            // 1. Calculate Coverage of Requirements
            let metRequirements = 0;
            const totalRequirements = jobRequirements.length;

            // We need embeddings for all requirements individually
            if (totalRequirements > 0) {
                const reqEmbeddings = await getEmbeddings(jobRequirements);
                // We also need embeddings for all candidate skills individually
                const candidateSkillsText = data.skills; // Array of strings
                const skillEmbeddings = await getEmbeddings(candidateSkillsText);

                for (const reqVec of reqEmbeddings) {
                    let bestMatch = 0;
                    for (const skillVec of skillEmbeddings) {
                        const sim = cosineSimilarity(reqVec, skillVec);
                        if (sim > bestMatch) bestMatch = sim;
                    }
                    // Threshold for "Matching" a requirement (0.45 is a reasonable match for this model)
                    if (bestMatch >= 0.45) {
                        metRequirements++;
                    }
                }
            }

            const coveragePct = totalRequirements > 0 ? (metRequirements / totalRequirements) : 0;
            console.log(`Skills Coverage: ${metRequirements}/${totalRequirements} (${(coveragePct * 100).toFixed(0)}%)`);

            // 2. Base Score Calculation (Max 8 points based on coverage)
            let baseScore = coveragePct * 8;

            // 3. Bonus Logic (Only if high coverage)
            let bonus = 0;
            if (coveragePct >= 0.80) {
                // If candidate has MORE skills than required, give bonus
                // (Assuming valuable extra skills)
                if (data.skills.length > totalRequirements) {
                    // Simple bonus: 2 points for having ANY extra valid skills in this context
                    // Or proportional? Let's give flat +2 to reach 10/10.
                    bonus = 2;
                }
            }

            data.skillScore = Math.min(10, Math.max(0, Math.round(baseScore + bonus)));

            // Evidence Score: WEIGHTED POINTS SYSTEM (Reverting to heuristic approach)
            // Points: High=3, Medium=2, Low=1
            // Multiplier: Specificity (x1.5), Org Scope (x1.2)
            let totalEvidencePoints = 0;

            data.evidence.forEach(item => {
                let points = 0;
                if (item.complexity === 'high') points = 3;
                else if (item.complexity === 'medium') points = 2;
                else points = 1;

                if (item.specificity) points *= 1.5;
                if (item.scope === 'org') points *= 1.2;

                totalEvidencePoints += points;
            });

            // Normalize: Target score is ~15-20 points for a perfect 10/10.
            // e.g. 5 Medium Organization Specific items = 5 * (2 * 1.5 * 1.2) = 18 points.
            data.evidenceScore = Math.min(10, Math.max(0, Math.round(totalEvidencePoints / 2)));

            console.log(`Skill Score: ${data.skillScore}/10 | Evidence Score: ${data.evidenceScore}/10 (Points: ${totalEvidencePoints.toFixed(1)})`);
        } else {
            // Fallback if no job context
            data.skillScore = 0;
            data.evidenceScore = 0;
        }

        return data;

    } catch (e: any) {
        console.error("Extraction Error:", e.message);
        return {
            email: undefined,
            skills: [],
            extractedLinks: [],
            evidence: [],
            years_experience_estimate: { value: 0, confidence: 0, basis: "Error" },
            seniority: { level: "Unknown", rationale: [] },
            similarityScore: 0,
            skillScore: 0,
            evidenceScore: 0
        };
    }
}
