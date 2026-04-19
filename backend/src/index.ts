import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import businessRoutes from './routes/business.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS - only allow app.nest.app and receipt.nest.app
const allowedOrigins = [
    'https://app.nest.app',
    'https://receipt.nest.app',
    'http://localhost:3000',
    'http://localhost:8081', // Expo
    'http://localhost:19006', // Expo web
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later' }
        });
    }
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    skipSuccessfulRequests: true
});

// Request ID middleware
app.use((req, res, next) => {
    (req as any).requestId = uuidv4();
    next();
});

// API version prefix
const API_PREFIX = '/api/v1';

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        data: { status: 'healthy', timestamp: new Date().toISOString() }
    });
});

// Apply auth rate limiter to OTP endpoints
app.use(`${API_PREFIX}/auth/otp`, authLimiter);

// Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/businesses`, businessRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
        meta: { request_id: uuidv4() }
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    
    // Don't leak error details in production
    const isDev = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: isDev ? err.message : 'An unexpected error occurred',
            ...(isDev && { stack: err.stack })
        },
        meta: { request_id: (req as any).requestId || uuidv4() }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Nest API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
