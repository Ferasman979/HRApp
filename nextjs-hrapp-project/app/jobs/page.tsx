import Link from 'next/link';
import { Briefcase, MessageSquare, PlusCircle } from 'lucide-react';

export default function JobsPage() {
    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text">
                    Jobs Hub
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                    {/* Option 1: Manage Jobs */}
                    <Link
                        href="/jobs/manage"
                        className="group bg-gray-800 border border-gray-700 rounded-xl p-8 hover:bg-gray-750 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:border-blue-500/50"
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="bg-blue-500/10 p-4 rounded-full group-hover:bg-blue-500/20 transition-colors">
                                <Briefcase className="w-12 h-12 text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                                Manage Jobs
                            </h2>
                            <p className="text-gray-400">
                                Create, view, and manage job postings. Monitor applicants and status.
                            </p>
                            <span className="text-sm font-medium text-blue-400 pt-4 flex items-center">
                                View Dashboard <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                            </span>
                        </div>
                    </Link>

                    {/* Option 2: Job Chatbot */}
                    <Link
                        href="/chatbot"
                        className="group bg-gray-800 border border-gray-700 rounded-xl p-8 hover:bg-gray-750 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 hover:border-indigo-500/50"
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="bg-indigo-500/10 p-4 rounded-full group-hover:bg-indigo-500/20 transition-colors">
                                <MessageSquare className="w-12 h-12 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                Job Chatbot
                            </h2>
                            <p className="text-gray-400">
                                AI-powered assistant to generate job descriptions and requirements.
                            </p>
                            <span className="text-sm font-medium text-indigo-400 pt-4 flex items-center">
                                Launch Chatbot <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                            </span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
