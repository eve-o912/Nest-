import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface TransactionItem {
    productId: string;
    productName: string;
    quantity: number;
    unitSellingPrice: number;
    unitCostPrice: number;
}

export interface CreateTransactionInput {
    items: TransactionItem[];
    paymentMethod: 'cash' | 'mpesa' | 'card' | 'bank';
    customerPhone?: string;
    mpesaReceiptNumber?: string;
}

export interface Transaction {
    id: string;
    business_id: string;
    cashier_id: string;
    customer_phone: string | null;
    total_amount: number;
    total_cogs: number;
    gross_profit: number;
    payment_method: string;
    mpesa_receipt_number: string | null;
    status: 'draft' | 'locked' | 'voided';
    receipt_token: string | null;
    receipt_url: string | null;
    hash: string | null;
    recorded_at: Date;
    locked_at: Date | null;
    created_at: Date;
}

export interface ReceiptData {
    token: string;
    businessName: string;
    totalAmount: number;
    itemCount: number;
    paymentMethod: string;
    customerPhone?: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        total: number;
    }>;
    cashierName: string;
    createdAt: Date;
}

class TransactionsService {
    // Generate SHA-256 hash for a transaction
    private generateHash(data: Record<string, any>): string {
        const sortedData = Object.keys(data).sort().reduce((acc, key) => {
            acc[key] = data[key];
            return acc;
        }, {} as Record<string, any>);
        return crypto.createHash('sha256').update(JSON.stringify(sortedData)).digest('hex');
    }

