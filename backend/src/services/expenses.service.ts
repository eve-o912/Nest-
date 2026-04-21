import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

export interface Expense {
    id: string;
    business_id: string;
    recorded_by: string;
    category: string;
    amount: number;
    description: string | null;
    receipt_photo_url: string | null;
    is_recurring: boolean;
    recurring_frequency: string | null;
    expense_date: string;
    created_at: Date;
}

export interface CreateExpenseInput {
    category: string;
    amount: number;
    description?: string;
    expenseDate: string;
    isRecurring?: boolean;
    recurringFrequency?: 'daily' | 'weekly' | 'monthly';
}

export interface UpdateExpenseInput {
    category?: string;
    amount?: number;
    description?: string;
    expenseDate?: string;
    isRecurring?: boolean;
    recurringFrequency?: 'daily' | 'weekly' | 'monthly' | null;
}

export interface ExpenseSummary {
    total: number;
    byCategory: Record<string, number>;
    count: number;
}

class ExpensesService {
    // Create a new expense
    async createExpense(
        businessId: string,
        recordedBy: string,
        input: CreateExpenseInput
    ): Promise<Expense> {
        return await db.transaction(async (client) => {
            const id = uuidv4();
            
            const result = await client.query<Expense>(
                `INSERT INTO expenses (
                    id, business_id, recorded_by, category, amount,
                    description, is_recurring, recurring_frequency,
                    expense_date, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                RETURNING *`,
                [
                    id,
                    businessId,
                    recordedBy,
                    input.category,
                    input.amount,
                    input.description || null,
                    input.isRecurring || false,
                    input.recurringFrequency || null,
                    input.expenseDate
                ]
            );
            
            const expense = result.rows[0];
            
            // Update daily P&L
            await client.query(
                `INSERT INTO daily_pnl (
                    id, business_id, date, total_expenses, hash, created_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (business_id, date)
                DO UPDATE SET
                    total_expenses = daily_pnl.total_expenses + $4,
                    net_profit = daily_pnl.gross_profit - (daily_pnl.total_expenses + $4),
                    hash = $5`,
                [
                    uuidv4(),
                    businessId,
                    input.expenseDate,
                    input.amount,
                    this.generateHash({ date: input.expenseDate, expense: input.amount })
                ]
            );
            
            return expense;
        });
    }

    // Get expense by ID
    async getExpense(expenseId: string, businessId: string): Promise<Expense | null> {
        const result = await db.query<Expense>(
            'SELECT * FROM expenses WHERE id = $1 AND business_id = $2',
            [expenseId, businessId]
        );
        return result.rows[0] || null;
    }

