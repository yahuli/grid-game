import { getAllPlayers } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

async function authenticate(request: Request) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token || !verifyToken(token)) {
        return false;
    }
    return true;
}

export async function GET(request: Request) {
    if (!(await authenticate(request))) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const players = await getAllPlayers();
        return Response.json(players, { status: 200 });
    } catch (error) {
        console.error('Players error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
