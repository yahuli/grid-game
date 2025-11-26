import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllAdmins, createAdmin } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        const admins = await getAllAdmins();
        return res.status(200).json(admins);
    }

    if (req.method === 'POST') {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Missing fields' });
        }
        const success = await createAdmin(username, password);
        if (success) {
            return res.status(201).json({ message: 'Admin created' });
        } else {
            return res.status(400).json({ message: 'Failed to create admin (username might exist)' });
        }
    }

    res.status(405).json({ message: 'Method not allowed' });
}
