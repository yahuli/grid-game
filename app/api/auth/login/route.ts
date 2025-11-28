import { getDb } from '../../../../lib/db';

export async function POST(request: Request) {
    try {
        const { uuid } = await request.json();
        
        if (!uuid) {
            return Response.json({ message: 'UUID is required' }, { status: 400 });
        }
        
        const db = await getDb();
        const now = Date.now();
        
        // Check if player exists
        const existingPlayer = await db.get('SELECT * FROM players WHERE uuid = ?', uuid);
        
        if (existingPlayer) {
            // Update last login time
            await db.run('UPDATE players SET last_login = ? WHERE uuid = ?', now, uuid);
        } else {
            // Create new player
            await db.run('INSERT INTO players (uuid, last_login, created_at) VALUES (?, ?, ?)', uuid, now, now);
        }
        
        return Response.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Login error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
