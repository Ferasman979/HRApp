import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApplication extends Document {
    jobId: mongoose.Schema.Types.ObjectId;
    userId: string;
    applicantName?: string;
    applicantEmail?: string;
    resumeData: Buffer;
    resumeContentType: string;
    resumeHash?: string;
    status: 'received' | 'processing' | 'reviewed' | 'rejected' | 'hired';
    aiScore?: number;
    aiReasoning?: string;
    // Granular Scores (0-10)
    skillScore?: number;
    evidenceScore?: number;
    analystScore?: number;

    appliedAt: Date;
    // New Fields
    skills?: string[];
    evidence?: {
        action: string;
        tool: string;
        outcome: string;
        scope: string;
        complexity: string;
        specificity: boolean;
    }[];
    years_experience_estimate?: {
        value: number;
        confidence: number;
        basis: string;
    };
    seniority?: {
        level: string;
        rationale: string[];
    };
    // Agent 2 Fields
    extractedLinks?: {
        type: 'github' | 'linkedin' | 'portfolio' | 'other';
        url: string;
    }[];
    researchResults?: {
        url: string;
        type: string;
        summary: string;
        status: string;
        checkedAt: Date;
    }[];
    researchStatus: 'pending' | 'researching' | 'completed' | 'failed';
}

const ResearchResultSchema = new Schema({
    url: { type: String },
    type: { type: String },
    summary: { type: String },
    status: { type: String },
    checkedAt: { type: Date, default: Date.now }
}, { _id: false });

const ApplicationSchema: Schema<IApplication> = new Schema(
    {
        jobId: { type: mongoose.Schema.Types.ObjectId, required: true },
        userId: { type: String, required: true },
        applicantName: { type: String },
        applicantEmail: { type: String },
        resumeData: { type: Buffer, required: true },
        resumeContentType: { type: String, default: 'application/pdf' },
        resumeHash: { type: String }, // SHA-256 Fingerprint
        status: {
            type: String,
            enum: ['received', 'processing', 'reviewed', 'rejected', 'hired'],
            default: 'received'
        },
        aiScore: { type: Number },
        aiReasoning: { type: String },

        // Granular Scores
        skillScore: { type: Number, min: 0, max: 10 },
        evidenceScore: { type: Number, min: 0, max: 10 },
        analystScore: { type: Number, min: 0, max: 10 },

        // New Fields for Structured Extraction
        skills: { type: [String] },
        evidence: [
            {
                action: String,
                tool: String,
                outcome: String,
                scope: String,
                complexity: String,
                specificity: Boolean
            }
        ],
        years_experience_estimate: {
            value: Number,
            confidence: Number,
            basis: String
        },
        seniority: {
            level: String,
            rationale: [String]
        },
        // Agent 2 Fields
        extractedLinks: [
            {
                type: { type: String, enum: ['github', 'linkedin', 'portfolio', 'other'] },
                url: String
            }
        ],
        researchResults: {
            type: [ResearchResultSchema],
            default: []
        },
        researchStatus: {
            type: String,
            enum: ['pending', 'researching', 'completed', 'failed'],
            default: 'pending'
        },
        appliedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Compound Unique Index
ApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

const Application = mongoose.model<IApplication>('Application', ApplicationSchema);
export default Application;
