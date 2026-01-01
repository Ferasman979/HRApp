import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/services/db';
import AgentLog from '@/models/AgentLog';

export async function GET() {
    try {
        await connectToDatabase();

        // 1. End-to-End Latency Stats (P50, P95)
        const latencyStats = await AgentLog.aggregate([
            { $match: { status: 'success', durationMs: { $exists: true } } },
            {
                $group: {
                    _id: null,
                    avgDuration: { $avg: "$durationMs" },
                    durations: { $push: "$durationMs" }
                }
            }
        ]);

        let p50 = 0, p95 = 0;
        if (latencyStats.length > 0) {
            const durations = latencyStats[0].durations.sort((a: number, b: number) => a - b);
            p50 = durations[Math.floor(durations.length * 0.5)];
            p95 = durations[Math.floor(durations.length * 0.95)];
        }

        // 2. Error Rate by Agent Class
        const errorStats = await AgentLog.aggregate([
            {
                $group: {
                    _id: "$agentName",
                    total: { $sum: 1 },
                    failures: {
                        $sum: { $cond: [{ $eq: ["$status", "failure"] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    agentName: "$_id",
                    errorRate: { $multiply: [{ $divide: ["$failures", "$total"] }, 100] },
                    total: 1
                }
            }
        ]);

        // 3. Token Metrics (Input/Output)
        const tokenStats = await AgentLog.aggregate([
            { $match: { status: 'success' } },
            {
                $group: {
                    _id: "$agentName",
                    avgInput: { $avg: "$tokensInput" },
                    avgOutput: { $avg: "$tokensOutput" },
                    totalTasks: { $sum: 1 }
                }
            }
        ]);

        return NextResponse.json({
            success: true,
            data: {
                latency: { p50, p95 },
                errors: errorStats,
                tokens: tokenStats
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
