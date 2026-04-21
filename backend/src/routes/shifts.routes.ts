import { Router } from 'express';
import { shiftsService } from '../services/shifts.service';
import { authMiddleware, requireCashierOrOwner } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authMiddleware);
router.use(requireCashierOrOwner);

const startShiftSchema = z.object({
    startingCash: z.number().int().min(0).optional()
});

const closeShiftSchema = z.object({
    endingCash: z.number().int().min(0)
});

// GET /businesses/:id/shifts/active - Get active shift
router.get('/businesses/:id/shifts/active', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const shift = await shiftsService.getActiveShift(req.user!.userId);
        res.json({ success: true, data: { shift }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// POST /businesses/:id/shifts/start - Start new shift
router.post('/businesses/:id/shifts/start', validateBody(startShiftSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const shift = await shiftsService.startShift(businessId, req.user!.userId, req.body);
        res.status(201).json({ success: true, data: { shift }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// POST /businesses/:id/shifts/:sid/close - Close shift
router.post('/businesses/:id/shifts/:sid/close', validateBody(closeShiftSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const shiftId = req.params.sid;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const result = await shiftsService.closeShift(shiftId, businessId, req.body);
        res.json({ success: true, data: result, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// GET /businesses/:id/shifts - List shifts
router.get('/businesses/:id/shifts', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const { cashierId, startDate, endDate, limit, offset } = req.query;
        const options: any = {};
        if (cashierId) options.cashierId = cashierId;
        if (startDate) options.startDate = startDate;
        if (endDate) options.endDate = endDate;
        if (limit) options.limit = parseInt(limit as string, 10);
        if (offset) options.offset = parseInt(offset as string, 10);
        
        const result = await shiftsService.listShifts(businessId, options);
        res.json({ success: true, data: result, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

export default router;
