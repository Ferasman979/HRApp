
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import dbConnect from "../../../src/lib/services/db";
import AgentLog from "@/models/AgentLog";
import {
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    Database,
    Zap
} from "lucide-react";

export const dynamic = 'force-dynamic';

async function getMetrics() {
    await dbConnect();

    // 1. Success Rate
    const totalRuns = await AgentLog.countDocuments({});
    const failures = await AgentLog.countDocuments({ status: 'failure' });
    const successRate = totalRuns > 0 ? ((totalRuns - failures) / totalRuns) * 100 : 100;

    // 2. Avg Duration (Last 50 runs)
    const recentLogs = await AgentLog.find({ status: 'success', durationMs: { $exists: true } })
        .sort({ startTime: -1 })
        .limit(50);

    const avgDuration = recentLogs.length > 0
        ? recentLogs.reduce((acc, log) => acc + (log.durationMs || 0), 0) / recentLogs.length
        : 0;

    // 3. Token Usage (Today)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todaysLogs = await AgentLog.find({ startTime: { $gte: startOfDay } });
    const tokensToday = todaysLogs.reduce((acc, log) => acc + (log.tokensInput || 0) + (log.tokensOutput || 0), 0);

    return {
        totalRuns,
        successRate: successRate.toFixed(1),
        avgDuration: (avgDuration / 1000).toFixed(1), // Seconds
        tokensToday,
        recentLogs: recentLogs.slice(0, 10) // Show top 10 recent
    };
}

export default async function MonitoringPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/auth/signin");

    const metrics = await getMetrics();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Agent Mission Control
                    </h1>
                    <p className="text-gray-500 mt-2">Real-time performance monitoring for AI Workers</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-200">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium">System Online</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Success Rate</p>
                            <h3 className="text-2xl font-bold text-gray-900">{metrics.successRate}%</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Avg Latency</p>
                            <h3 className="text-2xl font-bold text-gray-900">{metrics.avgDuration}s</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Daily Tokens</p>
                            <h3 className="text-2xl font-bold text-gray-900">{metrics.tokensToday.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Runs</p>
                            <h3 className="text-2xl font-bold text-gray-900">{metrics.totalRuns}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Recent Executions</h3>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">Live Log</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Agent</th>
                                <th className="px-6 py-3">Model</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Duration</th>
                                <th className="px-6 py-3">Tokens</th>
                                <th className="px-6 py-3 text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {metrics.recentLogs.map((log: any) => (
                                <tr key={log._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-gray-900">
                                        {log.agentName}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-mono">
                                            {log.llmModel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        {log.status === 'success' ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                                                <CheckCircle className="w-3 h-3" /> Success
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">
                                                <XCircle className="w-3 h-3" /> Failed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600">
                                        {((log.durationMs || 0) / 1000).toFixed(2)}s
                                    </td>
                                    <td className="px-6 py-3 text-gray-600">
                                        {(log.tokensInput || 0) + (log.tokensOutput || 0)}
                                    </td>
                                    <td className="px-6 py-3 text-right text-gray-500">
                                        {new Date(log.startTime).toLocaleTimeString()}
                                    </td>
                                </tr>
                            ))}
                            {metrics.recentLogs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                        No data yet. Waiting for agents...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
