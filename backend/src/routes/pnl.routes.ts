import { Router } from 'express';
import { pnlService } from '../services/pnl.service';
import { authMiddleware, requireOwner } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authMiddleware);

const dateRangeSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const reconcileSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cashActual: z.number().int().min(0)
});

// GET /businesses/:id/pnl - Get P&L for date range
router.get('/businesses/:id/pnl', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const { startDate, endDate } = req.query;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        if (!startDate || !endDate) {
            res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'startDate and endDate required' }});
            return;
        }
        
        const pnl = await pnlService.getDailyPnL(businessId, startDate as string, endDate as string);
        res.json({ success: true, data: { pnl }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// GET /businesses/:id/pnl/summary - Get summary
router.get('/businesses/:id/pnl/summary', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const { startDate, endDate } = req.query;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        if (!startDate || !endDate) {
            res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'startDate and endDate required' }});
            return;
        }
        
        const summary = await pnlService.getSummary(businessId, startDate as string, endDate as string);
        res.json({ success: true, data: summary, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// GET /businesses/:id/pnl/trends - Get trends
router.get('/businesses/:id/pnl/trends', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const { days } = req.query;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const trends = await pnlService.getTrends(businessId, days ? parseInt(days as string, 10) : 30);
        res.json({ success: true, data: { trends }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// GET /businesses/:id/pnl/today - Get today's P&L
router.get('/businesses/:id/pnl/today', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const result = await pnlService.getTodayPnL(businessId);
        res.json({ success: true, data: result, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// POST /businesses/:id/pnl/reconcile - Reconcile day
router.post('/businesses/:id/pnl/reconcile', requireOwner, validateBody(reconcileSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const pnl = await pnlService.reconcileDay(businessId, req.body.date, req.body.cashActual, req.user!.userId);
        res.json({ success: true, data: { pnl }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

export default router;
