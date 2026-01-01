import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJob extends Document {
    title: string;
    description: string;
    requirements: string[];
    location?: string;
    createdAt: Date;
    shortlistCount?: number;
    expiryDate?: Date;
    status: 'open' | 'closed' | 'expired';
}

const JobSchema: Schema<IJob> = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        requirements: { type: [String], required: true },
        location: { type: String, default: "Remote" },
        shortlistCount: { type: Number, default: 10 },
        expiryDate: { type: Date },
        status: {
            type: String,
            enum: ['open', 'closed', 'expired'],
            default: 'open'
        }
    },
    { timestamps: true }
);

// Prevent overwriting the model if it already exists (Next.js hot reload fix)
const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

export default Job;
