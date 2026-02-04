"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Filter, Upload, Search, Users, FileText } from "lucide-react";

interface Employee {
    id: string; // Prisma uses id, not _id
    name: string;
    email: string;
    // role: string; // Removed specific fields in favor of dynamic data
    data: Record<string, any>;
    selected?: boolean;
}

interface GrantResult {
    cohortDescription: string;
    employees: string[];
    grants: { title: string; url: string; content: string; score: number }[];
}

export default function EmployeeGrantsPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [results, setResults] = useState<GrantResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [docResult, setDocResult] = useState<string | null>(null);
    const [generatingDoc, setGeneratingDoc] = useState(false);
    const [companyName, setCompanyName] = useState("");
    const [draftConfig, setDraftConfig] = useState<{ grant: any; cohort: string } | null>(null);
    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        const res = await fetch("/api/employees");
        const data = await res.json();
        setEmployees(data.map((e: any) => {
            // Try to find a name field case-insensitively in the data object
            const nameKey = Object.keys(e.data || {}).find(k => k.toLowerCase().includes('name'));
            const name = nameKey ? e.data[nameKey] : 'Unknown';
            // Also ensure we don't display 'Unknown' if email is available and name isn't? 
            // The UI uses email as fallback in the row below, so 'Unknown' is fine here for the main label.
            return { ...e, name, selected: false };
        }));
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];
        const text = await file.text();

        // Simple CSV Parser
        const normalizedText = text.replace(/^\uFEFF/, ''); // Remove BOM if present
        const lines = normalizedText.split(/\r\n|\n|\r/).filter(line => line.trim() !== '');

        if (lines.length < 2) {
            alert("CSV appears empty or has only headers.");
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')); // Basic quote removal

        const parsedData = lines.slice(1).map(line => {
            // Handle quotes crudely: split by comma but this will break on commas in quotes
            // For a robust solution, we'd need a real parser. 
            // For now, assuming simple CSV.
            const values = line.split(',');
            const obj: any = {};

            headers.forEach((h, i) => {
                const header = h;
                let val = values[i]?.trim();
                if (val) val = val.replace(/^"|"$/g, ''); // Remove surrounding quotes

                if (header) {
                    obj[header] = val || "";
                }
            });
            return obj;
        }).filter(e => {
            // Find email in keys case-insensitively
            const emailKey = Object.keys(e).find(k => k.toLowerCase().includes('email'));
            if (!emailKey || !e[emailKey]) {
                console.warn("Skipping row missing email:", e);
                return false;
            }
            return true;
        }).map(e => {
            // Normalize unique key for API
            const emailKey = Object.keys(e).find(k => k.toLowerCase().includes('email'));
            if (emailKey && emailKey !== 'email') {
                e.email = e[emailKey];
                // optionally delete old key
            }
            return e;
        });

        if (parsedData.length === 0) {
            alert("No valid employees found. Please ensure your CSV has an 'email' column and at least one row.");
            return;
        }

        console.log("Uploading payload:", JSON.stringify({ employees: parsedData }));

        // Upload to API
        const res = await fetch("/api/employees", {
            method: "POST",
            body: JSON.stringify({ employees: parsedData })
        });

        if (!res.ok) {
            const err = await res.json();
            console.error("Upload failed:", err);
            alert("Upload Failed: " + err.error);
            return;
        }

        const successData = await res.json();
        console.log("Upload success:", successData);

        alert("Upload Complete: " + successData.message);
        fetchEmployees();
    };

    const toggleSelect = (id: string) => {
        setEmployees(employees.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
    };

    const handlePrepareDoc = (grant: any, cohort: string) => {
        setDraftConfig({ grant, cohort });
    };

    const handleGenerateDraft = async () => {
        if (!draftConfig) return;
        if (!companyName.trim()) {
            alert("Please enter a company name");
            return;
        }

        setGeneratingDoc(true);
        // Close the config modal immediately or keep it open? Closing it to show generating state.
        const { grant, cohort } = draftConfig;
        setDraftConfig(null);

        try {
            const prompt = `Write a grant application letter for the grant "${grant.title}" (${grant.url}). 
            Context: We are applying for funding for a cohort of employees described as "${cohort}".
            Company: ${companyName}
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

        // Sanitize data before sending to API (Remove 'name' to ensure privacy)
        const sanitizedEmployees = selected.map(emp => {
            const { name, ...rest } = emp; // Remove top-level name if present
            const dataCopy = { ...emp.data };

            // Remove name fields from data object case-insensitively
            Object.keys(dataCopy).forEach(key => {
                if (key.toLowerCase().includes('name')) {
                    delete dataCopy[key];
                }
            });

            return { ...rest, data: dataCopy };
        });

        setLoading(true);
        try {
            const res = await fetch("/api/grants/search", {
                method: "POST",
                body: JSON.stringify({ employees: sanitizedEmployees })
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

                <div className="text-sm text-gray-500 italic">
                    Filters are disabled for dynamic data.
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Employee Grants Dashboard</h1>
                    <div className="flex gap-4 items-center">
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
                                        <th className="p-3">Employee</th>
                                        <th className="p-3">Data Summary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={emp.selected}
                                                    onChange={() => toggleSelect(emp.id)}
                                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="p-3 font-medium text-white">
                                                {/* Try to find name in data or use email */}
                                                <div>{emp.name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{emp.email}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-1 flex-wrap">
                                                    {emp.data && Object.entries(emp.data).map(([k, v], i) => {
                                                        if (k.toLowerCase() === 'name' || k.toLowerCase() === 'email') return null;
                                                        return (
                                                            <span key={i} className="px-1.5 py-0.5 bg-gray-700 rounded text-xs border border-gray-600" title={`${k}: ${v}`}>
                                                                {String(v)}
                                                            </span>
                                                        );
                                                    })}
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

                        {/* Draft Config Modal */}
                        {draftConfig && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                                <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
                                    <h3 className="text-xl font-bold mb-4">Finalize Application Details</h3>
                                    <div className="mb-4">
                                        <label className="block text-gray-400 text-sm mb-2">Company Name</label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="e.g. Acme Corp"
                                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setDraftConfig(null)}
                                            className="px-4 py-2 hover:bg-gray-700 rounded transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleGenerateDraft}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition font-medium"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
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
