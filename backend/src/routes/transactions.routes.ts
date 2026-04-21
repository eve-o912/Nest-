import { Router } from 'express';
import { transactionsService } from '../services/transactions.service';
import { authMiddleware, requireCashierOrOwner } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { createTransactionSchema } from '../utils/validation';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require authentication and cashier/owner role
router.use(authMiddleware);
router.use(requireCashierOrOwner);

// Validation schemas
const lockTransactionSchema = z.object({
    transactionId: z.string().uuid()
});

const voidTransactionSchema = z.object({
    reason: z.string().min(3).max(500)
});

const listTransactionsSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    cashierId: z.string().uuid().optional(),
    status: z.enum(['draft', 'locked', 'voided']).optional(),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0)
});

// POST /businesses/:id/transactions - Create new transaction (draft)
router.post('/businesses/:id/transactions', validateBody(createTransactionSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const cashierId = req.user!.userId;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const transaction = await transactionsService.createTransaction(
            businessId,
            cashierId,
            req.body
        );
        
        res.status(201).json({
            success: true,
            data: { transaction },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// POST /businesses/:id/transactions/:tid/lock - Lock transaction and generate receipt
router.post('/businesses/:id/transactions/:tid/lock', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const transactionId = req.params.tid;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const receiptBaseUrl = process.env.RECEIPT_BASE_URL || 'https://receipt.nest.app';
        
        const { transaction, receipt } = await transactionsService.lockTransaction(
            transactionId,
            businessId,
            receiptBaseUrl
        );
        
        res.json({
            success: true,
            data: { transaction, receipt },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/transactions - List transactions
router.get('/businesses/:id/transactions', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const { startDate, endDate, cashierId, status, limit, offset } = req.query;
        
        const options: any = {};
        if (startDate) options.startDate = startDate;
        if (endDate) options.endDate = endDate;
        if (cashierId) options.cashierId = cashierId;
        if (status) options.status = status;
        if (limit) options.limit = parseInt(limit as string, 10);
        if (offset) options.offset = parseInt(offset as string, 10);
        
        const result = await transactionsService.listTransactions(businessId, options);
        
        res.json({
            success: true,
            data: result,
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/transactions/:tid - Get transaction details
router.get('/businesses/:id/transactions/:tid', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const transactionId = req.params.tid;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const result = await transactionsService.getTransactionWithItems(transactionId, businessId);
        
        if (!result) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Transaction not found' }
            });
            return;
        }
        
        res.json({
            success: true,
            data: result,
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// POST /businesses/:id/transactions/:tid/void - Void transaction
router.post('/businesses/:id/transactions/:tid/void', validateBody(voidTransactionSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const transactionId = req.params.tid;
        const voidedBy = req.user!.userId;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        // Only owners can void transactions
        if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only owners can void transactions' }
            });
            return;
        }
        
        const transaction = await transactionsService.voidTransaction(
            transactionId,
            businessId,
            voidedBy,
            req.body.reason
        );
        
        res.json({
            success: true,
            data: { transaction },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
