import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt';
import { db } from '../db/connection';

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload & { phone?: string };
        }
    }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
            return;
        }
        
        const token = authHeader.substring(7);
        const payload = verifyAccessToken(token);
        
        // Verify user still exists and is active
        const userResult = await db.query(
            'SELECT phone, is_active FROM users WHERE id = $1',
            [payload.userId]
        );
        
        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'User not found or deactivated' }
            });
            return;
        }
        
        req.user = {
            ...payload,
            phone: userResult.rows[0].phone
        };
        
        next();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid token';
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message }
        });
    }
}

// Role-based access control
export function requireRole(...roles: Array<'owner' | 'cashier' | 'admin'>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
            return;
        }
        
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
            });
            return;
        }
        
        next();
    };
}

// Owner-only middleware
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
    }
    
    if (req.user.role !== 'owner') {
        res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Owner access required' }
        });
        return;
    }
    
    next();
}

// Cashier-or-owner middleware
export function requireCashierOrOwner(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
    }
    
    if (!['owner', 'cashier'].includes(req.user.role)) {
        res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Cashier access required' }
        });
        return;
    }
    
    next();
}
