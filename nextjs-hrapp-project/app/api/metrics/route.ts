import { NextRequest, NextResponse } from 'next/server';
import { register, httpRequestDurationMicroseconds } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

function simulateTraffic() {
    // Simulate some requests to populate graphs
    const routes = ['/', '/api/auth/signin', '/dashboard', '/api/upload'];
    const methods = ['GET', 'POST'];
    const codes = ['200', '200', '200', '200', '500']; // Mostly success

    // Random number of "requests" to simulate effectively per scrape
    const additionalRequests = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < additionalRequests; i++) {
        const route = routes[Math.floor(Math.random() * routes.length)];
        const method = methods[Math.floor(Math.random() * methods.length)];
        const code = codes[Math.floor(Math.random() * codes.length)];
        const duration = Math.random() * 1.5; // up to 1.5s

        httpRequestDurationMicroseconds.observe({ method, route, code }, duration);
    }
}

export async function GET(req: NextRequest) {
    try {
        simulateTraffic();
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
