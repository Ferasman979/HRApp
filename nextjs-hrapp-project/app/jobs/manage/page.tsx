"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, StopCircle, RefreshCw, Calendar, CheckCircle } from "lucide-react";

interface Job {
    _id: string;
    title: string;
    description: string;
    location: string;
    status: 'open' | 'closed' | 'expired';
    expiryDate?: string;
    shortlistCount?: number;
    createdAt: string;
}

export default function ManageJobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = async () => {
        try {
            const res = await fetch("/api/jobs");
            const data = await res.json();
            setJobs(data);
        } catch (error) {
            console.error("Failed to fetch jobs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to PERMANENTLY delete this job? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
            if (res.ok) {
                setJobs(jobs.filter(j => j._id !== id));
            } else {
                alert("Failed to delete job");
            }
        } catch (error) {
            console.error("Error deleting job", error);
        }
    };

    const handleTakeDown = async (id: string) => {
        try {
            const res = await fetch(`/api/jobs/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "closed" })
            });

            if (res.ok) {
                setJobs(jobs.map(j => j._id === id ? { ...j, status: "closed" } : j));
            } else {
                alert("Failed to take down job");
            }
        } catch (error) {
            console.error("Error closing job", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <Link href="/jobs" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-3xl font-bold">Manage Jobs</h1>
                    </div>
                    <Link
                        href="/chatbot"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                        <span className="mr-2">+</span> Create New Job
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {jobs.length === 0 && (
                            <div className="text-center py-12 text-gray-500 bg-gray-800 rounded-lg border border-gray-700">
                                No jobs found. Start by creating one!
                            </div>
                        )}
                        {jobs.map((job) => (
                            <div key={job._id} className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:border-gray-600">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-xl font-bold text-white">{job.title}</h2>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${job.status === 'open' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                job.status === 'closed' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                    'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{job.description}</p>

                                    <div className="flex items-center gap-6 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            Posted: {new Date(job.createdAt).toLocaleDateString()}
                                        </div>
                                        {job.expiryDate && (
                                            <div className="flex items-center gap-1.5 text-gray-400">
                                                <StopCircle className="w-4 h-4" />
                                                Expires: {new Date(job.expiryDate).toLocaleDateString()}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <span>Applications: {job.shortlistCount || "N/A"} (Target)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end md:self-center">
                                    {job.status === 'open' && (
                                        <button
                                            onClick={() => handleTakeDown(job._id)}
                                            className="px-3 py-1.5 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 rounded border border-yellow-600/30 text-sm font-medium transition flex items-center gap-2"
                                            title="Take Down (Stop accepting applicants)"
                                        >
                                            <StopCircle className="w-4 h-4" />
                                            Take Down
                                        </button>
                                    )}
                                    {job.status === 'closed' && (
                                        // Optional: Re-open functionality
                                        <button
                                            // onClick={() => handleReOpen(job._id)}
                                            className="px-3 py-1.5 bg-gray-700 text-gray-400 cursor-not-allowed rounded border border-gray-600 text-sm font-medium transition flex items-center gap-2"
                                            disabled
                                        >
                                            Closed
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleDelete(job._id)}
                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                                        title="Delete Job"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
