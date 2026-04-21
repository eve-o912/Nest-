import { Router } from 'express';
import { expensesService } from '../services/expenses.service';
import { authMiddleware, requireCashierOrOwner } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { createExpenseSchema } from '../utils/validation';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require authentication and cashier/owner role
router.use(authMiddleware);
router.use(requireCashierOrOwner);

// Validation schemas
const listExpensesSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    category: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0)
});

const updateExpenseSchema = z.object({
    category: z.string().min(1).optional(),
    amount: z.number().int().min(0).optional(),
    description: z.string().optional(),
    expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.enum(['daily', 'weekly', 'monthly']).optional()
});

// GET /businesses/:id/expenses - List expenses
router.get('/businesses/:id/expenses', async (req, res, next) => {
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
        
        const { startDate, endDate, category, limit, offset } = req.query;
        
        const options: any = {};
        if (startDate) options.startDate = startDate;
        if (endDate) options.endDate = endDate;
        if (category) options.category = category;
        if (limit) options.limit = parseInt(limit as string, 10);
        if (offset) options.offset = parseInt(offset as string, 10);
        
        const result = await expensesService.listExpenses(businessId, options);
        
        res.json({
            success: true,
            data: result,
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// POST /businesses/:id/expenses - Create new expense
router.post('/businesses/:id/expenses', validateBody(createExpenseSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const recordedBy = req.user!.userId;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const expense = await expensesService.createExpense(businessId, recordedBy, req.body);
        
        res.status(201).json({
            success: true,
            data: { expense },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/expenses/categories - Get expense categories
router.get('/businesses/:id/expenses/categories', async (req, res, next) => {
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
        
        const categories = await expensesService.getCategories(businessId);
        
        res.json({
            success: true,
            data: { categories },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/expenses/summary - Get expense summary
router.get('/businesses/:id/expenses/summary', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const { startDate, endDate } = req.query;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        if (!startDate || !endDate) {
            res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'startDate and endDate are required' }
            });
            return;
        }
        
        const summary = await expensesService.getExpenseSummary(
            businessId,
            startDate as string,
            endDate as string
        );
        
        res.json({
            success: true,
            data: summary,
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/expenses/:eid - Get expense details
router.get('/businesses/:id/expenses/:eid', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const expenseId = req.params.eid;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const expense = await expensesService.getExpense(expenseId, businessId);
        
        if (!expense) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Expense not found' }
            });
            return;
        }
        
        res.json({
            success: true,
            data: { expense },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// PUT /businesses/:id/expenses/:eid - Update expense
router.put('/businesses/:id/expenses/:eid', validateBody(updateExpenseSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const expenseId = req.params.eid;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const expense = await expensesService.updateExpense(expenseId, businessId, req.body);
        
        res.json({
            success: true,
            data: { expense },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /businesses/:id/expenses/:eid - Delete expense
router.delete('/businesses/:id/expenses/:eid', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const expenseId = req.params.eid;
        
        // Verify user belongs to this business
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        // Only owners can delete expenses
        if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only owners can delete expenses' }
            });
            return;
        }
        
        await expensesService.deleteExpense(expenseId, businessId);
        
        res.json({
            success: true,
            data: { message: 'Expense deleted successfully' },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
