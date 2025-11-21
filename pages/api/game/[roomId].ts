import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { roomId } = req.query;

    if (!roomId || typeof roomId !== 'string') {
        return res.status(400).json({ message: 'Room ID is required' });
    }

    try {
        const db = await getDb();
        const result = await db.get('SELECT * FROM games WHERE room_id = ?', roomId);

        if (result) {
            const game = {
                ...result,
                host: result.host_uuid,
                guest: result.guest_uuid,
                gameState: result.state,
                board: JSON.parse(result.board_state),
                placedMines: JSON.parse(result.placed_mines),
                placedImages: result.placed_images ? JSON.parse(result.placed_images) : [],
                hostShapes: JSON.parse(result.host_shapes),
                guestShapes: JSON.parse(result.guest_shapes),
            };
            res.status(200).json(game);
        } else {
            res.status(404).json({ message: 'Game not found' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
