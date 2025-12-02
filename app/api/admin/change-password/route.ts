import { getAdminByUsername, changeAdminPassword } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';

async function authenticate(request: Request) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return null;
    }

    return verifyToken(token);
}

export async function POST(request: Request) {
    const decoded = await authenticate(request);

    if (!decoded) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { oldPassword, newPassword } = await request.json();

        if (!oldPassword || !newPassword) {
            return Response.json({ message: 'Missing fields' }, { status: 400 });
        }

        // Verify old password
        if (typeof decoded === 'string' || !decoded.username) {
            return Response.json({ message: 'Invalid token' }, { status: 401 });
        }

        const admin = await getAdminByUsername(decoded.username as string);
        if (!admin) {
            return Response.json({ message: 'Admin not found' }, { status: 404 });
        }

        const isValid = await bcrypt.compare(oldPassword, admin.password_hash);
        if (!isValid) {
            return Response.json({ message: 'Invalid old password' }, { status: 401 });
        }

        // Change password
        await changeAdminPassword(admin.id, newPassword);

        return Response.json({ message: 'Password changed' }, { status: 200 });
    } catch (error) {
        console.error('Change password error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
