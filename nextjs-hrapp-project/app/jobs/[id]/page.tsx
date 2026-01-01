import Link from "next/link";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/services/db";
import Job from "@/models/Job";
import Application from "@/models/Application";

export const dynamic = "force-dynamic";

async function getJob(id: string) {
    await dbConnect();
    try {
        const job = await Job.findById(id).lean();
        if (!job) return null;
        return JSON.parse(JSON.stringify(job));
    } catch (error) {
        return null;
    }
}

async function getApplications(jobId: string) {
    await dbConnect();
    try {
        console.log(`[Frontend] Fetching apps for Job ID: ${jobId}`);
        const apps = await Application.find({ jobId: jobId })
            .select('-resumeData')
            .sort({ aiScore: -1, createdAt: -1 })
            .lean();
        console.log(`[Frontend] Found ${apps.length} apps.`);
        return JSON.parse(JSON.stringify(apps));
    } catch (error) {
        return [];
    }
}

export default async function JobApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);
    const applications = await getApplications(id);

    if (!job) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Link href="/jobs" className="text-sm text-gray-500 hover:text-blue-600 mb-4 inline-block">
                        ← Back to Jobs
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
                            <p className="text-gray-500 mt-1">Applicants Dashboard</p>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm">
                            <span className="text-gray-500">Total Applicants:</span>
                            <span className="ml-2 font-bold text-gray-900">{applications.length}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Candidate</th>
                                    <th className="px-6 py-4">AI Match Score</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Applied Date</th>
                                    <th className="px-6 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {applications.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                            No applicants found for this position yet.
                                        </td>
                                    </tr>
                                ) : (
                                    applications.map((app: any) => (
                                        <tr key={app._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <Link href={`/jobs/${job._id}/applications/${app._id}`} className="hover:underline">
                                                    <div className="font-medium text-blue-900">{app.applicantName || "Unknown Candidate"}</div>
                                                </Link>
                                                <div className="text-xs text-gray-400">{app.applicantEmail}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {app.aiScore >= 80 ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {app.aiScore}%
                                                        </span>
                                                    ) : app.aiScore > 0 ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            {app.aiScore}%
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="capitalize">{app.status}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {new Date(app.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/jobs/${job._id}/applications/${app._id}`}
                                                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 hover:border-indigo-400 px-3 py-1 rounded-full transition"
                                                    >
                                                        View Details
                                                    </Link>
                                                    <a
                                                        href={`/api/applications/${app._id}/resume`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:border-blue-400 px-3 py-1 rounded-full transition"
                                                    >
                                                        PDF
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
