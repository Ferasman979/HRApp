import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJob extends Document {
    title: string;
    description: string;
    requirements: string[];
    location?: string;
    createdAt: Date;
}

const JobSchema: Schema<IJob> = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        requirements: { type: [String], required: true },
        location: { type: String, default: "Remote" },
    },
    { timestamps: true }
);

// Prevent overwriting the model if it already exists
const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

export default Job;
