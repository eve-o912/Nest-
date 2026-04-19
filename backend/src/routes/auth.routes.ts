import { Router } from 'express';
import { authService } from '../services/auth.service';
import { validateBody } from '../middleware/validation.middleware';
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } from '../utils/validation';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /auth/otp/send - Send OTP to phone
router.post('/otp/send', validateBody(sendOtpSchema), async (req, res, next) => {
    try {
        const result = await authService.sendOtp(req.body);
        res.json({
            success: result.success,
            data: { message: result.message },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/otp/verify - Verify OTP and return tokens
router.post('/otp/verify', validateBody(verifyOtpSchema), async (req, res, next) => {
    try {
        const result = await authService.verifyOtp(req.body);
        
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: { code: 'VERIFICATION_FAILED', message: result.message },
                meta: { request_id: uuidv4() }
            });
            return;
        }
        
        res.json({
            success: true,
            data: {
                tokens: result.tokens,
                user: result.user,
                isNewUser: result.isNewUser
            },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/refresh - Exchange refresh token for new access token
router.post('/refresh', validateBody(refreshTokenSchema), async (req, res, next) => {
    try {
        const result = await authService.refreshAccessToken(req.body.refreshToken);
        
        if (!result.success) {
            res.status(401).json({
                success: false,
                error: { code: 'REFRESH_FAILED', message: result.message },
                meta: { request_id: uuidv4() }
            });
            return;
        }
        
        res.json({
            success: true,
            data: { tokens: result.tokens },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/logout - Revoke session
router.post('/logout', validateBody(refreshTokenSchema), async (req, res, next) => {
    try {
        await authService.logout(req.body.refreshToken);
        res.json({
            success: true,
            data: { message: 'Logged out successfully' },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
