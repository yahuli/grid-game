import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
    // Only run on /api/admin/*
    if (request.nextUrl.pathname.startsWith('/api/admin')) {

        // Exclude login route
        if (request.nextUrl.pathname === '/api/admin/login') {
            return NextResponse.next();
        }

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return NextResponse.json(
                { message: 'Authentication required' },
                { status: 401 }
            );
        }

        const decoded = await verifyToken(token);

        if (!decoded) {
            return NextResponse.json(
                { message: 'Invalid or expired token' },
                { status: 401 }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/admin/:path*',
};
