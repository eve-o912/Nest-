import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err: unknown) {
            if (err instanceof ZodError) {
                const issues = err.issues.map((issue: { path: (string | number)[]; message: string }) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }));
                
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid request data',
                        details: issues
                    }
                });
                return;
            }
            
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request data' }
            });
        }
    };
}

export function validateParams(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.params = schema.parse(req.params);
            next();
        } catch (err: unknown) {
            if (err instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid URL parameters',
                        details: err.issues.map((i: { path: (string | number)[]; message: string }) => ({ field: i.path.join('.'), message: i.message }))
                    }
                });
                return;
            }
            next(err);
        }
    };
}

export function validateQuery(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (err: unknown) {
            if (err instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid query parameters',
                        details: err.issues.map((i: { path: (string | number)[]; message: string }) => ({ field: i.path.join('.'), message: i.message }))
                    }
                });
                return;
            }
            next(err);
        }
    };
}
