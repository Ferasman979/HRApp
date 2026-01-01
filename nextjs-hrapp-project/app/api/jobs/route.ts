import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/services/db";
import Job from "@/lib/models/Job";

export async function POST(req: Request) {
    try {
        await connectToDatabase();

        // 1. Get data from Chatbot
        // Expecting: { title, description, requirements }
        const body = await req.json();

        if (!body.title || !body.description) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        // 2. Create Job in DB
        const newJob = await Job.create({
            title: body.title,
            description: body.description,
            requirements: body.requirements || [],
            expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
            shortlistCount: body.shortlistCount ? parseInt(body.shortlistCount) : 10,
        });

        return NextResponse.json({
            success: true,
            data: newJob,
            // TODO: Replace with REAL domain later
            liveUrl: `http://localhost:3001/job/${newJob._id}`
        });

    } catch (error: any) {
        console.error("Error creating job:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
