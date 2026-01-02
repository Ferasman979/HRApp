import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApplication extends Document {
    jobId: mongoose.Types.ObjectId;
    userId: string; // Email or ID from provider
    applicantName?: string;
    applicantEmail?: string;
    resumeData: Buffer;
    resumeContentType: string;
    resumeHash?: string; // Content Fingerprint
    status: 'received' | 'processing' | 'reviewed' | 'rejected' | 'hired';
    aiScore?: number;
    aiReasoning?: string;
    appliedAt: Date;
}

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
        appliedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Compound Unique Index: Prevents same user applying to same job twice
ApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

// Prevent overwriting the model if it already exists
const Application: Model<IApplication> = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;
