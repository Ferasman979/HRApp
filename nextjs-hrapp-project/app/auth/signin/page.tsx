"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignIn() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Using "credentials" provider with "username"
        const result = await signIn("credentials", {
            redirect: false,
            username,
            password,
        });

        if (result?.error) {
            setError("Invalid credentials");
        } else {
            router.push("/"); // Redirect to dashboard/home after login
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold mb-6 text-center text-blue-400">Welcome Back</h2>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                            placeholder="e.g. admin"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded hover:from-blue-600 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200"
                    >
                        Sign In
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                    Don't have an account?{" "}
                    <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 font-medium">
                        Register Here
                    </Link>
                </p>
            </div>
        </div>
    );
}
