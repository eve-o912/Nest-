import { Router } from 'express';
import { z } from 'zod';
import { businessService } from '../services/business.service';
import { validateBody } from '../middleware/validation.middleware';
import { authMiddleware, requireOwner } from '../middleware/auth.middleware';
import { createBusinessSchema, updateBusinessSchema, inviteCashierSchema, uuidSchema } from '../utils/validation';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /businesses - Create new business (onboarding step 2)
router.post('/', validateBody(createBusinessSchema), async (req, res, next) => {
    try {
        const business = await businessService.createBusiness(req.user!.userId, req.body);
        res.status(201).json({
            success: true,
            data: { business },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id - Get business profile
router.get('/:id', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        
        // Verify ownership
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied' }
            });
            return;
        }
        
        const business = await businessService.getBusiness(businessId);
        res.json({
            success: true,
            data: { business },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// PUT /businesses/:id - Update business settings
router.put('/:id', requireOwner, validateBody(updateBusinessSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied' }
            });
            return;
        }
        
        const business = await businessService.updateBusiness(businessId, req.body);
        res.json({
            success: true,
            data: { business },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// POST /businesses/:id/invite - Invite cashier by phone
router.post('/:id/invite', requireOwner, validateBody(inviteCashierSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied' }
            });
            return;
        }
        
        const invitation = await businessService.inviteCashier(businessId, req.user!.userId, req.body);
        res.status(201).json({
            success: true,
            data: { invitation },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// PUT /businesses/:id/users/:uid - Update team member
router.put('/:id/users/:uid', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const userId = req.params.uid;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied' }
            });
            return;
        }
        
        const updates: any = {};
        if (req.body.role) updates.role = req.body.role;
        if (req.body.isActive !== undefined) {
            updates.isActive = req.body.isActive;
            updates.restrictReason = req.body.restrictReason;
        }
        
        const member = await businessService.updateTeamMember(businessId, userId, updates);
        res.json({
            success: true,
            data: { member },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/team - Get team members
router.get('/:id/team', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied' }
            });
            return;
        }
        
        const team = await businessService.getTeam(businessId);
        res.json({
            success: true,
            data: { team },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/team/:uid/history - Get cashier history
router.get('/:id/team/:uid/history', requireOwner, async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const cashierId = req.params.uid;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied' }
            });
            return;
        }
        
        const history = await businessService.getCashierHistory(businessId, cashierId);
        res.json({
            success: true,
            data: history,
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
