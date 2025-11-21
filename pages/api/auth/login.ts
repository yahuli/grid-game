import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { uuid } = req.body;

    if (!uuid) {
        return res.status(400).json({ message: 'UUID is required' });
    }

    try {
        const db = await getDb();
        const now = Date.now();

        const player = await db.get('SELECT * FROM players WHERE uuid = ?', uuid);

        if (player) {
            await db.run('UPDATE players SET last_login = ? WHERE uuid = ?', now, uuid);
            res.status(200).json({ message: 'Login successful', isNew: false });
        } else {
            await db.run('INSERT INTO players (uuid, last_login, created_at) VALUES (?, ?, ?)', uuid, now, now);
            res.status(201).json({ message: 'Player created', isNew: true });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
