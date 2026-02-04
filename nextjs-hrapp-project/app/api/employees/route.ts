import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { employees } = await req.json();

        if (!Array.isArray(employees)) {
            return NextResponse.json({ error: "Invalid data format. Expected array of employees." }, { status: 400 });
        }

        const upsertPromises = employees.map((emp: any) => {
            // Extract email for the unique key, store everything else in 'data'
            const { email, ...rest } = emp;

            if (!email) {
                // Skip records without email or handle error
                return Promise.resolve(null);
            }

            return prisma.employee.upsert({
                where: { email: email },
                update: {
                    data: rest // Update the dynamic data
                },
                create: {
                    email: email,
                    data: rest
                }
            });
        });

        const results = (await Promise.all(upsertPromises)).filter(Boolean); // Filter out nulls

        return NextResponse.json({
            success: true,
            count: results.length,
            message: `Successfully processed ${results.length} employees.`
        });

    } catch (error: any) {
        console.error("Error importing employees:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { email: 'asc' }
        });
        return NextResponse.json(employees);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
