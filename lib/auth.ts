import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-this';

export function signToken(payload: object) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (e) {
        return null;
    }
}
