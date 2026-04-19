import crypto from 'crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

// Hash financial records (SHA-256)
export function hashFinancialRecord(data: object): string {
    const sorted = Object.keys(data).sort().reduce((acc, key) => {
        acc[key] = (data as any)[key];
        return acc;
    }, {} as any);
    
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(sorted))
        .digest('hex');
}

// Verify financial record hash
export function verifyFinancialHash(data: object, hash: string): boolean {
    return hashFinancialRecord(data) === hash;
}

// Hash passwords and tokens
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, SALT_ROUNDS);
}

export async function verifyToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
}

// AES-256 encryption for sensitive data
export function encrypt(text: string): string {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
        throw new Error('Invalid encryption key');
    }
    
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
        throw new Error('Invalid encryption key');
    }
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

export function generateReceiptToken(): string {
    return crypto.randomBytes(32).toString('base64url');
}

// HMAC for webhook verification
export function generateHmac(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyHmac(payload: string, signature: string, secret: string): boolean {
    const expected = generateHmac(payload, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    );
}
