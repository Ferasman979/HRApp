import Application from '../models/Application';
import connectDB from '../config/db';

export async function fetchResume(applicationId: string): Promise<{ resumeBuffer: Buffer; jobId: string }> {
    await connectDB();

    const application = await Application.findById(applicationId);
    if (!application) {
        throw new Error(`Application not found: ${applicationId}`);
    }

    if (!application.resumeData) {
        throw new Error(`No resume data found for application: ${applicationId}`);
    }

    return { resumeBuffer: application.resumeData, jobId: application.jobId.toString() };
}
