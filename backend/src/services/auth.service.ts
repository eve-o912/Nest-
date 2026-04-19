import axios from 'axios';
import { db } from '../db/connection';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { hashToken, verifyToken, generateSecureToken } from '../utils/crypto';
import type { SendOtpInput, VerifyOtpInput } from '../utils/validation';

const AT_API_KEY = process.env.AT_API_KEY || '';
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_SENDER = process.env.AT_SENDER || 'NEST';

// Africa's Talking API
const atAxios = axios.create({
    baseURL: 'https://api.africastalking.com/version1',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_API_KEY
    },
    auth: {
        username: AT_USERNAME,
        password: AT_API_KEY
    }
});

export class AuthService {
    // Send OTP via Africa's Talking
    async sendOtp(input: SendOtpInput): Promise<{ success: boolean; message: string }> {
        const { phone } = input;
        
        // Rate limit: max 5 OTPs per hour per phone
        const recentOtps = await db.query(
            `SELECT COUNT(*) FROM otp_records 
             WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
            [phone]
        );
        
        if (parseInt(recentOtps.rows[0].count) >= 5) {
            return { success: false, message: 'Too many OTP requests. Please try again in an hour.' };
        }
        
        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await hashToken(code);
        
        // Store OTP record
        await db.query(
            `INSERT INTO otp_records (phone, code_hash, expires_at) 
             VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
            [phone, codeHash]
        );
        
        // Send via Africa's Talking
        try {
            const message = `Your Nest verification code is: ${code}. Valid for 5 minutes. Never share this code.`;
            
            await atAxios.post('/messaging', {
                username: AT_USERNAME,
                to: phone,
                message: message,
                from: AT_SENDER
            });
            
            return { success: true, message: 'OTP sent successfully' };
        } catch (error) {
            console.error('Failed to send OTP:', error);
            return { success: false, message: 'Failed to send OTP. Please try again.' };
        }
    }
    
