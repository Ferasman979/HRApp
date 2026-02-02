"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();

    // Don't show navbar on auth pages
    if (pathname.startsWith("/auth")) {
        return null;
    }

    return (
        <nav className="bg-gray-800 text-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text">
                            HR App
                        </Link>
                        <div className="ml-10 flex items-baseline space-x-4">
                            <Link
                                href="/"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/" ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                    }`}
                            >
                                Home
                            </Link>
                            <Link
                                href="/jobs"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname.startsWith("/jobs") ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                    }`}
                            >
                                Jobs
                            </Link>
                            <Link
                                href="/dashboard"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/dashboard" ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                    }`}
                            >
                                Grants Dashboard
                            </Link>
                            <Link
                                href="/admin/monitoring"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/admin/monitoring" ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                    }`}
                            >
                                Monitoring
                            </Link>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
