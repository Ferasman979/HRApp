"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploaderProps {
    jobId: string;
    onSuccess: () => void;
}

export default function FileUploader({ jobId, onSuccess }: FileUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
            setError(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
        },
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024, // 5MB
    });

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("jobId", jobId);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full">
            {!file ? (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-300 hover:border-slate-400 bg-slate-50"
                        }`}
                >
                    <input {...getInputProps()} />
                    <div className="space-y-2">
                        <svg
                            className="mx-auto h-12 w-12 text-slate-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                        >
                            <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <p className="text-sm text-slate-600 font-medium">
                            {isDragActive
                                ? "Drop your resume here..."
                                : "Drag & drop your resume, or click to select"}
                        </p>
                        <p className="text-xs text-slate-500">PDF only (Max 5MB)</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded text-red-500">
                                {/* PDF Icon */}
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-slate-900 truncate max-w-[200px]">
                                    {file.name}
                                </p>
                                <p className="text-slate-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setFile(null)}
                            className="text-slate-400 hover:text-red-500 transition"
                            disabled={uploading}
                        >
                            ✕
                        </button>
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition transform active:scale-95 ${uploading
                                ? "bg-slate-400 cursor-wait"
                                : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5"
                            }`}
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Uploading...
                            </span>
                        ) : (
                            "Submit Application"
                        )}
                    </button>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
