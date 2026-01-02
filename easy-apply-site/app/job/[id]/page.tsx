import Link from "next/link";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";
import { notFound } from "next/navigation";
import ApplySection from "@/components/ApplySection";

// Force dynamic because we are fetching specific IDs
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

export default async function JobDetails({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);

    if (!job) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-8 transition">
                    ← Back to all jobs
                </Link>

                <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{job.title}</h1>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className="text-blue-600 font-medium">{job.location || "Remote"}</span>
                                </div>
                            </div>
                            <button disabled className="bg-slate-200 text-slate-400 cursor-not-allowed font-bold py-3 px-8 rounded-lg">
                                Apply Now
                            </button>
                        </div>
                    </div>


                    {/* Content */}
                    <div className="p-8 space-y-8">
                        <section>
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">You&apos;ll be doing</h2>
                            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line">
                                {job.description}
                            </div>
                        </section>

                        <section>
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Requirements</h2>
                            <ul className="space-y-3">
                                {job.requirements.map((req: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-3 text-slate-600">
                                        <span className="flex-none mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span>{req}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    {/* Footer - Application Section */}
                    <div className="p-8 bg-slate-50 border-t border-slate-100">
                        <ApplySection jobId={job.id || job._id} />
                    </div>
                </div>
            </div>
        </main>
    );
}
