import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const metrics = await register.metrics();
        return new NextResponse(metrics, {
            headers: {
                'Content-Type': register.contentType
            }
        });
    } catch (err) {
        return new NextResponse('Error generating metrics', { status: 500 });
    }
}
