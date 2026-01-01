
import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentLog extends Document {
    agentName: 'ResumeAnalyst' | 'BackgroundResearcher';
    applicationId?: string;
    jobId?: string;

    startTime: Date;
    endTime?: Date;
    durationMs?: number;

    status: 'running' | 'success' | 'failure';
    error?: string;

    llmModel: string;
    tokensInput?: number;
    tokensOutput?: number;

    metadata?: any;
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

// Auto-calculate duration on save
AgentLogSchema.pre('save', async function () {
    if (this.endTime && this.startTime) {
        this.durationMs = this.endTime.getTime() - this.startTime.getTime();
    }
});

const AgentLog = mongoose.models.AgentLog || mongoose.model<IAgentLog>('AgentLog', AgentLogSchema);
export default AgentLog;
