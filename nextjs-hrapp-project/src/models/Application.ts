import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApplication extends Document {
    jobId: mongoose.Schema.Types.ObjectId;
    userId: string;
    // Schema Harmonization
    applicantName?: string; // Backend uses this
    fullName?: string;      // Legacy
    applicantEmail?: string; // Backend
    email?: string;         // Legacy

    resumeData?: Buffer;    // For PDF download
    resumeContentType?: string;
    resumeUrl?: string;     // Legacy S3?

    aiScore?: number;       // Backend
    score?: number;         // Legacy

    // Granular Scores
    skillScore?: number;
    evidenceScore?: number;
    analystScore?: number;

    resumeHash?: string;
    status: 'pending' | 'received' | 'processing' | 'reviewed' | 'rejected' | 'hired';
    createdAt: Date;

    // Rich Extraction Fields
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
    // Agent 2
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
    researchStatus?: 'pending' | 'researching' | 'completed' | 'failed';
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
        jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
        userId: { type: String, required: true },

        // Harmonized Fields (Legacy support removed or merged)
        applicantName: String,
        resumeUrl: String,

        aiScore: Number,

        score: { type: Number, default: 0 },

        applicantEmail: { type: String },
        resumeData: { type: Buffer, required: true },
        resumeContentType: { type: String, default: 'application/pdf' },
        resumeHash: { type: String }, // SHA-256 Fingerprint
        status: {
            type: String,
            enum: ['pending', 'received', 'processing', 'reviewed', 'rejected', 'hired'],
            default: 'pending'
        },

        skillScore: { type: Number },
        evidenceScore: { type: Number },
        analystScore: { type: Number },

        // Rich Extraction Fields
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

        // Agent 2
        extractedLinks: [{
            type: { type: String, enum: ['github', 'linkedin', 'portfolio', 'other'] },
            url: String
        }],
        researchResults: {
            type: [ResearchResultSchema],
            default: []
        },
        researchStatus: {
            type: String,
            enum: ['pending', 'researching', 'completed', 'failed'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

// Compound Unique Index
ApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

// Prevent overwriting model
const Application = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
export default Application;
