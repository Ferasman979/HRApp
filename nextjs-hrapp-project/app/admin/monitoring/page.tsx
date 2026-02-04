
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function MonitoringPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/auth/signin");

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-100px)]">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Infrastructure Metrics (Grafana)</h3>
                    <a
                        href={process.env.NEXT_PUBLIC_GRAFANA_URL || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                    >
                        Open in Grafana ↗
                    </a>
                </div>
                <div className="w-full flex-1 bg-gray-50 relative">
                    {process.env.NEXT_PUBLIC_GRAFANA_URL ? (
                        <iframe
                            src={`${process.env.NEXT_PUBLIC_GRAFANA_URL}?orgId=1&refresh=5s&theme=light&kiosk`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            title="Grafana Dashboard"
                        ></iframe>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <Activity className="w-12 h-12 mb-4 opacity-20" />
                            <p>Grafana URL not configured.</p>
                            <p className="text-sm mt-2">Set <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">NEXT_PUBLIC_GRAFANA_URL</code> in your environment.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
