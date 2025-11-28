import { getAllAdmins, createAdmin } from '../../../../lib/db';
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
        const admins = await getAllAdmins();
        return Response.json(admins, { status: 200 });
    } catch (error) {
        console.error('Admins error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!(await authenticate(request))) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const { username, password } = await request.json();
        
        if (!username || !password) {
            return Response.json({ message: 'Missing fields' }, { status: 400 });
        }
        
        const success = await createAdmin(username, password);
        
        if (success) {
            return Response.json({ message: 'Admin created' }, { status: 201 });
        } else {
            return Response.json({ message: 'Failed to create admin (username might exist)' }, { status: 400 });
        }
    } catch (error) {
        console.error('Create admin error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
