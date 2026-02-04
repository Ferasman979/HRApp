"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Briefcase, Users } from "lucide-react";

export default function DashboardPage() {
    // Dummy Data for Charts
    const grantsByProject = [
        { name: 'Alpha', grants: 12 },
        { name: 'Beta', grants: 19 },
        { name: 'Gamma', grants: 3 },
        { name: 'Delta', grants: 5 },
    ];

    const grantsByEmployee = [
        { name: 'John Doe', grants: 4 },
        { name: 'Jane Smith', grants: 8 },
        { name: 'Bob Johnson', grants: 2 },
        { name: 'Alice Williams', grants: 6 },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">Grants Dashboard</h1>
                <p className="text-gray-400 mt-2">Overview of grant distribution by project and employee.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Grants by Project Chart */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold mb-4 text-blue-400">Grants Collected by Project</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={grantsByProject}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                    itemStyle={{ color: '#60A5FA' }}
                                />
                                <Legend />
                                <Bar dataKey="grants" fill="#3B82F6" name="Grants" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Grants by Employee Chart */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold mb-4 text-green-400">Grants Collected by Employee</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={grantsByEmployee}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                    itemStyle={{ color: '#34D399' }}
                                />
                                <Legend />
                                <Bar dataKey="grants" fill="#10B981" name="Grants" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Navigation Buttons placed specifically below relevant charts concept */}
                <div className="flex-1 flex justify-center md:justify-start">
                    {/* Aligned roughly with left column */}
                    <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition w-full md:w-auto justify-center">
                        <Briefcase className="w-5 h-5" />
                        Project Grants
                    </button>
                </div>

                <div className="flex-1 flex justify-center md:justify-start">
                    {/* Aligned roughly with right column */}
                    <Link href="/dashboard/employee-grants">
                        <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition w-full md:w-auto justify-center">
                            <Users className="w-5 h-5" />
                            Employee Grants
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
