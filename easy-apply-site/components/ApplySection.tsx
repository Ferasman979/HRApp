"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import FileUploader from "./FileUploader";

export default function ApplySection({ jobId }: { jobId: string }) {
    const { data: session, status } = useSession();
    const [isApplying, setIsApplying] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);

    if (status === "loading") {
        return (
            <div className="animate-pulse bg-slate-200 h-12 w-48 rounded-lg mx-auto" />
        );
    }

    if (hasApplied) {
        return (
            <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                <div className="text-green-600 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-green-800">Application Received!</h3>
                <p className="text-green-600">Good luck! We'll be in touch soon.</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="text-center">
                <p className="text-slate-500 mb-4">Sign in with your HR App credentials to apply</p>
                <button
                    onClick={() => signIn()}
                    className="bg-black text-white hover:bg-slate-800 font-bold py-3 px-8 rounded-lg transition shadow-lg flex items-center gap-3 mx-auto"
                >
                    Sign in
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {!isApplying ? (
                <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        {/* No image in Credentials provider by default, just show name */}
                        <div className="bg-blue-100 text-blue-600 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                            {session.user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="text-left">
                            <p className="text-sm text-slate-500">Applying as</p>
                            <p className="font-bold text-slate-900">{session.user?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsApplying(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:-translate-y-0.5"
                    >
                        Apply Now
                    </button>
                </div>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-900">Upload Resume</h3>
                        <button onClick={() => setIsApplying(false)} className="text-slate-400 hover:text-slate-600 text-sm">Cancel</button>
                    </div>
                    <FileUploader jobId={jobId} onSuccess={() => setHasApplied(true)} />
                </div>
            )}
        </div>
    );
}
