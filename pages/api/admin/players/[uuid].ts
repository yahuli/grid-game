import type { NextApiRequest, NextApiResponse } from 'next';
import { deletePlayer } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'DELETE') {
        const { uuid } = req.query;
        if (!uuid) return res.status(400).json({ message: 'Missing UUID' });

        await deletePlayer(String(uuid));
        return res.status(200).json({ message: 'Player deleted' });
    }

    res.status(405).json({ message: 'Method not allowed' });
}
