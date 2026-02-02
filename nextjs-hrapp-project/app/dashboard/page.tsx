"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Filter, Upload, Search, Users, FileText } from "lucide-react";

interface Employee {
    _id: string;
    name: string;
    email: string;
    role: string;
    demographics: {
        gender?: string;
        ethnicity?: string;
        disability?: string;
        veteranStatus?: string;
    };
    selected?: boolean;
}

interface GrantResult {
    cohortDescription: string;
    employees: string[];
    grants: { title: string; url: string; content: string; score: number }[];
}

export default function DashboardPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [results, setResults] = useState<GrantResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [docResult, setDocResult] = useState<string | null>(null);
    const [generatingDoc, setGeneratingDoc] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        const res = await fetch("/api/employees");
        const data = await res.json();
        setEmployees(data.map((e: any) => ({ ...e, selected: false })));
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];
        const text = await file.text();

        // Simple CSV Parser
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const parsedData = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = line.split(',');
            const obj: any = {};
            headers.forEach((h, i) => {
                // Map CSV headers to model fields (Simplified mapping)
                const val = values[i]?.trim();
                if (h.toLowerCase().includes('email')) obj.email = val;
                else if (h.toLowerCase().includes('name')) obj.name = val;
                else if (h.toLowerCase().includes('role')) obj.role = val;
                else if (h.toLowerCase().includes('gender')) obj.demographics = { ...obj.demographics, gender: val };
                else if (h.toLowerCase().includes('ethnicity')) obj.demographics = { ...obj.demographics, ethnicity: val };
                else if (h.toLowerCase().includes('disability')) obj.demographics = { ...obj.demographics, disability: val };
                else if (h.toLowerCase().includes('veteran')) obj.demographics = { ...obj.demographics, veteranStatus: val };
            });
            // Defaults
            if (!obj.demographics) obj.demographics = {};
            return obj;
        });

        // Upload to API
        await fetch("/api/employees", {
            method: "POST",
            body: JSON.stringify({ employees: parsedData })
        });

        alert("Upload Complete");
        fetchEmployees();
    };

    const toggleSelect = (id: string) => {
        setEmployees(employees.map(e => e._id === id ? { ...e, selected: !e.selected } : e));
    };

    const handlePrepareDoc = async (grant: any, cohort: string) => {
        setGeneratingDoc(true);
        try {
            const prompt = `Write a grant application letter for the grant "${grant.title}" (${grant.url}). 
            Context: We are applying for funding for a cohort of employees described as "${cohort}".
            Company: HR Tech Solutions Inc.
            Grant Details: ${grant.content}
            Please confirm eligibility and write a professional justification.`;

            const res = await fetch("/api/grants/write", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt })
            });
            const data = await res.json();

            if (data.success) {
                setDocResult(data.text);
            } else {
                setDocResult("Error: " + data.message);
            }

        } catch (e) {
            alert("Failed to generate doc");
        } finally {
            setGeneratingDoc(false);
        }
    };

    const handleSearchGrants = async () => {
        const selected = employees.filter(e => e.selected);
        if (selected.length === 0) return alert("Select employees first");

        setLoading(true);
        try {
            const res = await fetch("/api/grants/search", {
                method: "POST",
                body: JSON.stringify({ employees: selected })
            });
            const data = await res.json();
            setResults(data.results);
        } catch (e) {
            alert("Search failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex">
            {/* Sidebar Filters */}
            <aside className="w-64 bg-gray-800 p-6 border-r border-gray-700">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-400" /> Filters
                </h2>

                <div className="space-y-4">
                    {['Gender', 'Ethnicity', 'Disability', 'Veteran Status'].map(filter => (
                        <div key={filter}>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{filter}</label>
                            <select
                                className="w-full bg-gray-700 rounded p-2 text-sm border border-gray-600 focus:border-blue-500"
                                onChange={(e) => setFilters({ ...filters, [filter]: e.target.value })}
                            >
                                <option value="">All</option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                {/* Add more options dynamically based on data in real app */}
                            </select>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Employee Grants Dashboard</h1>
                    <div className="flex gap-4">
                        <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded flex items-center gap-2 transition">
                            <Upload className="w-4 h-4" />
                            Import CSV
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                        </label>
                        <button
                            onClick={handleSearchGrants}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center gap-2 transition disabled:opacity-50"
                        >
                            {loading ? "Searching..." : <><Search className="w-4 h-4" /> Search Grants</>}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Employee Table */}
                    <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-green-400" /> Employees
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-gray-750 text-gray-200">
                                    <tr>
                                        <th className="p-3">Select</th>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Role</th>
                                        <th className="p-3">Demographics</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={emp.selected}
                                                    onChange={() => toggleSelect(emp._id)}
                                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="p-3 font-medium text-white">{emp.name}</td>
                                            <td className="p-3">{emp.role}</td>
                                            <td className="p-3">
                                                <div className="flex gap-1 flex-wrap">
                                                    {Object.values(emp.demographics).filter(Boolean).map((d, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 bg-gray-700 rounded text-xs border border-gray-600">
                                                            {d}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 h-fit">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-yellow-400" /> Grant Opportunities
                        </h3>

                        {!results ? (
                            <div className="text-center text-gray-500 py-12">
                                Select employees and click Search to find grants.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {results.map((cohort, idx) => (
                                    <div key={idx} className="bg-gray-750 p-4 rounded-lg border border-gray-600">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            {cohort.cohortDescription}
                                        </h4>
                                        <div className="text-xs text-gray-400 mb-3">
                                            APPLIES TO: {cohort.employees.join(", ")}
                                        </div>

                                        <ul className="space-y-4">
                                            {cohort.grants.map((grant, gIdx) => (
                                                <li key={gIdx} className="bg-gray-900 p-4 rounded border border-gray-800 hover:border-blue-500/50 transition group">
                                                    <div className="mb-2">
                                                        <a href={grant.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-400 hover:underline">
                                                            {grant.title}
                                                        </a>
                                                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                                            {grant.content}
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={() => handlePrepareDoc(grant, cohort.cohortDescription)}
                                                        className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded border border-green-600/30 hover:bg-green-600/30 transition flex items-center gap-1"
                                                    >
                                                        <FileText className="w-3 h-3" /> Prepare Application
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Doc Result Modal/overlay */}
                        {docResult && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                                <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-700">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold">Generated Application Draft</h3>
                                        <button onClick={() => setDocResult(null)} className="text-gray-400 hover:text-white">✕</button>
                                    </div>
                                    <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono bg-gray-900 p-4 rounded border border-gray-700">
                                        {docResult}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {generatingDoc && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 cursor-wait">
                                <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-3 border border-blue-500">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>Drafting Application with AI...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
