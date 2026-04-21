import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

export interface Product {
    id: string;
    business_id: string;
    name: string;
    description: string | null;
    category: string | null;
    unit: string;
    selling_price: number;
    cost_price: number;
    stock_qty: number;
    reorder_level: number;
    is_active: boolean;
    barcode: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateProductInput {
    name: string;
    description?: string;
    category?: string;
    unit?: string;
    sellingPrice: number;
    costPrice: number;
    stockQty?: number;
    reorderLevel?: number;
    barcode?: string;
}

export interface UpdateProductInput {
    name?: string;
    description?: string;
    category?: string;
    sellingPrice?: number;
    costPrice?: number;
    reorderLevel?: number;
    isActive?: boolean;
}

export interface StockMovementInput {
    productId: string;
    quantity: number;
    movementType: 'sale' | 'receipt' | 'adjustment' | 'damage' | 'return';
    unitCost?: number;
    referenceId?: string;
    referenceType?: string;
    notes?: string;
    createdBy: string;
}

class ProductsService {
    // Create a new product
    async createProduct(businessId: string, input: CreateProductInput): Promise<Product> {
        const id = uuidv4();
        
        const result = await db.query<Product>(
            `INSERT INTO products (
                id, business_id, name, description, category, unit,
                selling_price, cost_price, stock_qty, reorder_level,
                barcode, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())
            RETURNING *`,
            [
                id,
                businessId,
                input.name,
                input.description || null,
                input.category || null,
                input.unit || 'piece',
                input.sellingPrice,
                input.costPrice,
                input.stockQty || 0,
                input.reorderLevel || 10,
                input.barcode || null
            ]
        );
        
        // If initial stock provided, record stock movement
        if (input.stockQty && input.stockQty > 0) {
            await this.recordStockMovement({
                productId: id,
                quantity: input.stockQty,
                movementType: 'receipt',
                unitCost: input.costPrice,
                referenceType: 'initial_stock',
                notes: 'Initial stock on product creation',
                createdBy: businessId // This will be overridden by actual user
            }, businessId);
        }
        
        return result.rows[0];
    }

    // Get product by ID
    async getProduct(productId: string, businessId: string): Promise<Product | null> {
        const result = await db.query<Product>(
            'SELECT * FROM products WHERE id = $1 AND business_id = $2',
            [productId, businessId]
        );
        return result.rows[0] || null;
    }

    // List all products for a business
    async listProducts(businessId: string, options: { 
        isActive?: boolean; 
        category?: string;
        lowStock?: boolean;
    } = {}): Promise<Product[]> {
        let query = 'SELECT * FROM products WHERE business_id = $1';
        const params: any[] = [businessId];
        let paramCount = 1;
        
        if (options.isActive !== undefined) {
            paramCount++;
            query += ` AND is_active = $${paramCount}`;
            params.push(options.isActive);
        }
        
        if (options.category) {
            paramCount++;
            query += ` AND category = $${paramCount}`;
            params.push(options.category);
        }
        
        if (options.lowStock) {
            query += ' AND stock_qty <= reorder_level';
        }
        
        query += ' ORDER BY name ASC';
        
        const result = await db.query<Product>(query, params);
        return result.rows;
    }

    // Update product
    async updateProduct(productId: string, businessId: string, input: UpdateProductInput): Promise<Product> {
        const updates: string[] = [];
        const params: any[] = [productId, businessId];
        let paramCount = 2;
        
        if (input.name !== undefined) {
            paramCount++;
            updates.push(`name = $${paramCount}`);
            params.push(input.name);
        }
        
        if (input.description !== undefined) {
            paramCount++;
            updates.push(`description = $${paramCount}`);
            params.push(input.description);
        }
        
        if (input.category !== undefined) {
            paramCount++;
            updates.push(`category = $${paramCount}`);
            params.push(input.category);
        }
        
        if (input.sellingPrice !== undefined) {
            paramCount++;
            updates.push(`selling_price = $${paramCount}`);
            params.push(input.sellingPrice);
        }
        
        if (input.costPrice !== undefined) {
            paramCount++;
            updates.push(`cost_price = $${paramCount}`);
            params.push(input.costPrice);
        }
        
        if (input.reorderLevel !== undefined) {
            paramCount++;
            updates.push(`reorder_level = $${paramCount}`);
            params.push(input.reorderLevel);
        }
        
        if (input.isActive !== undefined) {
            paramCount++;
            updates.push(`is_active = $${paramCount}`);
            params.push(input.isActive);
        }
        
        if (updates.length === 0) {
            throw new Error('No fields to update');
        }
        
        updates.push('updated_at = NOW()');
        
        const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $1 AND business_id = $2 RETURNING *`;
        
        const result = await db.query<Product>(query, params);
        
        if (result.rows.length === 0) {
            throw new Error('Product not found');
        }
        
        return result.rows[0];
    }

    // Delete (soft) product
    async deleteProduct(productId: string, businessId: string): Promise<void> {
        const result = await db.query(
            'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 AND business_id = $2 RETURNING id',
            [productId, businessId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Product not found');
        }
    }

    // Record stock movement
    async recordStockMovement(input: StockMovementInput, businessId: string): Promise<void> {
        await db.query(
            `INSERT INTO stock_movements (
                id, business_id, product_id, movement_type, quantity,
                unit_cost, reference_id, reference_type, notes, created_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
                uuidv4(),
                businessId,
                input.productId,
                input.movementType,
                input.quantity,
                input.unitCost || null,
                input.referenceId || null,
                input.referenceType || null,
                input.notes || null,
                input.createdBy
            ]
        );
    }

