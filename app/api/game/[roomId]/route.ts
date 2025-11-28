import { getDb } from '../../../../lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = await params;
    
    if (!roomId) {
        return Response.json({ message: 'Room ID is required' }, { status: 400 });
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
            return Response.json(game, { status: 200 });
        } else {
            return Response.json({ message: 'Game not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Database error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
