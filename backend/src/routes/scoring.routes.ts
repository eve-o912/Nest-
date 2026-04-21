import { Router } from 'express';
import { scoringService } from '../services/scoring.service';
import { authMiddleware, requireOwner } from '../middleware/auth.middleware';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authMiddleware);

// GET /businesses/:id/scores - Get all cashier scores
router.get('/businesses/:id/scores', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const scores = await scoringService.getBusinessScores(businessId);
        res.json({ success: true, data: { scores }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// POST /businesses/:id/cashiers/:cid/scores/calculate - Calculate score
router.post('/businesses/:id/cashiers/:cid/scores/calculate', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const cashierId = req.params.cid;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const score = await scoringService.calculateCashierScore(businessId, cashierId);
        res.json({ success: true, data: { score }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

// GET /businesses/:id/cashiers/:cid/scores/history - Get score history
router.get('/businesses/:id/cashiers/:cid/scores/history', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const cashierId = req.params.cid;
        const { limit } = req.query;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }});
            return;
        }
        
        const history = await scoringService.getScoreHistory(businessId, cashierId, limit ? parseInt(limit as string, 10) : 12);
        res.json({ success: true, data: { history }, meta: { request_id: uuidv4() }});
    } catch (error) { next(error); }
});

export default router;
