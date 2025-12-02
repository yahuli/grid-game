import { getAdminByUsername } from '../../../../lib/db';
import { signToken } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
        }

        const admin = await getAdminByUsername(username);

        if (!admin) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, admin.password_hash);

        if (!isValid) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        const token = await signToken({ id: admin.id, username: admin.username });

        return NextResponse.json({ success: true, token }, { status: 200 });
    } catch (error) {
        console.error('Admin login error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
