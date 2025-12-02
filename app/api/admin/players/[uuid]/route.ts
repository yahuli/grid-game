import { deletePlayer } from '../../../../../lib/db';
import { verifyToken } from '../../../../../lib/auth';

async function authenticate(request: Request) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token || !(await verifyToken(token))) {
        return false;
    }
    return true;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ uuid: string }> }) {
    if (!(await authenticate(request))) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { uuid } = await params;
        if (!uuid) {
            return Response.json({ message: 'Missing UUID' }, { status: 400 });
        }

        await deletePlayer(uuid);
        return Response.json({ message: 'Player deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete player error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
