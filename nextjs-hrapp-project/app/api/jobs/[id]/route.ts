import { NextResponse } from "next/server";
import dbConnect from "@/lib/services/db";
import Job from "@/lib/models/Job";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        const updatedJob = await Job.findByIdAndUpdate(
            id,
            { ...body },
            { new: true }
        );

        if (!updatedJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json(updatedJob);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        // Soft delete implementation choice:
        // await Job.findByIdAndUpdate(id, { status: 'deleted' });

        // As per plan, "take down" is status update (PUT), "delete" is hard delete.
        const deletedJob = await Job.findByIdAndDelete(id);

        if (!deletedJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Job deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
