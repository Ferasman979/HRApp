import Link from "next/link";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/services/db";
import Application from "@/models/Application";
import Job from "@/lib/models/Job";

export const dynamic = "force-dynamic";

async function getApplication(appId: string) {
    await dbConnect();
    try {
        const app = await Application.findById(appId).lean();
        if (!app) return null;
        return JSON.parse(JSON.stringify(app));
    } catch (error) {
        return null;
    }
}

async function getJob(jobId: string) {
    await dbConnect();
    const job = await Job.findById(jobId).lean();
    return job ? JSON.parse(JSON.stringify(job)) : null;
}

export default async function ApplicationDetailsPage({ params }: { params: Promise<{ id: string; appId: string }> }) {
    const { id: jobId, appId } = await params;
    const application = await getApplication(appId);

    if (!application) notFound();

    const job = await getJob(jobId);

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Link href={`/jobs/${jobId}`} className="text-sm text-gray-500 hover:text-blue-600 mb-4 inline-block">
                        ← Back to Job Applicants
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{application.fullName || application.applicantName}</h1>
                            <p className="text-gray-500 mt-1">Applying for: <span className="font-semibold">{job?.title}</span></p>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${application.status === 'hired' ? 'bg-green-100 text-green-800' :
                                application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-blue-100 text-blue-800'
                                }`}>
                                {application.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: AI Analysis */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Skills Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Extracted Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {application.skills && application.skills.length > 0 ? (
                                    application.skills.map((skill: string, idx: number) => (
                                        <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm font-medium border border-blue-100">
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-gray-400 italic">No skills extracted yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Evidence Card (Collapsible) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <details className="group" open>
                                <summary className="flex items-center justify-between p-6 cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                                    <h2 className="text-lg font-semibold text-gray-900">Evidence of Experience</h2>
                                    <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <div className="p-6 border-t border-gray-200 space-y-4">
                                    {application.evidence && application.evidence.length > 0 ? (
                                        application.evidence.map((item: any, idx: number) => (
                                            <div key={idx} className="border-l-4 border-indigo-500 pl-4 py-1">
                                                <p className="text-gray-900 font-medium">{item.action}</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                                                    <span>Tool: <span className="text-gray-700">{item.tool}</span></span>
                                                    {item.outcome && <span>Outcome: <span className="text-green-600">{item.outcome}</span></span>}
                                                    {item.scope && <span>Scope: <span className="text-purple-600">{item.scope}</span></span>}
                                                    <span className="bg-gray-100 px-2 rounded text-xs py-0.5 self-center lowercase">{item.complexity} level</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 italic">No evidence extracted.</p>
                                    )}
                                </div>
                            </details>
                        </div>

                        {/* Agent 2: Digital Research Results */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span>🌐</span> Open Source & Web Analysis (Agent 2)
                            </h2>
                            {application.researchResults && application.researchResults.length > 0 ? (
                                <div className="space-y-4">
                                    {application.researchResults.map((res: any, idx: number) => (
                                        <div key={idx} className={`p-4 rounded-lg border ${res.status === 'valid' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <a href={res.url} target="_blank" className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                                                    {res.type?.toUpperCase()} ↗
                                                </a>
                                                <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${res.status === 'valid' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                                    {res.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed">{res.summary}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-400 italic text-sm border border-dashed border-gray-200 rounded p-4 text-center">
                                    No digital footprint analysis available yet.
                                    {application.researchStatus === 'pending' && <span className="block mt-1 text-xs text-blue-500">Research Pending...</span>}
                                    {application.researchStatus === 'researching' && <span className="block mt-1 text-xs text-orange-500">Agent is researching...</span>}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Stats & Meta */}
                    <div className="space-y-6">


                        {/* Improved Match Score Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall Match Score</h2>

                            {/* Concentric Donut Chart */}
                            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                                {/* Outer Ring: AI Score (Smart) */}
                                <div className="absolute inset-0 rounded-full"
                                    style={{
                                        background: `conic-gradient(#4F46E5 ${application.aiScore || 0}%, #E5E7EB 0)`
                                    }}>
                                </div>
                                {/* Spacer to create ring width */}
                                <div className="absolute inset-2 bg-white rounded-full"></div>

                                {/* Inner Ring: Raw Copilot Score (Legacy/Cosine) */}
                                <div className="absolute inset-4 rounded-full"
                                    style={{
                                        background: `conic-gradient(#059669 ${(application.score || 0)}%, #F3F4F6 0)`
                                    }}>
                                </div>
                                {/* Inner Spacer */}
                                <div className="absolute inset-6 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                                    <span className="text-3xl font-bold text-gray-900">{application.aiScore || 0}</span>
                                    <span className="text-xs text-gray-500 font-medium">SMART SCORE</span>
                                </div>
                            </div>

                            {/* Score Breakdown */}
                            <div className="w-full space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Skills Match</span>
                                    <span className="font-semibold text-gray-900">{application.skillScore ?? '-'} / 10</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(application.skillScore || 0) * 10}%` }}></div>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Evidence Strength</span>
                                    <span className="font-semibold text-gray-900">{application.evidenceScore ?? '-'} / 10</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(application.evidenceScore || 0) * 10}%` }}></div>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Analyst Verification</span>
                                    <span className="font-semibold text-gray-900">{application.analystScore ?? '-'} / 10</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(application.analystScore || 0) * 10}%` }}></div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 w-full flex justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600"></span> Smart Score</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600"></span> Raw Match</span>
                            </div>
                        </div>

                        {/* Seniority & Experience */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Assessment</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase text-gray-500 font-bold tracking-wider">Seniority Level</label>
                                    <div className="mt-1 text-2xl font-bold text-indigo-600">
                                        {application.seniority?.level || "Unknown"}
                                    </div>
                                    {application.seniority?.rationale && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            "{application.seniority.rationale.join(', ')}"
                                        </p>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <label className="text-xs uppercase text-gray-500 font-bold tracking-wider">Est. Experience</label>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-gray-900">
                                            {application.years_experience_estimate?.value || 0}
                                        </span>
                                        <span className="text-gray-500">Years</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Confidence: {((application.years_experience_estimate?.confidence || 0) * 100).toFixed(0)}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Resume Download */}
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Original Documents</h3>
                            <a href={`/api/applications/${appId}/resume`} target="_blank" className="block w-full text-center bg-white border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition">
                                📄 Download PDF Resume
                            </a>
                        </div>

                    </div>
                </div>
            </div>
        </main>
    );
}
