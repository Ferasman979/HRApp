"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                }),
            });

            if (res.ok) {
                // Registration successful
                router.push("/auth/signin");
            } else {
                const data = await res.json();
                setError(data.message || "Registration failed.");
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold mb-6 text-center text-green-400">Create Account</h2>

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
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                            placeholder="jdoe"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                            placeholder="john@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded hover:from-green-600 hover:to-emerald-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating Account..." : "Register"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                    Already have an account?{" "}
                    <Link href="/auth/signin" className="text-green-400 hover:text-green-300 font-medium">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
