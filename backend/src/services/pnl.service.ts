import { db } from '../db/connection';
import crypto from 'crypto';

export interface DailyPnL {
    id: string;
    business_id: string;
    date: string;
    total_revenue: number;
    total_cogs: number;
    gross_profit: number;
    total_expenses: number;
    net_profit: number;
    cash_expected: number;
    cash_actual: number | null;
    cash_variance: number | null;
    mpesa_received: number;
    transaction_count: number;
    itemised_sales: number;
    auto_saved: number;
    hash: string;
    reconciled_at: Date | null;
    reconciled_by: string | null;
    created_at: Date;
}

export interface PnLSummary {
    period: string;
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    transactionCount: number;
    averageTransactionValue: number;
    grossMargin: number;
    netMargin: number;
}

class PnLService {
    private generateHash(data: Record<string, any>): string {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }

    // Get daily P&L for a date range
    async getDailyPnL(
        businessId: string,
        startDate: string,
        endDate: string
    ): Promise<DailyPnL[]> {
        const result = await db.query<DailyPnL>(
            `SELECT * FROM daily_pnl 
             WHERE business_id = $1 AND date BETWEEN $2 AND $3
             ORDER BY date DESC`,
            [businessId, startDate, endDate]
        );
        return result.rows;
    }

    // Get P&L summary for a period
    async getSummary(
        businessId: string,
        startDate: string,
        endDate: string
    ): Promise<PnLSummary> {
        const result = await db.query(
            `SELECT 
                COALESCE(SUM(total_revenue), 0) as total_revenue,
                COALESCE(SUM(total_cogs), 0) as total_cogs,
                COALESCE(SUM(gross_profit), 0) as gross_profit,
                COALESCE(SUM(total_expenses), 0) as total_expenses,
                COALESCE(SUM(net_profit), 0) as net_profit,
                COALESCE(SUM(transaction_count), 0) as transaction_count
             FROM daily_pnl 
             WHERE business_id = $1 AND date BETWEEN $2 AND $3`,
            [businessId, startDate, endDate]
        );
        
        const row = result.rows[0];
        const totalRevenue = parseInt(row.total_revenue, 10);
        const grossProfit = parseInt(row.gross_profit, 10);
        const netProfit = parseInt(row.net_profit, 10);
        const transactionCount = parseInt(row.transaction_count, 10);
        
        return {
            period: `${startDate} to ${endDate}`,
            totalRevenue,
            totalCOGS: parseInt(row.total_cogs, 10),
            grossProfit,
            totalExpenses: parseInt(row.total_expenses, 10),
            netProfit,
            transactionCount,
            averageTransactionValue: transactionCount > 0 ? Math.round(totalRevenue / transactionCount) : 0,
            grossMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
            netMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
        };
    }

    // Get daily breakdown with trends
    async getTrends(
        businessId: string,
        days: number = 30
    ): Promise<Array<{ date: string; revenue: number; profit: number; expenses: number }>> {
        const result = await db.query(
            `SELECT 
                date,
                total_revenue as revenue,
                net_profit as profit,
                total_expenses as expenses
             FROM daily_pnl 
             WHERE business_id = $1 
             AND date >= CURRENT_DATE - INTERVAL '${days} days'
             ORDER BY date ASC`,
            [businessId]
        );
        
        return result.rows.map(r => ({
            date: r.date,
            revenue: parseInt(r.revenue, 10),
            profit: parseInt(r.profit, 10),
            expenses: parseInt(r.expenses, 10),
        }));
    }

    // Reconcile a day's P&L
    async reconcileDay(
        businessId: string,
        date: string,
        cashActual: number,
        reconciledBy: string
    ): Promise<DailyPnL> {
        return await db.transaction(async (client) => {
            // Get current P&L
            const currentResult = await client.query<DailyPnL>(
                'SELECT * FROM daily_pnl WHERE business_id = $1 AND date = $2',
                [businessId, date]
            );
            
            if (currentResult.rows.length === 0) {
                throw new Error('No P&L record found for this date');
            }
            
            const current = currentResult.rows[0];
            const variance = cashActual - current.cash_expected;
            
            // Update P&L with reconciliation
            const updateResult = await client.query<DailyPnL>(
                `UPDATE daily_pnl 
                 SET cash_actual = $1,
                     cash_variance = $2,
                     reconciled_at = NOW(),
                     reconciled_by = $3,
                     hash = $4
                 WHERE business_id = $5 AND date = $6
                 RETURNING *`,
                [
                    cashActual,
                    variance,
                    reconciledBy,
                    this.generateHash({ ...current, cash_actual: cashActual, variance }),
                    businessId,
                    date
                ]
            );
            
            return updateResult.rows[0];
        });
    }

    // Get today's P&L (real-time)
    async getTodayPnL(businessId: string): Promise<{
        pnl: DailyPnL | null;
        live: {
            revenue: number;
            transactions: number;
            cogs: number;
        };
    }> {
        const today = new Date().toISOString().split('T')[0];
        
        // Get recorded P&L
        const pnlResult = await db.query<DailyPnL>(
            'SELECT * FROM daily_pnl WHERE business_id = $1 AND date = $2',
            [businessId, today]
        );
        
        // Get live totals from transactions
        const liveResult = await db.query(
            `SELECT 
                COALESCE(SUM(total_amount), 0) as revenue,
                COUNT(*) as transactions,
                COALESCE(SUM(total_cogs), 0) as cogs
             FROM transactions 
             WHERE business_id = $1 
             AND DATE(recorded_at) = $2
             AND status = 'locked'`,
            [businessId, today]
        );
        
        return {
            pnl: pnlResult.rows[0] || null,
            live: {
                revenue: parseInt(liveResult.rows[0].revenue, 10),
                transactions: parseInt(liveResult.rows[0].transactions, 10),
                cogs: parseInt(liveResult.rows[0].cogs, 10),
            }
        };
    }
}

export const pnlService = new PnLService();
