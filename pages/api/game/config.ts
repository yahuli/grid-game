import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const db = await getDb();
        const config = await db.get('SELECT value FROM game_config WHERE key = ?', 'default_config');

        if (config) {
            res.status(200).json(JSON.parse(config.value));
        } else {
            res.status(404).json({ message: 'Config not found' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
