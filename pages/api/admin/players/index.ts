import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllPlayers } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        const players = await getAllPlayers();
        return res.status(200).json(players);
    }

    res.status(405).json({ message: 'Method not allowed' });
}
