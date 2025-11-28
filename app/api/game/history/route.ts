import { getDb } from '../../../../lib/db';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const uuid = url.searchParams.get('uuid');
    
    if (!uuid) {
        return Response.json({ message: 'UUID is required' }, { status: 400 });
    }
    
    try {
        const db = await getDb();
        
        const games = await db.all(
            `SELECT * FROM games 
       WHERE (host_uuid = ? OR guest_uuid = ?) AND state != 'GAMEOVER'
       ORDER BY created_at DESC LIMIT 10`,
            uuid, uuid
        );
        
        return Response.json({ games }, { status: 200 });
    } catch (error) {
        console.error('Database error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
