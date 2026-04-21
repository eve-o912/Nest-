import { Router } from 'express';
import { productsService } from '../services/products.service';
import { authMiddleware, requireCashierOrOwner } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { createProductSchema, updateProductSchema, uuidSchema } from '../utils/validation';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require authentication and cashier/owner role
router.use(authMiddleware);
router.use(requireCashierOrOwner);

// Validation schemas
const receiveStockSchema = z.object({
    quantity: z.number().int().positive(),
    unitCost: z.number().int().min(0).optional()
});

const adjustStockSchema = z.object({
    quantity: z.number().int(),
    reason: z.enum(['damage', 'return', 'correction', 'other']),
    notes: z.string().optional()
});

// GET /businesses/:id/products - List all products
router.get('/businesses/:id/products', async (req, res, next) => {
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
        
        const { isActive, category, lowStock } = req.query;
        
        const products = await productsService.listProducts(businessId, {
            isActive: isActive !== 'false',
            category: category as string | undefined,
            lowStock: lowStock === 'true'
        });
        
        res.json({
            success: true,
            data: { products },
            meta: { request_id: uuidv4(), count: products.length }
        });
    } catch (error) {
        next(error);
    }
});

// POST /businesses/:id/products - Create new product
router.post('/businesses/:id/products', validateBody(createProductSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        
        // Only owners can create products
        if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only owners can create products' }
            });
            return;
        }
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const product = await productsService.createProduct(businessId, req.body);
        
        res.status(201).json({
            success: true,
            data: { product },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/products/search - Search products
router.get('/businesses/:id/products/search', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const { q } = req.query;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        if (!q || typeof q !== 'string') {
            res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'Query parameter q is required' }
            });
            return;
        }
        
        const products = await productsService.searchProducts(businessId, q);
        
        res.json({
            success: true,
            data: { products },
            meta: { request_id: uuidv4(), count: products.length }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/products/low-stock - Get low stock products
router.get('/businesses/:id/products/low-stock', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const products = await productsService.getLowStockProducts(businessId);
        
        res.json({
            success: true,
            data: { products },
            meta: { request_id: uuidv4(), count: products.length }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/products/:pid - Get product details
router.get('/businesses/:id/products/:pid', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const productId = req.params.pid;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const product = await productsService.getProduct(productId, businessId);
        
        if (!product) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Product not found' }
            });
            return;
        }
        
        res.json({
            success: true,
            data: { product },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// PUT /businesses/:id/products/:pid - Update product
router.put('/businesses/:id/products/:pid', validateBody(updateProductSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const productId = req.params.pid;
        
        // Only owners can update products
        if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only owners can update products' }
            });
            return;
        }
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const product = await productsService.updateProduct(productId, businessId, req.body);
        
        res.json({
            success: true,
            data: { product },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /businesses/:id/products/:pid - Soft delete product
router.delete('/businesses/:id/products/:pid', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const productId = req.params.pid;
        
        // Only owners can delete products
        if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only owners can delete products' }
            });
            return;
        }
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        await productsService.deleteProduct(productId, businessId);
        
        res.json({
            success: true,
            data: { message: 'Product deleted successfully' },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// POST /businesses/:id/products/:pid/receive - Receive stock
router.post('/businesses/:id/products/:pid/receive', validateBody(receiveStockSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const productId = req.params.pid;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const { quantity, unitCost } = req.body;
        const product = await productsService.receiveStock(productId, businessId, quantity, unitCost, req.user!.userId);
        
        res.json({
            success: true,
            data: { product },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// POST /businesses/:id/products/:pid/adjust - Adjust stock
router.post('/businesses/:id/products/:pid/adjust', validateBody(adjustStockSchema), async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const productId = req.params.pid;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const { quantity, reason, notes } = req.body;
        const product = await productsService.adjustStock(productId, businessId, quantity, reason, notes || '', req.user!.userId);
        
        res.json({
            success: true,
            data: { product },
            meta: { request_id: uuidv4() }
        });
    } catch (error) {
        next(error);
    }
});

// GET /businesses/:id/products/:pid/history - Get stock history
router.get('/businesses/:id/products/:pid/history', async (req, res, next) => {
    try {
        const businessId = req.params.id;
        const productId = req.params.pid;
        
        if (req.user!.businessId !== businessId && req.user!.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied to this business' }
            });
            return;
        }
        
        const history = await productsService.getStockHistory(productId, businessId);
        
        res.json({
            success: true,
            data: { history },
            meta: { request_id: uuidv4(), count: history.length }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
