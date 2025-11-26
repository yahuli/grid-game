import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig, updateConfig } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        // For now, return specific known configs or all if we implemented getAllConfigs
        // Since we don't have getAllConfigs, let's just return the ones we know
        const defaultShapes = await getConfig('default_shapes');
        const defaultConfig = await getConfig('default_config');
        return res.status(200).json({
            default_shapes: defaultShapes,
            default_config: defaultConfig
        });
    }

    if (req.method === 'POST') {
        const { key, value } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ message: 'Missing key or value' });
        }
        await updateConfig(key, value);
        return res.status(200).json({ message: 'Config updated' });
    }

    res.status(405).json({ message: 'Method not allowed' });
}
