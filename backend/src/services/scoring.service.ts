import { db } from '../db/connection';

export interface CashierScore {
    id: string;
    business_id: string;
    cashier_id: string;
    reliability_score: number;
    cash_score: number;
    stock_score: number;
    record_score: number;
    void_score: number;
    receipt_score: number;
    calculated_at: Date;
    period_start: string;
    period_end: string;
}

export interface ScoreBreakdown {
    reliability: number;
    cash: number;
    stock: number;
    records: number;
    voids: number;
    receipts: number;
    overall: number;
}

class ScoringService {
    // Calculate 90-day rolling scores for a cashier
    async calculateCashierScore(
        businessId: string,
        cashierId: string
    ): Promise<CashierScore> {
        const periodEnd = new Date().toISOString().split('T')[0];
        const periodStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Get shift data
        const shiftsResult = await db.query(
            `SELECT 
                COUNT(*) as total_shifts,
                COALESCE(AVG(CASE WHEN cash_variance = 0 THEN 1 ELSE 0 END), 0) as perfect_cash_shifts,
                COALESCE(AVG(ABS(cash_variance)), 0) as avg_variance
             FROM shifts 
             WHERE cashier_id = $1 
             AND started_at >= $2
             AND is_reconciled = true`,
            [cashierId, periodStart]
        );
        
        // Get transaction data
        const transactionsResult = await db.query(
            `SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN status = 'voided' THEN 1 END) as voided_transactions,
                COUNT(CASE WHEN receipt_token IS NOT NULL THEN 1 END) as with_receipt,
                AVG(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as lock_rate
             FROM transactions 
             WHERE cashier_id = $1 
             AND recorded_at >= $2`,
            [cashierId, periodStart]
        );
        
        const s = shiftsResult.rows[0];
        const t = transactionsResult.rows[0];
        
        const totalShifts = parseInt(s.total_shifts, 10) || 1;
        const perfectCash = parseFloat(s.perfect_cash_shifts) || 0;
        const avgVariance = parseFloat(s.avg_variance) || 0;
        const totalTransactions = parseInt(t.total_transactions, 10) || 1;
        const voided = parseInt(t.voided_transactions, 10) || 0;
        const withReceipt = parseInt(t.with_receipt, 10) || 0;
        
        // Calculate individual scores (0-100)
        const cashScore = Math.round(perfectCash * 100);
        const voidScore = Math.max(0, 100 - Math.round((voided / totalTransactions) * 1000));
        const receiptScore = Math.round((withReceipt / totalTransactions) * 100);
        const reliabilityScore = Math.round((cashScore + voidScore + receiptScore) / 3);
        
        // Store or update score
        const existing = await db.query(
            'SELECT id FROM cashier_scores WHERE business_id = $1 AND cashier_id = $2 AND period_end = $3',
            [businessId, cashierId, periodEnd]
        );
        
        if (existing.rows.length > 0) {
            const result = await db.query<CashierScore>(
                `UPDATE cashier_scores 
                 SET reliability_score = $1,
                     cash_score = $2,
                     stock_score = 100,
                     record_score = $3,
                     void_score = $4,
                     receipt_score = $5,
                     calculated_at = NOW()
                 WHERE id = $6
                 RETURNING *`,
                [reliabilityScore, cashScore, 100, voidScore, receiptScore, existing.rows[0].id]
            );
            return result.rows[0];
        } else {
            const result = await db.query<CashierScore>(
                `INSERT INTO cashier_scores (
                    id, business_id, cashier_id, reliability_score, cash_score,
                    stock_score, record_score, void_score, receipt_score,
                    calculated_at, period_start, period_end
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)
                RETURNING *`,
                [
                    require('uuid').v4(),
                    businessId,
                    cashierId,
                    reliabilityScore,
                    cashScore,
                    100, // stock_score placeholder
                    100, // record_score placeholder
                    voidScore,
                    receiptScore,
                    periodStart,
                    periodEnd
                ]
            );
            return result.rows[0];
        }
    }

    // Get scores for all cashiers in a business
    async getBusinessScores(businessId: string): Promise<CashierScore[]> {
        const result = await db.query<CashierScore>(
            `SELECT cs.*, u.name as cashier_name
             FROM cashier_scores cs
             JOIN users u ON cs.cashier_id = u.id
             WHERE cs.business_id = $1
             AND cs.period_end = (
                 SELECT MAX(period_end) 
                 FROM cashier_scores 
                 WHERE business_id = $1
             )
             ORDER BY cs.reliability_score DESC`,
            [businessId]
        );
        return result.rows;
    }

    // Get score history for a cashier
    async getScoreHistory(
        businessId: string,
        cashierId: string,
        limit: number = 12
    ): Promise<CashierScore[]> {
        const result = await db.query<CashierScore>(
            `SELECT * FROM cashier_scores 
             WHERE business_id = $1 AND cashier_id = $2
             ORDER BY period_end DESC
             LIMIT $3`,
            [businessId, cashierId, limit]
        );
        return result.rows;
    }
}

export const scoringService = new ScoringService();
