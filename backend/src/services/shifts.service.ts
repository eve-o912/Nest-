import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

export interface Shift {
    id: string;
    business_id: string;
    cashier_id: string;
    started_at: Date;
    ended_at: Date | null;
    starting_cash: number | null;
    ending_cash: number | null;
    expected_cash: number | null;
    cash_variance: number | null;
    transaction_count: number;
    is_reconciled: boolean;
    created_at: Date;
}

export interface CreateShiftInput {
    startingCash?: number;
}

export interface CloseShiftInput {
    endingCash: number;
}

export interface ReconciliationResult {
    shift: Shift;
    summary: {
        totalSales: number;
        cashSales: number;
        mpesaSales: number;
        cardSales: number;
        expectedCash: number;
        variance: number;
        transactionCount: number;
    };
}

class ShiftsService {
    // Start a new shift
    async startShift(
        businessId: string,
        cashierId: string,
        input: CreateShiftInput = {}
    ): Promise<Shift> {
        // Check if there's an active shift
        const activeShift = await db.query(
            'SELECT id FROM shifts WHERE cashier_id = $1 AND ended_at IS NULL',
            [cashierId]
        );
        
        if (activeShift.rows.length > 0) {
            throw new Error('You already have an active shift. Please close it first.');
        }
        
        const id = uuidv4();
        
        const result = await db.query<Shift>(
            `INSERT INTO shifts (
                id, business_id, cashier_id, started_at,
                starting_cash, transaction_count, is_reconciled, created_at
            ) VALUES ($1, $2, $3, NOW(), $4, 0, false, NOW())
            RETURNING *`,
            [id, businessId, cashierId, input.startingCash || null]
        );
        
        return result.rows[0];
    }

    // Get active shift for a cashier
    async getActiveShift(cashierId: string): Promise<Shift | null> {
        const result = await db.query<Shift>(
            `SELECT * FROM shifts 
             WHERE cashier_id = $1 AND ended_at IS NULL
             ORDER BY started_at DESC
             LIMIT 1`,
            [cashierId]
        );
        return result.rows[0] || null;
    }

    // Get shift by ID
    async getShift(shiftId: string, businessId: string): Promise<Shift | null> {
        const result = await db.query<Shift>(
            'SELECT * FROM shifts WHERE id = $1 AND business_id = $2',
            [shiftId, businessId]
        );
        return result.rows[0] || null;
    }

    // Close shift and reconcile
    async closeShift(
        shiftId: string,
        businessId: string,
        input: CloseShiftInput
    ): Promise<ReconciliationResult> {
        return await db.transaction(async (client) => {
            // Get shift details
            const shiftResult = await client.query<Shift>(
                'SELECT * FROM shifts WHERE id = $1 AND business_id = $2 AND ended_at IS NULL',
                [shiftId, businessId]
            );
            
            if (shiftResult.rows.length === 0) {
                throw new Error('Active shift not found');
            }
            
            const shift = shiftResult.rows[0];
            
            // Get transactions during this shift
            const transactionsResult = await client.query(
                `SELECT 
                    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
                    COALESCE(SUM(CASE WHEN payment_method = 'mpesa' THEN total_amount ELSE 0 END), 0) as mpesa_sales,
                    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales,
                    COALESCE(SUM(CASE WHEN payment_method = 'bank' THEN total_amount ELSE 0 END), 0) as bank_sales,
                    COALESCE(SUM(total_amount), 0) as total_sales,
                    COUNT(*) as transaction_count
                 FROM transactions 
                 WHERE cashier_id = $1 
                 AND recorded_at >= $2 
                 AND status = 'locked'`,
                [shift.cashier_id, shift.started_at]
            );
            
            const t = transactionsResult.rows[0];
            const cashSales = parseInt(t.cash_sales, 10);
            const mpesaSales = parseInt(t.mpesa_sales, 10);
            const cardSales = parseInt(t.card_sales, 10);
            const bankSales = parseInt(t.bank_sales, 10);
            const totalSales = parseInt(t.total_sales, 10);
            const transactionCount = parseInt(t.transaction_count, 10);
            
            // Calculate expected cash
            const startingCash = shift.starting_cash || 0;
            const expectedCash = startingCash + cashSales;
            const variance = input.endingCash - expectedCash;
            
            // Update shift
            const updateResult = await client.query<Shift>(
                `UPDATE shifts 
                 SET ended_at = NOW(),
                     ending_cash = $1,
                     expected_cash = $2,
                     cash_variance = $3,
                     transaction_count = $4,
                     is_reconciled = true
                 WHERE id = $5
                 RETURNING *`,
                [input.endingCash, expectedCash, variance, transactionCount, shiftId]
            );
            
            return {
                shift: updateResult.rows[0],
                summary: {
                    totalSales,
                    cashSales,
                    mpesaSales,
                    cardSales,
                    expectedCash,
                    variance,
                    transactionCount
                }
            };
        });
    }

