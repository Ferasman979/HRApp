import { NextResponse } from "next/server";
import dbConnect from "@/lib/services/db";
import Job from "@/lib/models/Job";

export async function GET() {
    try {
        await dbConnect();
        const jobs = await Job.find({}).sort({ createdAt: -1 });
        return NextResponse.json(jobs);
    } catch (error: any) {
        console.error("Error fetching jobs:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body = await req.json();

        if (!body.title || !body.description) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const newJob = await Job.create({
            title: body.title,
            description: body.description,
            requirements: body.requirements || [],
            location: body.location || "Remote",
            expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
            shortlistCount: body.shortlistCount ? parseInt(body.shortlistCount) : 10,
            status: 'open'
        });

        return NextResponse.json({
            success: true,
            data: newJob
        });

    } catch (error: any) {
        console.error("Error creating job:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
