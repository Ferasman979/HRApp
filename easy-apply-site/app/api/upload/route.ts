import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const jobId = formData.get("jobId") as string;

        if (!file || !jobId) {
            return NextResponse.json({ error: "Missing file or jobId" }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // 1. Compute SHA-256 Hash of the file content
        const resumeHash = crypto.createHash('sha256').update(buffer).digest('hex');

        await dbConnect();

        // 2. Check for Duplicate Resume Content for this Job
        const existingContent = await Application.findOne({
            jobId: new mongoose.Types.ObjectId(jobId),
            resumeHash: resumeHash
        });

        if (existingContent) {
            return NextResponse.json({ error: "You have already submitted this resume for this job." }, { status: 400 });
        }

        // 3. Check for Duplicate User Application (Double-check)
        const existingUser = await Application.findOne({
            jobId: new mongoose.Types.ObjectId(jobId),
            userId: session.user.email,
        });

        if (existingUser) {
            return NextResponse.json({ error: "You have already applied to this job." }, { status: 400 });
        }

        await Application.create({
            jobId: new mongoose.Types.ObjectId(jobId),
            userId: session.user.email,
            applicantName: session.user.name,
            applicantEmail: session.user.email,
            resumeData: buffer,
            resumeContentType: file.type,
            resumeHash: resumeHash,
            status: "received",
        } as any);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