    // Verify OTP and authenticate user
    async verifyOtp(input: VerifyOtpInput): Promise<{
        success: boolean;
        tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
        user?: any;
        isNewUser?: boolean;
        message?: string;
    }> {
        const { phone, code } = input;
        
        // Find valid OTP record
        const otpResult = await db.query(
            `SELECT * FROM otp_records 
             WHERE phone = $1 AND verified_at IS NULL AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [phone]
        );
        
        if (otpResult.rows.length === 0) {
            return { success: false, message: 'Invalid or expired OTP' };
        }
        
        const otpRecord = otpResult.rows[0];
        
        // Check attempts
        if (otpRecord.attempts >= otpRecord.max_attempts) {
            return { success: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
        }
        
        // Verify code
        const isValid = await verifyToken(code, otpRecord.code_hash);
        
        if (!isValid) {
            await db.query(
                'UPDATE otp_records SET attempts = attempts + 1 WHERE id = $1',
                [otpRecord.id]
            );
            return { success: false, message: 'Invalid OTP code' };
        }
        
        // Mark OTP as verified
        await db.query(
            'UPDATE otp_records SET verified_at = NOW() WHERE id = $1',
            [otpRecord.id]
        );
        
        // Find or create user
        let userResult = await db.query(
            'SELECT * FROM users WHERE phone = $1',
            [phone]
        );
        
        let user = userResult.rows[0];
        let isNewUser = false;
        
        if (!user) {
            // Create new user
            const newUser = await db.query(
                `INSERT INTO users (phone, is_verified, preferred_language) 
                 VALUES ($1, true, 'en') RETURNING *`,
                [phone]
            );
            user = newUser.rows[0];
            isNewUser = true;
        } else {
            // Update last login and verified status
            await db.query(
                'UPDATE users SET is_verified = true, last_login_at = NOW() WHERE id = $1',
                [user.id]
            );
        }
        
        if (!user.is_active) {
            return { success: false, message: 'Account has been deactivated' };
        }
        
        // Get user's business and role
        let businessId: string | undefined;
        let role: 'owner' | 'cashier' = 'owner';
        
        const businessUserResult = await db.query(
            `SELECT bu.*, b.id as business_id 
             FROM business_users bu
             JOIN businesses b ON bu.business_id = b.id
             WHERE bu.user_id = $1 AND bu.is_active = true AND b.is_active = true
             ORDER BY bu.role = 'owner' DESC
             LIMIT 1`,
            [user.id]
        );
        
        if (businessUserResult.rows.length > 0) {
            businessId = businessUserResult.rows[0].business_id;
            role = businessUserResult.rows[0].role;
        } else if (!isNewUser) {
            // User exists but has no business - they're an owner without setup
            role = 'owner';
        }
        
        // Generate tokens
        const tokens = generateTokens({
            userId: user.id,
            businessId,
            role
        });
        
        // Store session with refresh token hash
        const refreshTokenHash = await hashToken(tokens.refreshToken);
        await db.query(
            `INSERT INTO sessions (user_id, refresh_token_hash, expires_at) 
             VALUES ($1, $2, NOW() + INTERVAL '${process.env.JWT_REFRESH_EXPIRY || '30'} days')`,
            [user.id, refreshTokenHash]
        );
        
        return {
            success: true,
            tokens,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role,
                businessId,
                preferredLanguage: user.preferred_language,
                isNewUser
            },
            isNewUser
        };
    }
    
    // Refresh access token
    async refreshAccessToken(refreshToken: string): Promise<{
        success: boolean;
        tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
        message?: string;
    }> {
        try {
            const { userId, sessionId } = verifyRefreshToken(refreshToken);
            
            // Verify session exists and is active
            const sessionResult = await db.query(
                `SELECT s.*, u.is_active as user_active
                 FROM sessions s
                 JOIN users u ON s.user_id = u.id
                 WHERE s.id = $1 AND s.is_active = true AND s.expires_at > NOW()`,
                [sessionId]
            );
            
            if (sessionResult.rows.length === 0) {
                return { success: false, message: 'Invalid or expired session' };
            }
            
            const session = sessionResult.rows[0];
            
            if (!session.user_active) {
                return { success: false, message: 'User account deactivated' };
            }
            
            // Verify refresh token hash
            const isValid = await verifyToken(refreshToken, session.refresh_token_hash);
            if (!isValid) {
                // Potential token theft - invalidate session
                await db.query('UPDATE sessions SET is_active = false WHERE id = $1', [sessionId]);
                return { success: false, message: 'Invalid refresh token' };
            }
            
            // Get user's current role and business
            let businessId: string | undefined;
            let role: 'owner' | 'cashier' = 'owner';
            
            const businessUserResult = await db.query(
                `SELECT bu.*, b.id as business_id 
                 FROM business_users bu
                 JOIN businesses b ON bu.business_id = b.id
                 WHERE bu.user_id = $1 AND bu.is_active = true AND b.is_active = true
                 ORDER BY bu.role = 'owner' DESC
                 LIMIT 1`,
                [userId]
            );
            
            if (businessUserResult.rows.length > 0) {
                businessId = businessUserResult.rows[0].business_id;
                role = businessUserResult.rows[0].role;
            }
            
            // Generate new tokens
            const tokens = generateTokens({ userId, businessId, role });
            
            // Update session with new refresh token
            const newRefreshHash = await hashToken(tokens.refreshToken);
            await db.query(
                'UPDATE sessions SET refresh_token_hash = $1, last_used_at = NOW() WHERE id = $2',
                [newRefreshHash, sessionId]
            );
            
            return { success: true, tokens };
        } catch (error) {
            return { success: false, message: 'Invalid refresh token' };
        }
    }
    
    // Logout - revoke session
    async logout(refreshToken: string): Promise<{ success: boolean }> {
        try {
            const { sessionId } = verifyRefreshToken(refreshToken);
            await db.query('UPDATE sessions SET is_active = false WHERE id = $1', [sessionId]);
            return { success: true };
        } catch {
            return { success: false };
        }
    }
}

export const authService = new AuthService();
