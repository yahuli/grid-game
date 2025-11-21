import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const imageDir = path.join(process.cwd(), 'public/image');
    try {
        const files = fs.readdirSync(imageDir);
        const images = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file)).map(file => {
            // Extract dimensions from filename
            const match = file.match(/(\d+)[xX](\d+)/);
            const width = match ? parseInt(match[1]) : 1;
            const height = match ? parseInt(match[2]) : 1;
            const shapeMatrix = Array(height).fill(0).map(() => Array(width).fill(1));
            return {
                id: file,
                src: `/image/${file}`,
                width,
                height,
                shape: shapeMatrix
            };
        });
        res.status(200).json(images);
    } catch (error) {
        console.error("Error reading image directory:", error);
        res.status(500).json({ error: 'Failed to list images' });
    }
}
