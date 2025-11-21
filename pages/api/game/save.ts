import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { roomId, host, guest, state, boardState, placedMines, placedImages, hostShapes, guestShapes, winner } = req.body;

    try {
        const db = await getDb();
        const now = Date.now();

        // Check if game exists for this room
        const existingGame = await db.get('SELECT id FROM games WHERE room_id = ?', roomId);

        if (existingGame) {
            await db.run(
                `UPDATE games SET 
             host_uuid = ?, guest_uuid = ?, state = ?, 
             board_state = ?, placed_mines = ?, placed_images = ?, host_shapes = ?, guest_shapes = ?, 
             winner = ?, updated_at = ?
             WHERE room_id = ?`,
                host, guest, state,
                JSON.stringify(boardState), JSON.stringify(placedMines), JSON.stringify(placedImages || []),
                JSON.stringify(hostShapes), JSON.stringify(guestShapes),
                winner, now, roomId
            );
            res.status(200).json({ message: 'Game updated', gameId: existingGame.id });
        } else {
            const id = uuidv4();
            await db.run(
                `INSERT INTO games (id, room_id, host_uuid, guest_uuid, state, board_state, placed_mines, placed_images, host_shapes, guest_shapes, winner, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                id, roomId, host, guest, state,
                JSON.stringify(boardState), JSON.stringify(placedMines), JSON.stringify(placedImages || []),
                JSON.stringify(hostShapes), JSON.stringify(guestShapes),
                winner, now, now
            );
            res.status(200).json({ message: 'Game created', gameId: id });
        }

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
