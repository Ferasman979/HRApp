"use client";

import { useState, useEffect, useRef } from "react";

interface JobEntry {
    id: string;
    job_name: string;
    description: string;
    requirements: string[];
    createdAt: string;
    s3Url?: string; // Optional URL from backend
}

export default function ChatbotPage() {
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [jobEntries, setJobEntries] = useState<JobEntry[]>([]);

    // Use a ref to store the recognition instance
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Initialize speech recognition
        if (typeof window !== "undefined") {
            const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = "en-US";

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInputText((prev) => prev ? `${prev} ${transcript}` : transcript);
                    setIsRecording(false);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setIsRecording(false);
                };

                recognitionRef.current.onend = () => {
                    setIsRecording(false);
                };
            }
        }
    }, []);

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            setIsRecording(true);
            recognitionRef.current.start();
        }
    };

    const handleSubmit = async () => {
        if (!inputText.trim()) return;

        setLoading(true);
        try {
            const response = await fetch("/api/pplx", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: inputText }),
            });

            const data = await response.json();

            if (data.success) {
                // Add the new entry to the list immediately
                setJobEntries((prev) => [...prev, data.data]);
                setInputText("");
            } else {
                alert("Failed to process request: " + data.message);
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            alert("An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async (job: JobEntry) => {
        try {
            const response = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: job.job_name,
                    description: job.description,
                    requirements: job.requirements,
                    // Pull from the inputs (Quick hack for now, ideally use State)
                    expiryDate: (document.getElementById('expiryDate') as HTMLInputElement).value,
                    shortlistCount: (document.getElementById('shortlistCount') as HTMLInputElement).value
                }),
            });

            const result = await response.json();
            if (result.success) {
                alert("Job Published Successfully!");
                // Optionally update UI to show it's published
            } else {
                alert("Failed to publish: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Error publishing job.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text">
                    Job Opening Creator
                </h1>

                {/* Input Area */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                    <textarea
                        className="w-full bg-gray-700 text-white p-4 rounded-lg mb-4 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        rows={4}
                        placeholder="Describe the job position, responsibilities, and requirements here... (or use voice input)"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />

                    {/* Expiry & Shortlist Settings */}
                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-750 border border-gray-700 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Expiry Date (Top N Candidates will be emailed)</label>
                            <input
                                type="date"
                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500"
                                id="expiryDate"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Shortlist Count</label>
                            <input
                                type="number"
                                defaultValue={10}
                                min={1}
                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500"
                                id="shortlistCount"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !inputText.trim()}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Processing..." : "Generate Job JSON"}
                        </button>

                        <button
                            onClick={toggleRecording}
                            className={`flex-none w-16 flex items-center justify-center rounded-full transition ${isRecording ? "bg-red-500 animate-pulse" : "bg-gray-600 hover:bg-gray-500"
                                }`}
                            title="Toggle Voice Input"
                        >
                            🎤
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold mb-4">Generated Job Descriptions</h2>

                    {jobEntries.length === 0 && (
                        <p className="text-gray-400 text-center">No job descriptions generated yet.</p>
                    )}

                    {jobEntries.slice().reverse().map((job) => (
                        <div key={job.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-md hover:border-gray-600 transition">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-blue-400">{job.job_name}</h3>
                                    <p className="text-xs text-gray-500">{new Date(job.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                    {/* Publish Button */}
                                    <button
                                        onClick={() => handlePublish(job)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition"
                                    >
                                        Publish to EasyApply
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-1">Description</h4>
                                <p className="text-gray-300">{job.description}</p>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-1">Requirements</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {job.requirements.map((req, idx) => (
                                        <li key={idx} className="text-gray-300">{req}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
}