    // Receive stock
    async receiveStock(productId: string, businessId: string, quantity: number, unitCost?: number, userId: string = ''): Promise<Product> {
        return await db.transaction(async (client) => {
            // Update product stock
            const result = await client.query<Product>(
                'UPDATE products SET stock_qty = stock_qty + $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING *',
                [quantity, productId, businessId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Product not found');
            }
            
            // Record movement
            await client.query(
                `INSERT INTO stock_movements (
                    id, business_id, product_id, movement_type, quantity,
                    unit_cost, reference_type, notes, created_by, created_at
                ) VALUES ($1, $2, $3, 'receipt', $4, $5, 'manual_receive', 'Manual stock receipt', $6, NOW())`,
                [uuidv4(), businessId, productId, quantity, unitCost || null, userId]
            );
            
            return result.rows[0];
        });
    }

    // Adjust stock (damage, return, correction)
    async adjustStock(productId: string, businessId: string, quantity: number, reason: string, notes: string, userId: string): Promise<Product> {
        return await db.transaction(async (client) => {
            // Get current stock
            const current = await client.query(
                'SELECT stock_qty FROM products WHERE id = $1 AND business_id = $2',
                [productId, businessId]
            );
            
            if (current.rows.length === 0) {
                throw new Error('Product not found');
            }
            
            const newQty = Math.max(0, current.rows[0].stock_qty + quantity);
            
            // Update product stock
            const result = await client.query<Product>(
                'UPDATE products SET stock_qty = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING *',
                [newQty, productId, businessId]
            );
            
            // Determine movement type
            let movementType: string;
            switch (reason) {
                case 'damage': movementType = 'damage'; break;
                case 'return': movementType = 'return'; break;
                default: movementType = 'adjustment';
            }
            
            // Record movement
            await client.query(
                `INSERT INTO stock_movements (
                    id, business_id, product_id, movement_type, quantity,
                    reference_type, notes, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, 'manual_adjust', $6, $7, NOW())`,
                [uuidv4(), businessId, productId, movementType, quantity, notes, userId]
            );
            
            return result.rows[0];
        });
    }

    // Get stock movement history
    async getStockHistory(productId: string, businessId: string, limit: number = 50): Promise<any[]> {
        const result = await db.query(
            `SELECT sm.*, u.name as created_by_name
             FROM stock_movements sm
             LEFT JOIN users u ON sm.created_by = u.id
             WHERE sm.product_id = $1 AND sm.business_id = $2
             ORDER BY sm.created_at DESC
             LIMIT $3`,
            [productId, businessId, limit]
        );
        return result.rows;
    }

    // Get low stock products
    async getLowStockProducts(businessId: string): Promise<Product[]> {
        const result = await db.query<Product>(
            `SELECT * FROM products 
             WHERE business_id = $1 AND is_active = true AND stock_qty <= reorder_level
             ORDER BY stock_qty ASC`,
            [businessId]
        );
        return result.rows;
    }

    // Search products
    async searchProducts(businessId: string, query: string): Promise<Product[]> {
        const searchTerm = `%${query}%`;
        const result = await db.query<Product>(
            `SELECT * FROM products 
             WHERE business_id = $1 AND is_active = true 
             AND (name ILIKE $2 OR category ILIKE $2 OR barcode ILIKE $2)
             ORDER BY name ASC
             LIMIT 20`,
            [businessId, searchTerm]
        );
        return result.rows;
    }
}

export const productsService = new ProductsService();
