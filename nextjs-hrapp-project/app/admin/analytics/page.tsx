"use client";
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/analytics')
            .then(res => res.json())
            .then(res => {
                if (res.success) setData(res.data);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-white">Loading metrics...</div>;
    if (!data) return <div className="p-8 text-white">Failed to load data.</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8 text-blue-400">System Analytics (Zero-Cost Monitoring)</h1>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-sm uppercase">P50 Latency</h3>
                    <p className="text-3xl font-bold text-green-400">{(data.latency.p50 / 1000).toFixed(2)}s</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-sm uppercase">P95 Latency</h3>
                    <p className="text-3xl font-bold text-yellow-400">{(data.latency.p95 / 1000).toFixed(2)}s</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-sm uppercase">Total Tasks</h3>
                    <p className="text-3xl font-bold text-blue-400">
                        {data.tokens.reduce((acc: any, curr: any) => acc + curr.totalTasks, 0)}
                    </p>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Error Rate */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 h-80">
                    <h3 className="mb-4 font-semibold">Error Rate by Agent (%)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.errors}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="agentName" stroke="#ccc" />
                            <YAxis stroke="#ccc" />
                            <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
                            <Bar dataKey="errorRate" fill="#ef4444" name="Error Rate %" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Token Usage */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 h-80">
                    <h3 className="mb-4 font-semibold">Avg Token Usage (Input vs Output)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.tokens}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="_id" stroke="#ccc" />
                            <YAxis stroke="#ccc" />
                            <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
                            <Legend />
                            <Bar dataKey="avgInput" fill="#8884d8" name="Input Tokens" />
                            <Bar dataKey="avgOutput" fill="#82ca9d" name="Output Tokens" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
