import { NextResponse } from "next/server";
import { findGrantsForCohorts } from "@/lib/grant-matcher";

export async function POST(req: Request) {
    try {
        // Expecting list of full employee objects (or IDs, but objects saves a DB lookup if we trust client)
        // Better to fetch from DB using IDs to ensure data integrity and security.
        const { employees } = await req.json();

        if (!Array.isArray(employees)) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        // Processing
        const results = await findGrantsForCohorts(employees);

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Grant search error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
