import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/services/db';
import mongoose from 'mongoose';
import Application, { IApplication } from '@/models/Application';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();

        console.log(`[API Debug] DB Name: ${mongoose.connection.name}`);
        const { id } = await params;
        console.log(`[API Debug] Requesting Resume for ID: ${id}`);

        const app = await Application.findById(id).select('resumeData resumeContentType applicantName') as IApplication;

        console.log(`[API Debug] App Found: ${!!app}`);
        if (app) {
            console.log(`[API Debug] Applicant: ${app.applicantName}`);
            console.log(`[API Debug] Has ResumeData: ${!!app.resumeData}`);
            if (app.resumeData) console.log(`[API Debug] ResumeData Length: ${app.resumeData.length}`);
        }

        if (!app || !app.resumeData) {
            console.log(`[API Debug] 404 Returned`);
            return new NextResponse('Resume not found', { status: 404 });
        }

        const buffer = app.resumeData;
        const filename = `${app.applicantName || 'resume'}.pdf`;

        return new NextResponse(buffer as any, {
            headers: {
                'Content-Type': app.resumeContentType || 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error('Error serving resume:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
