import Link from 'next/link';
import dbConnect from '@/lib/services/db';
import Job from '@/models/Job';

// Force dynamic to ensure we always get the latest jobs
export const dynamic = 'force-dynamic';

export default async function JobsPage() {
    await dbConnect();
    // Use .lean() to get plain JavaScript objects efficiently
    const jobs = await Job.find({}).sort({ createdAt: -1 }).lean();

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Active Job Postings</h1>
                    <Link
                        href="/"
                        className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {jobs.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                        <p className="text-lg">No jobs posted yet.</p>
                        <p className="text-sm mt-2">Create jobs in your admin tool to see them here.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {jobs.map((job: any) => (
                            <div key={job._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">{job.title}</h2>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            📍 {job.location || 'Remote'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            📅 Posted {new Date(job.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-gray-600 line-clamp-2 max-w-2xl">
                                        {job.description}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 min-w-[140px]">
                                    <Link
                                        href={`/jobs/${job._id}`}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-center px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        View Applicants
                                    </Link>
                                    <a
                                        href={`http://localhost:3001/job/${job._id}`} // Assuming easy-apply-site runs on 3001
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm text-center font-medium"
                                    >
                                        View Live Posting ↗
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
