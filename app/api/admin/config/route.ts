import { getConfig, updateConfig } from '../../../../lib/db';
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
        const defaultShapes = await getConfig('default_shapes');
        const defaultConfig = await getConfig('default_config');
        
        return Response.json({
            default_shapes: defaultShapes,
            default_config: defaultConfig
        }, { status: 200 });
    } catch (error) {
        console.error('Config error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!(await authenticate(request))) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const { key, value } = await request.json();
        
        if (!key || value === undefined) {
            return Response.json({ message: 'Missing key or value' }, { status: 400 });
        }
        
        await updateConfig(key, value);
        return Response.json({ message: 'Config updated' }, { status: 200 });
    } catch (error) {
        console.error('Config update error:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}
