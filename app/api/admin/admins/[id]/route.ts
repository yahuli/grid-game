import { deleteAdmin } from '../../../../../lib/db';
import { verifyToken } from '../../../../../lib/auth';

async function authenticate(request: Request) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token || !(await verifyToken(token))) {
        return false;
    }
    return true;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await authenticate(request))) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        if (!id) {
            return Response.json({ message: 'Missing ID' }, { status: 400 });
        }

        await deleteAdmin(Number(id));
        return Response.json({ message: 'Admin deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete admin error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
