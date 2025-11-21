import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { uuid } = req.query;

    if (!uuid || typeof uuid !== 'string') {
        return res.status(400).json({ message: 'UUID is required' });
    }

    try {
        const db = await getDb();
        const games = await db.all(
            `SELECT * FROM games 
       WHERE (host_uuid = ? OR guest_uuid = ?) AND state != 'GAMEOVER'
       ORDER BY created_at DESC LIMIT 10`,
            uuid, uuid
        );

        res.status(200).json({ games });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
