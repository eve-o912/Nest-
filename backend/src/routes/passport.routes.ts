import { Router } from 'express';
import { passportService } from '../services/passport.service';
import { authMiddleware, requireOwner } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authMiddleware);

const shareSchema = z.object({
    lenderName: z.string().min(1),
    lenderCode: z.string().optional(),
    consentDurationDays: z.number().int().min(1).max(90).default(30)
});

// GET /businesses/:id/passport - Get financial passport
router.get('/businesses/:id/passport', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const passport = await passportService.getPassport(businessId);
        res.json({ success: true, data: { passport }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// POST /businesses/:id/passport/calculate - Calculate/update passport
router.post('/businesses/:id/passport/calculate', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const passport = await passportService.calculatePassport(businessId, req.user!.userId);
        res.json({ success: true, data: { passport }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// POST /businesses/:id/passport/share - Share passport
router.post('/businesses/:id/passport/share', requireOwner, validateBody(shareSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const share = await passportService.sharePassport(
            businessId,
            req.user!.userId,
            req.body.lenderName,
            req.body.lenderCode,
            req.body.consentDurationDays
        );
        res.json({ success: true, data: { share }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// GET /businesses/:id/passport/shares - Get share history
router.get('/businesses/:id/passport/shares', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const passport = await passportService.getPassport(businessId);
        if (!passport) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Passport not found' }});
            return;
        }
        
        const shares = await passportService.getShareHistory(passport.id);
        res.json({ success: true, data: { shares }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// POST /passport-shares/:sid/revoke - Revoke share
router.post('/passport-shares/:sid/revoke', requireOwner, async (req, res, next) => {
    try {
        const shareId = req.params.sid;
        await passportService.revokeShare(shareId, req.user!.userId);
        res.json({ success: true, data: { message: 'Share revoked' }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

export default router;
