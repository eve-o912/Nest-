import { Router } from 'express';
import { savingsService } from '../services/savings.service';
import { authMiddleware, requireOwner } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authMiddleware);

const depositSchema = z.object({
    amount: z.number().int().positive(),
    notes: z.string().optional()
});

const withdrawSchema = z.object({
    amount: z.number().int().positive(),
    reason: z.string().optional()
});

const updateRateSchema = z.object({
    rate: z.number().int().min(0).max(50)
});

const updateGoalSchema = z.object({
    goalAmount: z.number().int().min(0)
});

// GET /businesses/:id/savings - Get wallet with history
router.get('/businesses/:id/savings', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const result = await savingsService.getWalletWithHistory(businessId);
        res.json({ success: true, data: result, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// POST /businesses/:id/savings/deposit - Manual deposit
router.post('/businesses/:id/savings/deposit', requireOwner, validateBody(depositSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const result = await savingsService.manualDeposit(businessId, req.body.amount, req.body.notes);
        res.json({ success: true, data: result, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// POST /businesses/:id/savings/withdraw - Withdraw
router.post('/businesses/:id/savings/withdraw', requireOwner, validateBody(withdrawSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const result = await savingsService.withdraw(businessId, { amount: req.body.amount, reason: req.body.reason });
        res.json({ success: true, data: result, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// PUT /businesses/:id/savings/rate - Update auto-save rate
router.put('/businesses/:id/savings/rate', requireOwner, validateBody(updateRateSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const wallet = await savingsService.updateAutoSaveRate(businessId, req.body.rate);
        res.json({ success: true, data: { wallet }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// PUT /businesses/:id/savings/goal - Update savings goal
router.put('/businesses/:id/savings/goal', requireOwner, validateBody(updateGoalSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const wallet = await savingsService.updateGoal(businessId, req.body.goalAmount);
        res.json({ success: true, data: { wallet }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

export default router;
