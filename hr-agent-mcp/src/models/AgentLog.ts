
import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentLog extends Document {
    agentName: string;
    applicationId?: string;
    jobId?: string;

    // Performance Metrics
    startTime: Date;
    endTime?: Date;
    durationMs?: number; // Calculated speed (Speed)

    // Outcome
    status: 'running' | 'success' | 'failure';
    error?: string;

    // AI Metrics
    llmModel: string; // Renamed from 'model' to avoid conflict
    tokensInput?: number; // Estimated
    tokensOutput?: number; // Estimated

    // Context
    metadata?: any; // Flexible bucket for extra info
}

const AgentLogSchema = new Schema<IAgentLog>({
    agentName: { type: String, required: true },
    applicationId: { type: String },
    jobId: { type: String },

    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    durationMs: { type: Number },

    status: {
        type: String,
        enum: ['running', 'success', 'failure'],
        default: 'running'
    },
    error: { type: String },

    llmModel: { type: String, default: 'llama3.2' },
    tokensInput: { type: Number, default: 0 },
    tokensOutput: { type: Number, default: 0 },

    metadata: { type: Schema.Types.Mixed }
});

// Auto-calculate duration on save if endTime is present
AgentLogSchema.pre('save', function () {
    // Cast 'this' to IAgentLog to access properties safely
    const doc = this as unknown as IAgentLog;
    if (doc.endTime && doc.startTime) {
        doc.durationMs = doc.endTime.getTime() - doc.startTime.getTime();
    }
});

const AgentLog = mongoose.models.AgentLog || mongoose.model<IAgentLog>('AgentLog', AgentLogSchema);
export default AgentLog;
