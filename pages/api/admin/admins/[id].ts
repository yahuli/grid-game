import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteAdmin } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ message: 'Missing ID' });

        await deleteAdmin(Number(id));
        return res.status(200).json({ message: 'Admin deleted' });
    }

    res.status(405).json({ message: 'Method not allowed' });
}
