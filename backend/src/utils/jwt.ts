import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || '';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRY || '30', 10);

export interface TokenPayload {
    userId: string;
    businessId?: string;
    role: 'owner' | 'cashier' | 'admin';
    sessionId: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export function generateTokens(payload: Omit<TokenPayload, 'sessionId'>): TokenPair {
    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters');
    }
    
    const sessionId = uuidv4();
    const fullPayload: TokenPayload = { ...payload, sessionId };
    
    const accessToken = jwt.sign(fullPayload, JWT_SECRET, {
        expiresIn: ACCESS_EXPIRY,
        issuer: 'nest-api',
        audience: 'nest-app'
    });
    
    const refreshToken = jwt.sign(
        { userId: payload.userId, sessionId, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: `${REFRESH_EXPIRY_DAYS}d` }
    );
    
    // Extract expiry seconds from access token
    const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
    const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
    
    return { accessToken, refreshToken, expiresIn };
}

export function verifyAccessToken(token: string): TokenPayload {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'nest-api',
            audience: 'nest-app'
        }) as TokenPayload;
        
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        }
        throw error;
    }
}

export function verifyRefreshToken(token: string): { userId: string; sessionId: string } {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        
        return { userId: decoded.userId, sessionId: decoded.sessionId };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Refresh token expired');
        }
        throw new Error('Invalid refresh token');
    }
}

export function decodeToken(token: string): TokenPayload | null {
    try {
        return jwt.decode(token) as TokenPayload;
    } catch {
        return null;
    }
}
