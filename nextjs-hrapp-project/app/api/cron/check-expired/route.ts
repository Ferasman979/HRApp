import { NextResponse } from 'next/server';
import dbConnect from '@/lib/services/db';
import Job from '@/lib/models/Job';

export async function GET(req: Request) {
    try {
        // Vercel Cron verification (optional but recommended)
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await dbConnect();

        const now = new Date();

        // Find jobs that are open and expiry date is past
        const result = await Job.updateMany(
            {
                status: 'open',
                expiryDate: { $lt: now }
            },
            {
                $set: { status: 'expired' }
            }
        );

        return NextResponse.json({
            success: true,
            closedCount: result.modifiedCount,
            timestamp: now
        });
    } catch (error: any) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
