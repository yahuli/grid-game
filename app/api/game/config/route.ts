import { getDb } from '../../../../lib/db';

export async function GET(request: Request) {
    try {
        const db = await getDb();
        const config = await db.get('SELECT value FROM game_config WHERE key = ?', 'default_config');

        if (config) {
            return Response.json(JSON.parse(config.value), { status: 200 });
        } else {
            return Response.json({ message: 'Config not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Database error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
