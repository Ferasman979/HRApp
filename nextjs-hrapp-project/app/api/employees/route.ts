import { NextResponse } from "next/server";
import dbConnect from "@/lib/services/db";
import Employee from "@/lib/models/Employee";

export async function POST(req: Request) {
    try {
        await dbConnect();

        // Parse CSV text from body
        // Expecting raw CSV string or JSON with csv data?
        // Let's support JSON { csvData: [...] } or just raw list.
        // Usually file upload -> FormData. But for simplicity, let's assume client parses CSV to JSON or sends JSON array.
        // Actually, user said "populates a csv". I'll assume the frontend will parse CSV to JSON (using papaparse) and send JSON.

        const { employees } = await req.json();

        if (!Array.isArray(employees)) {
            return NextResponse.json({ error: "Invalid data format. Expected array of employees." }, { status: 400 });
        }

        const upsertOperations = employees.map((emp: any) => ({
            updateOne: {
                filter: { email: emp.email },
                update: { $set: emp },
                upsert: true
            }
        }));

        if (upsertOperations.length > 0) {
            await Employee.bulkWrite(upsertOperations);
        }

        return NextResponse.json({
            success: true,
            count: upsertOperations.length,
            message: `Successfully processed ${upsertOperations.length} employees.`
        });

    } catch (error: any) {
        console.error("Error importing employees:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        await dbConnect();
        const employees = await Employee.find({}).sort({ name: 1 });
        return NextResponse.json(employees);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
