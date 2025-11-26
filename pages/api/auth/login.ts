import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminByUsername } from '../../../lib/db';
import { signToken } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Missing credentials' });
    }

    const admin = await getAdminByUsername(username);

    if (!admin) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({ id: admin.id, username: admin.username });

    res.status(200).json({ token });
}