    // List shifts for a business
    async listShifts(
        businessId: string,
        options: {
            cashierId?: string;
            startDate?: string;
            endDate?: string;
            isReconciled?: boolean;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{ shifts: Shift[]; total: number }> {
        let whereClause = 'WHERE business_id = $1';
        const params: any[] = [businessId];
        let paramCount = 1;
        
        if (options.cashierId) {
            paramCount++;
            whereClause += ` AND cashier_id = $${paramCount}`;
            params.push(options.cashierId);
        }
        
        if (options.startDate) {
            paramCount++;
            whereClause += ` AND started_at >= $${paramCount}`;
            params.push(options.startDate);
        }
        
        if (options.endDate) {
            paramCount++;
            whereClause += ` AND started_at <= $${paramCount}`;
            params.push(options.endDate);
        }
        
        if (options.isReconciled !== undefined) {
            paramCount++;
            whereClause += ` AND is_reconciled = $${paramCount}`;
            params.push(options.isReconciled);
        }
        
        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM shifts ${whereClause}`,
            params
        );
        
        // Get shifts with limit/offset
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        
        const shiftsResult = await db.query<Shift>(
            `SELECT s.*, u.name as cashier_name
             FROM shifts s
             LEFT JOIN users u ON s.cashier_id = u.id
             ${whereClause}
             ORDER BY s.started_at DESC
             LIMIT $${++paramCount} OFFSET $${++paramCount}`,
            [...params, limit, offset]
        );
        
        return {
            shifts: shiftsResult.rows,
            total: parseInt(countResult.rows[0].total, 10)
        };
    }

    // Get shift summary (for end-of-day)
    async getShiftSummary(shiftId: string, businessId: string): Promise<{
        shift: Shift;
        transactions: any[];
        totals: {
            cash: number;
            mpesa: number;
            card: number;
            bank: number;
            total: number;
        };
    } | null> {
        const shiftResult = await db.query<Shift>(
            'SELECT * FROM shifts WHERE id = $1 AND business_id = $2',
            [shiftId, businessId]
        );
        
        if (shiftResult.rows.length === 0) {
            return null;
        }
        
        const shift = shiftResult.rows[0];
        
        // Get transactions
        const transactionsResult = await db.query(
            `SELECT t.*, json_agg(ti.*) as items
             FROM transactions t
             LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
             WHERE t.cashier_id = $1 
             AND t.recorded_at >= $2
             AND ($3::timestamptz IS NULL OR t.recorded_at <= $3)
             AND t.status = 'locked'
             GROUP BY t.id
             ORDER BY t.recorded_at DESC`,
            [shift.cashier_id, shift.started_at, shift.ended_at]
        );
        
        // Get totals by payment method
        const totalsResult = await db.query(
            `SELECT 
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash,
                COALESCE(SUM(CASE WHEN payment_method = 'mpesa' THEN total_amount ELSE 0 END), 0) as mpesa,
                COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card,
                COALESCE(SUM(CASE WHEN payment_method = 'bank' THEN total_amount ELSE 0 END), 0) as bank,
                COALESCE(SUM(total_amount), 0) as total
             FROM transactions 
             WHERE cashier_id = $1 
             AND recorded_at >= $2
             AND ($3::timestamptz IS NULL OR recorded_at <= $3)
             AND status = 'locked'`,
            [shift.cashier_id, shift.started_at, shift.ended_at]
        );
        
        return {
            shift,
            transactions: transactionsResult.rows,
            totals: {
                cash: parseInt(totalsResult.rows[0].cash, 10),
                mpesa: parseInt(totalsResult.rows[0].mpesa, 10),
                card: parseInt(totalsResult.rows[0].card, 10),
                bank: parseInt(totalsResult.rows[0].bank, 10),
                total: parseInt(totalsResult.rows[0].total, 10),
            }
        };
    }
}

export const shiftsService = new ShiftsService();