    // Generate receipt token
    private generateReceiptToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    // Create a new transaction
    async createTransaction(
        businessId: string,
        cashierId: string,
        input: CreateTransactionInput
    ): Promise<Transaction> {
        return await db.transaction(async (client) => {
            const transactionId = uuidv4();
            
            // Calculate totals
            let totalAmount = 0;
            let totalCogs = 0;
            
            for (const item of input.items) {
                totalAmount += item.quantity * item.unitSellingPrice;
                totalCogs += item.quantity * item.unitCostPrice;
            }
            
            // Verify stock availability for all items
            for (const item of input.items) {
                const stockResult = await client.query(
                    'SELECT stock_qty FROM products WHERE id = $1 AND business_id = $2 AND is_active = true',
                    [item.productId, businessId]
                );
                
                if (stockResult.rows.length === 0) {
                    throw new Error(`Product ${item.productId} not found`);
                }
                
                if (stockResult.rows[0].stock_qty < item.quantity) {
                    throw new Error(`Insufficient stock for product ${item.productName}. Available: ${stockResult.rows[0].stock_qty}, Requested: ${item.quantity}`);
                }
            }
            
            // Create transaction
            const transactionResult = await client.query<Transaction>(
                `INSERT INTO transactions (
                    id, business_id, cashier_id, customer_phone,
                    total_amount, total_cogs, payment_method,
                    mpesa_receipt_number, status, recorded_at, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', NOW(), NOW())
                RETURNING *`,
                [
                    transactionId,
                    businessId,
                    cashierId,
                    input.customerPhone || null,
                    totalAmount,
                    totalCogs,
                    input.paymentMethod,
                    input.mpesaReceiptNumber || null
                ]
            );
            
            const transaction = transactionResult.rows[0];
            
            // Create transaction items and update stock
            for (const item of input.items) {
                // Insert transaction item
                await client.query(
                    `INSERT INTO transaction_items (
                        id, transaction_id, product_id, product_name,
                        quantity, unit_selling_price, unit_cost_price, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                    [
                        uuidv4(),
                        transactionId,
                        item.productId,
                        item.productName,
                        item.quantity,
                        item.unitSellingPrice,
                        item.unitCostPrice
                    ]
                );
                
                // Update product stock
                await client.query(
                    'UPDATE products SET stock_qty = stock_qty - $1, updated_at = NOW() WHERE id = $2',
                    [item.quantity, item.productId]
                );
                
                // Record stock movement
                await client.query(
                    `INSERT INTO stock_movements (
                        id, business_id, product_id, movement_type, quantity,
                        unit_cost, reference_id, reference_type, created_by, created_at
                    ) VALUES ($1, $2, $3, 'sale', $4, $5, $6, 'transaction', $7, NOW())`,
                    [
                        uuidv4(),
                        businessId,
                        item.productId,
                        -item.quantity,
                        item.unitCostPrice,
                        transactionId,
                        cashierId
                    ]
                );
            }
            
            return transaction;
        });
    }

    // Lock transaction (finalize sale and generate receipt)
    async lockTransaction(
        transactionId: string,
        businessId: string,
        receiptBaseUrl: string
    ): Promise<{ transaction: Transaction; receipt: ReceiptData }> {
        return await db.transaction(async (client) => {
            // Get transaction with business and cashier info
            const transactionResult = await client.query(
                `SELECT t.*, b.name as business_name, u.name as cashier_name
                 FROM transactions t
                 JOIN businesses b ON t.business_id = b.id
                 JOIN users u ON t.cashier_id = u.id
                 WHERE t.id = $1 AND t.business_id = $2 AND t.status = 'draft'`,
                [transactionId, businessId]
            );
            
            if (transactionResult.rows.length === 0) {
                throw new Error('Transaction not found or already locked');
            }
            
            const transactionData = transactionResult.rows[0];
            
            // Get transaction items
            const itemsResult = await client.query(
                `SELECT product_name, quantity, unit_selling_price, total_amount
                 FROM transaction_items
                 WHERE transaction_id = $1`,
                [transactionId]
            );
            
            // Generate receipt token
            const receiptToken = this.generateReceiptToken();
            const receiptUrl = `${receiptBaseUrl}/r/${transactionData.business_name.toLowerCase().replace(/\s+/g, '-')}/${receiptToken}`;
            
            // Generate hash for transaction integrity
            const hashData = {
                transaction_id: transactionId,
                business_id: businessId,
                cashier_id: transactionData.cashier_id,
                total_amount: transactionData.total_amount,
                total_cogs: transactionData.total_cogs,
                payment_method: transactionData.payment_method,
                items: itemsResult.rows.map((item: any) => ({
                    name: item.product_name,
                    qty: item.quantity,
                    price: item.unit_selling_price
                })),
                locked_at: new Date().toISOString()
            };
            const hash = this.generateHash(hashData);
            
            // Update transaction status
            const updateResult = await client.query<Transaction>(
                `UPDATE transactions 
                 SET status = 'locked', 
                     receipt_token = $1, 
                     receipt_url = $2, 
                     hash = $3, 
                     locked_at = NOW() 
                 WHERE id = $4 AND business_id = $5
                 RETURNING *`,
                [receiptToken, receiptUrl, hash, transactionId, businessId]
            );
            
            const transaction = updateResult.rows[0];
            
            // Create receipt record
            await client.query(
                `INSERT INTO receipts (
                    id, transaction_id, token, business_name, total_amount,
                    item_count, payment_method, customer_phone, delivery_status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())`,
                [
                    uuidv4(),
                    transactionId,
                    receiptToken,
                    transactionData.business_name,
                    transactionData.total_amount,
                    itemsResult.rows.length,
                    transactionData.payment_method,
                    transactionData.customer_phone
                ]
            );
            
            // Update daily P&L (upsert)
            const today = new Date().toISOString().split('T')[0];
            await client.query(
                `INSERT INTO daily_pnl (
                    id, business_id, date, total_revenue, total_cogs, gross_profit,
                    transaction_count, hash, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, NOW())
                ON CONFLICT (business_id, date) 
                DO UPDATE SET
                    total_revenue = daily_pnl.total_revenue + $4,
                    total_cogs = daily_pnl.total_cogs + $5,
                    gross_profit = daily_pnl.gross_profit + $6,
                    transaction_count = daily_pnl.transaction_count + 1,
                    hash = $7`,
                [
                    uuidv4(),
                    businessId,
                    today,
                    transactionData.total_amount,
                    transactionData.total_cogs,
                    transactionData.total_amount - transactionData.total_cogs,
                    this.generateHash({ date: today, revenue: transactionData.total_amount })
                ]
            );
            
            // Handle auto-save if enabled
            const businessResult = await client.query(
                'SELECT auto_save_rate, owner_id FROM businesses WHERE id = $1',
                [businessId]
            );
            
            if (businessResult.rows.length > 0 && businessResult.rows[0].auto_save_rate > 0) {
                const autoSaveRate = businessResult.rows[0].auto_save_rate;
                const saveAmount = Math.floor((transactionData.total_amount * autoSaveRate) / 100);
                
                if (saveAmount > 0) {
                    // Get or create savings wallet
                    const walletResult = await client.query(
                        'SELECT id, balance FROM savings_wallets WHERE business_id = $1',
                        [businessId]
                    );
                    
                    let walletId;
                    let newBalance;
                    
                    if (walletResult.rows.length === 0) {
                        // Create wallet
                        walletId = uuidv4();
                        newBalance = saveAmount;
                        await client.query(
                            `INSERT INTO savings_wallets (
                                id, business_id, balance, total_saved, goal_amount, auto_save_rate, created_at, updated_at
                            ) VALUES ($1, $2, $3, $3, 0, $4, NOW(), NOW())`,
                            [walletId, businessId, saveAmount, autoSaveRate]
                        );
                    } else {
                        walletId = walletResult.rows[0].id;
                        newBalance = walletResult.rows[0].balance + saveAmount;
                        await client.query(
                            `UPDATE savings_wallets 
                             SET balance = $1, total_saved = total_saved + $2, updated_at = NOW()
                             WHERE id = $3`,
                            [newBalance, saveAmount, walletId]
                        );
                    }
                    
                    // Create savings entry
                    await client.query(
                        `INSERT INTO savings_entries (
                            id, wallet_id, entry_type, amount, balance_after,
                            reference_id, reference_type, notes, created_at
                        ) VALUES ($1, $2, 'auto_save', $3, $4, $5, 'transaction', $6, NOW())`,
                        [
                            uuidv4(),
                            walletId,
                            saveAmount,
                            newBalance,
                            transactionId,
                            `Auto-save ${autoSaveRate}% from sale`
                        ]
                    );
                    
                    // Update daily P&L with auto-save
                    await client.query(
                        `UPDATE daily_pnl 
                         SET auto_saved = auto_saved + $1
                         WHERE business_id = $2 AND date = $3`,
                        [saveAmount, businessId, today]
                    );
                }
            }
            
            const receipt: ReceiptData = {
                token: receiptToken,
                businessName: transactionData.business_name,
                totalAmount: transactionData.total_amount,
                itemCount: itemsResult.rows.length,
                paymentMethod: transactionData.payment_method,
                customerPhone: transactionData.customer_phone || undefined,
                items: itemsResult.rows.map((item: any) => ({
                    name: item.product_name,
                    quantity: item.quantity,
                    price: item.unit_selling_price,
                    total: item.total_amount
                })),
                cashierName: transactionData.cashier_name,
                createdAt: new Date()
            };
            
            return { transaction, receipt };
        });
    }

    // Get transaction by ID
    async getTransaction(transactionId: string, businessId: string): Promise<Transaction | null> {
        const result = await db.query<Transaction>(
            'SELECT * FROM transactions WHERE id = $1 AND business_id = $2',
            [transactionId, businessId]
        );
        return result.rows[0] || null;
    }

    // Get transaction with items
    async getTransactionWithItems(transactionId: string, businessId: string): Promise<{ transaction: Transaction; items: any[] } | null> {
        const transactionResult = await db.query<Transaction>(
            'SELECT * FROM transactions WHERE id = $1 AND business_id = $2',
            [transactionId, businessId]
        );
        
        if (transactionResult.rows.length === 0) {
            return null;
        }
        
        const itemsResult = await db.query(
            'SELECT * FROM transaction_items WHERE transaction_id = $1',
            [transactionId]
        );
        
        return {
            transaction: transactionResult.rows[0],
            items: itemsResult.rows
        };
    }

    // List transactions
    async listTransactions(
        businessId: string,
        options: {
            startDate?: string;
            endDate?: string;
            cashierId?: string;
            status?: 'draft' | 'locked' | 'voided';
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{ transactions: Transaction[]; total: number }> {
        let whereClause = 'WHERE business_id = $1';
        const params: any[] = [businessId];
        let paramCount = 1;
        
        if (options.startDate) {
            paramCount++;
            whereClause += ` AND recorded_at >= $${paramCount}`;
            params.push(options.startDate);
        }
        
        if (options.endDate) {
            paramCount++;
            whereClause += ` AND recorded_at < $${paramCount}`;
            params.push(options.endDate);
        }
        
        if (options.cashierId) {
            paramCount++;
            whereClause += ` AND cashier_id = $${paramCount}`;
            params.push(options.cashierId);
        }
        
        if (options.status) {
            paramCount++;
            whereClause += ` AND status = $${paramCount}`;
            params.push(options.status);
        }
        
        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM transactions ${whereClause}`,
            params
        );
        
        // Get transactions with limit/offset
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        
        const transactionsResult = await db.query<Transaction>(
            `SELECT * FROM transactions ${whereClause} 
             ORDER BY recorded_at DESC 
             LIMIT $${++paramCount} OFFSET $${++paramCount}`,
            [...params, limit, offset]
        );
        
        return {
            transactions: transactionsResult.rows,
            total: parseInt(countResult.rows[0].total, 10)
        };
    }

    // Void transaction
    async voidTransaction(
        transactionId: string,
        businessId: string,
        voidedBy: string,
        reason: string
    ): Promise<Transaction> {
        return await db.transaction(async (client) => {
            // Get the transaction
            const transactionResult = await client.query<Transaction>(
                'SELECT * FROM transactions WHERE id = $1 AND business_id = $2 AND status = $3',
                [transactionId, businessId, 'locked']
            );
            
            if (transactionResult.rows.length === 0) {
                throw new Error('Transaction not found or cannot be voided');
            }
            
            const transaction = transactionResult.rows[0];
            
            // Get transaction items to restore stock
            const itemsResult = await client.query(
                'SELECT * FROM transaction_items WHERE transaction_id = $1',
                [transactionId]
            );
            
            // Restore stock
            for (const item of itemsResult.rows) {
                await client.query(
                    'UPDATE products SET stock_qty = stock_qty + $1, updated_at = NOW() WHERE id = $2',
                    [item.quantity, item.product_id]
                );
                
                // Record reversal movement
                await client.query(
                    `INSERT INTO stock_movements (
                        id, business_id, product_id, movement_type, quantity,
                        reference_id, reference_type, notes, created_by, created_at
                    ) VALUES ($1, $2, $3, 'return', $4, $5, 'void_transaction', $6, $7, NOW())`,
                    [
                        uuidv4(),
                        businessId,
                        item.product_id,
                        item.quantity,
                        transactionId,
                        `Voided: ${reason}`,
                        voidedBy
                    ]
                );
            }
            
            // Update transaction status
            const updateResult = await client.query<Transaction>(
                `UPDATE transactions 
                 SET status = 'voided', 
                     voided_at = NOW(), 
                     voided_by = $1, 
                     void_reason = $2 
                 WHERE id = $3 AND business_id = $4
                 RETURNING *`,
                [voidedBy, reason, transactionId, businessId]
            );
            
            // Update daily P&L (subtract this transaction)
            const transactionDate = new Date(transaction.recorded_at).toISOString().split('T')[0];
            await client.query(
                `UPDATE daily_pnl 
                 SET total_revenue = GREATEST(0, total_revenue - $1),
                     total_cogs = GREATEST(0, total_cogs - $2),
                     gross_profit = GREATEST(0, gross_profit - $3),
                     transaction_count = GREATEST(0, transaction_count - 1)
                 WHERE business_id = $4 AND date = $5`,
                [
                    transaction.total_amount,
                    transaction.total_cogs,
                    transaction.total_amount - transaction.total_cogs,
                    businessId,
                    transactionDate
                ]
            );
            
            return updateResult.rows[0];
        });
    }

    // Get receipt by token
    async getReceiptByToken(token: string): Promise<ReceiptData | null> {
        const result = await db.query(
            `SELECT r.*, t.recorded_at, u.name as cashier_name
             FROM receipts r
             JOIN transactions t ON r.transaction_id = t.id
             JOIN users u ON t.cashier_id = u.id
             WHERE r.token = $1`,
            [token]
        );
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const receipt = result.rows[0];
        
        // Get items
        const itemsResult = await db.query(
            `SELECT product_name, quantity, unit_selling_price, total_amount
             FROM transaction_items
             WHERE transaction_id = $1`,
            [receipt.transaction_id]
        );
        
        return {
            token: receipt.token,
            businessName: receipt.business_name,
            totalAmount: receipt.total_amount,
            itemCount: receipt.item_count,
            paymentMethod: receipt.payment_method,
            customerPhone: receipt.customer_phone || undefined,
            items: itemsResult.rows.map((item: any) => ({
                name: item.product_name,
                quantity: item.quantity,
                price: item.unit_selling_price,
                total: item.total_amount
            })),
            cashierName: receipt.cashier_name,
            createdAt: receipt.recorded_at
        };
    }

    // Record receipt scan
    async recordReceiptScan(token: string): Promise<void> {
        await db.query(
            `UPDATE receipts 
             SET scan_count = scan_count + 1,
                 first_scanned_at = COALESCE(first_scanned_at, NOW())
             WHERE token = $1`,
            [token]
        );
    }
}

export const transactionsService = new TransactionsService();
