import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminByUsername, changeAdminPassword } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    const decoded = token ? verifyToken(token) : null;

    if (!token || !decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    // Verify old password
    // @ts-ignore
    const admin = await getAdminByUsername(decoded.username);
    if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
    }

    const isValid = await bcrypt.compare(oldPassword, admin.password_hash);
    if (!isValid) {
        return res.status(401).json({ message: 'Invalid old password' });
    }

    // Change password
    await changeAdminPassword(admin.id, newPassword);

    res.status(200).json({ message: 'Password changed' });
}
