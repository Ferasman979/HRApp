import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/services/db';
import Job from '@/lib/models/Job';
import Application from '@/models/Application'; // Correct path
import nodemailer from 'nodemailer';

// Ideally, secure this route with a secret key header (e.g. CRON_SECRET)
// to prevent public access.

export async function GET(req: Request) {
    try {
        await connectToDatabase();
        console.log("[Cron] Checking for expired jobs...");

        const now = new Date();

        // 1. Find Open Jobs that have expired
        const expiredJobs = await Job.find({
            status: 'open',
            expiryDate: { $lte: now }
        });

        console.log(`[Cron] Found ${expiredJobs.length} expired jobs.`);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,     // e.g. 'feras@gmail.com'
                pass: process.env.EMAIL_PASSWORD  // App Password
            }
        });

        const results = [];

        for (const job of expiredJobs) {
            console.log(`[Cron] Processing Job: ${job.title} (${job._id})`);

            // 2. Shortlist Candidates
            // Find applications for this job, sort by AIScore (descending)
            // Only consider those with an email address!
            const applications = await Application.find({
                jobId: job._id as any,
                applicantEmail: { $exists: true, $ne: "" }
            })
                .sort({ aiScore: -1 })
                .limit(job.shortlistCount || 10);

            let emailedCount = 0;

            // 3. Send Emails
            for (const app of applications) {
                if (app.applicantEmail) {
                    try {
                        await transporter.sendMail({
                            from: `"HR App AI" <${process.env.EMAIL_USER}>`,
                            to: app.applicantEmail,
                            subject: `Update on your application for ${job.title}`,
                            text: `Dear Candidate,\n\nCongratulations! You have been shortlisted for an interview for the ${job.title} position based on your AI screening score.\n\nOur team will contact you shortly.\n\nBest,\nHR Team`
                        });
                        emailedCount++;
                    } catch (err) {
                        console.error(`[Cron] Failed to email ${app.applicantEmail}:`, err);
                    }
                }
            }

            // 4. Close the Job
            job.status = 'closed'; // or 'expired'
            await job.save();

            results.push({
                job: job.title,
                shortlisted: applications.length,
                emailed: emailedCount
            });
        }

        return NextResponse.json({ success: true, processed: results });

    } catch (error: any) {
        console.error("[Cron] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