    // List expenses for a business
    async listExpenses(
        businessId: string,
        options: {
            startDate?: string;
            endDate?: string;
            category?: string;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{ expenses: Expense[]; total: number }> {
        let whereClause = 'WHERE business_id = $1';
        const params: any[] = [businessId];
        let paramCount = 1;
        
        if (options.startDate) {
            paramCount++;
            whereClause += ` AND expense_date >= $${paramCount}`;
            params.push(options.startDate);
        }
        
        if (options.endDate) {
            paramCount++;
            whereClause += ` AND expense_date <= $${paramCount}`;
            params.push(options.endDate);
        }
        
        if (options.category) {
            paramCount++;
            whereClause += ` AND category = $${paramCount}`;
            params.push(options.category);
        }
        
        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM expenses ${whereClause}`,
            params
        );
        
        // Get expenses with limit/offset
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        
        const expensesResult = await db.query<Expense>(
            `SELECT * FROM expenses ${whereClause}
             ORDER BY expense_date DESC, created_at DESC
             LIMIT $${++paramCount} OFFSET $${++paramCount}`,
            [...params, limit, offset]
        );
        
        return {
            expenses: expensesResult.rows,
            total: parseInt(countResult.rows[0].total, 10)
        };
    }

    // Update expense
    async updateExpense(
        expenseId: string,
        businessId: string,
        input: UpdateExpenseInput
    ): Promise<Expense> {
        return await db.transaction(async (client) => {
            // Get current expense to calculate difference
            const currentResult = await client.query<Expense>(
                'SELECT * FROM expenses WHERE id = $1 AND business_id = $2',
                [expenseId, businessId]
            );
            
            if (currentResult.rows.length === 0) {
                throw new Error('Expense not found');
            }
            
            const current = currentResult.rows[0];
            const amountDiff = (input.amount || current.amount) - current.amount;
            
            const updates: string[] = [];
            const params: any[] = [expenseId, businessId];
            let paramCount = 2;
            
            if (input.category !== undefined) {
                paramCount++;
                updates.push(`category = $${paramCount}`);
                params.push(input.category);
            }
            
            if (input.amount !== undefined) {
                paramCount++;
                updates.push(`amount = $${paramCount}`);
                params.push(input.amount);
            }
            
            if (input.description !== undefined) {
                paramCount++;
                updates.push(`description = $${paramCount}`);
                params.push(input.description);
            }
            
            if (input.expenseDate !== undefined) {
                paramCount++;
                updates.push(`expense_date = $${paramCount}`);
                params.push(input.expenseDate);
            }
            
            if (input.isRecurring !== undefined) {
                paramCount++;
                updates.push(`is_recurring = $${paramCount}`);
                params.push(input.isRecurring);
            }
            
            if (input.recurringFrequency !== undefined) {
                paramCount++;
                updates.push(`recurring_frequency = $${paramCount}`);
                params.push(input.recurringFrequency);
            }
            
            if (updates.length === 0) {
                throw new Error('No fields to update');
            }
            
            const query = `UPDATE expenses SET ${updates.join(', ')} WHERE id = $1 AND business_id = $2 RETURNING *`;
            
            const result = await client.query<Expense>(query, params);
            
            // Update daily P&L if amount changed
            if (amountDiff !== 0) {
                const expenseDate = input.expenseDate || current.expense_date;
                await client.query(
                    `UPDATE daily_pnl 
                     SET total_expenses = GREATEST(0, total_expenses + $1),
                         net_profit = gross_profit - GREATEST(0, total_expenses + $1)
                     WHERE business_id = $2 AND date = $3`,
                    [amountDiff, businessId, expenseDate]
                );
            }
            
            return result.rows[0];
        });
    }

    // Delete expense
    async deleteExpense(expenseId: string, businessId: string): Promise<void> {
        return await db.transaction(async (client) => {
            // Get expense details before deletion
            const expenseResult = await client.query<Expense>(
                'SELECT amount, expense_date FROM expenses WHERE id = $1 AND business_id = $2',
                [expenseId, businessId]
            );
            
            if (expenseResult.rows.length === 0) {
                throw new Error('Expense not found');
            }
            
            const { amount, expense_date } = expenseResult.rows[0];
            
            // Delete expense
            await client.query(
                'DELETE FROM expenses WHERE id = $1 AND business_id = $2',
                [expenseId, businessId]
            );
            
            // Update daily P&L
            await client.query(
                `UPDATE daily_pnl 
                 SET total_expenses = GREATEST(0, total_expenses - $1),
                     net_profit = gross_profit - GREATEST(0, total_expenses - $1)
                 WHERE business_id = $2 AND date = $3`,
                [amount, businessId, expense_date]
            );
        });
    }

    // Get expense summary
    async getExpenseSummary(
        businessId: string,
        startDate: string,
        endDate: string
    ): Promise<ExpenseSummary> {
        const result = await db.query(
            `SELECT 
                COALESCE(SUM(amount), 0) as total,
                COUNT(*) as count,
                jsonb_object_agg(category, cat_total) as by_category
             FROM (
                 SELECT category, SUM(amount) as cat_total
                 FROM expenses
                 WHERE business_id = $1 AND expense_date BETWEEN $2 AND $3
                 GROUP BY category
             ) as cat_summary
             CROSS JOIN (
                 SELECT SUM(amount) as total_amount, COUNT(*) as total_count
                 FROM expenses
                 WHERE business_id = $1 AND expense_date BETWEEN $2 AND $3
             ) as totals`,
            [businessId, startDate, endDate]
        );
        
        if (result.rows.length === 0 || result.rows[0].total === null) {
            return { total: 0, byCategory: {}, count: 0 };
        }
        
        return {
            total: parseInt(result.rows[0].total, 10),
            byCategory: result.rows[0].by_category || {},
            count: parseInt(result.rows[0].count, 10)
        };
    }

    // Get expense categories
    async getCategories(businessId: string): Promise<string[]> {
        const result = await db.query(
            `SELECT DISTINCT category FROM expenses 
             WHERE business_id = $1 
             ORDER BY category`,
            [businessId]
        );
        return result.rows.map(r => r.category);
    }

    private generateHash(data: Record<string, any>): string {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }
}

export const expensesService = new ExpensesService();
