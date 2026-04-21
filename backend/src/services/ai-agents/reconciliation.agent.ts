import { db } from '../../db';
import { notificationsService } from '../notifications.service';
import { manikkaService } from './manikka.service';
import { dailyPnlService } from '../daily-pnl.service';

/**
 * Reconciliation Agent
 * Schedule: Nightly 9pm
 * 
 * Reads: transactions, account_transactions, shifts
 * Does: Three-way match (POS vs Daraja vs bank), calculates cash_variance per shift
 * Writes: daily_pnl, shifts.has_mismatch, alerts
 * Notifies: Owner SMS/push if |cash_variance| > KES 5
 */

export interface ReconciliationData {
  businessId: string;
  date: string;
  posTotal: number;
  mpesaTotal: number;
  bankTotal: number;
  shifts: Array<{
    shiftId: string;
    cashierId: string;
    cashierName: string;
    posAmount: number;
    mpesaAmount: number;
    cashAmount: number;
    variance: number;
  }>;
}

export interface ReconciliationResult {
  variance: number;
  source: 'pos' | 'mpesa' | 'bank' | 'unknown';
  severity: 'low' | 'medium' | 'high';
  messageEn: string;
  messageSw: string;
  shiftsWithMismatch: string[];
}

export const reconciliationAgent = {
  /**
   * Run reconciliation for all businesses
   */
  async run(): Promise<{ processed: number; mismatches: number; notified: number }> {
    const today = new Date().toISOString().split('T')[0];
    const stats = { processed: 0, mismatches: 0, notified: 0 };

    // Get all active businesses
    const businesses = await db.query(
      `SELECT id, name, owner_id FROM businesses WHERE is_active = true`
    );

    for (const business of businesses.rows) {
      try {
        const result = await this.reconcileBusiness(business.id, today);
        stats.processed++;

        if (result.variance !== 0) {
          stats.mismatches++;

          // Notify if variance > KES 5 (500 cents)
          if (Math.abs(result.variance) > 500) {
            await this.notifyOwner(business.owner_id, result, business.name);
            stats.notified++;
          }
        }
      } catch (error) {
        console.error(`Reconciliation failed for business ${business.id}:`, error);
      }
    }

    console.log(`[ReconciliationAgent] Completed: ${stats.processed} businesses, ${stats.mismatches} mismatches, ${stats.notified} notified`);
    return stats;
  },

  /**
   * Reconcile a single business
   */
  async reconcileBusiness(businessId: string, date: string): Promise<ReconciliationResult> {
    // Get POS totals
    const posResult = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM transactions 
       WHERE business_id = $1 AND DATE(created_at) = $2`,
      [businessId, date]
    );
    const posTotal = parseInt(posResult.rows[0]?.total || 0);

    // Get M-Pesa totals from account_transactions
    const mpesaResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM account_transactions 
       WHERE business_id = $1 
         AND connection_type = 'mpesa_daraja'
         AND direction = 'in'
         AND DATE(timestamp) = $2`,
      [businessId, date]
    );
    const mpesaTotal = parseInt(mpesaResult.rows[0]?.total || 0);

    // Get bank deposit totals
    const bankResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM account_transactions 
       WHERE business_id = $1 
         AND connection_type IN ('stitch', 'mono')
         AND direction = 'in'
         AND DATE(timestamp) = $2`,
      [businessId, date]
    );
    const bankTotal = parseInt(bankResult.rows[0]?.total || 0);

    // Get shift details
    const shiftsResult = await db.query(
      `SELECT s.id, s.cashier_id, u.name as cashier_name,
              COALESCE(t.pos_total, 0) as pos_amount,
              COALESCE(t.mpesa_total, 0) as mpesa_amount,
              s.cash_opening_cents as cash_amount,
              (s.cash_closing_cents - s.cash_opening_cents) as variance
       FROM shifts s
       JOIN users u ON s.cashier_id = u.id
       LEFT JOIN LATERAL (
         SELECT 
           SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_total,
           SUM(CASE WHEN payment_method = 'mpesa' THEN total_amount ELSE 0 END) as mpesa_total,
           SUM(total_amount) as pos_total
         FROM transactions 
         WHERE shift_id = s.id AND DATE(created_at) = $2
       ) t ON true
       WHERE s.business_id = $1 
         AND DATE(s.started_at) = $2
         AND s.status = 'closed'`,
      [businessId, date]
    );

    const shifts = shiftsResult.rows.map(row => ({
      shiftId: row.id,
      cashierId: row.cashier_id,
      cashierName: row.cashier_name,
      posAmount: parseInt(row.pos_amount || 0),
      mpesaAmount: parseInt(row.mpesa_total || 0),
      cashAmount: parseInt(row.cash_amount || 0),
      variance: parseInt(row.variance || 0),
    }));

    // Call Manikka for analysis
    const manikkaResult = await this.callManikka({
      businessId,
      date,
      posTotal,
      mpesaTotal,
      bankTotal,
      shifts,
    });

    // Update shifts with mismatch flag
    for (const shift of shifts) {
      if (shift.variance !== 0) {
        await db.query(
          `UPDATE shifts SET has_mismatch = true, mismatch_amount = $1 WHERE id = $2`,
          [shift.variance, shift.shiftId]
        );
      }
    }

    // Create or update daily_pnl
    await dailyPnlService.upsertDailyPnl(businessId, date, {
      totalRevenue: posTotal,
      mpesaReceived: mpesaTotal,
      cashExpected: posTotal - mpesaTotal,
      cashVariance: manikkaResult.variance,
    });

    // Create alert if significant mismatch
    if (Math.abs(manikkaResult.variance) > 100) { // > KES 1
      await db.query(
        `INSERT INTO alerts (business_id, type, severity, title, body, data, created_at)
         VALUES ($1, 'reconciliation', $2, $3, $4, $5, NOW())`,
        [
          businessId,
          manikkaResult.severity,
          'Cash Mismatch Detected',
          manikkaResult.messageEn,
          JSON.stringify({ variance: manikkaResult.variance, shifts: shifts.filter(s => s.variance !== 0).map(s => s.shiftId) }),
        ]
      );
    }

    return manikkaResult;
  },

  /**
   * Call Manikka API for reconciliation analysis
   */
  async callManikka(data: ReconciliationData): Promise<ReconciliationResult> {
    const prompt = `You are a financial reconciliation agent. Given the following daily POS total [${data.posTotal}],
M-Pesa received [${data.mpesaTotal}], and bank deposits [${data.bankTotal}], calculate the three-way
variance and identify the most likely source of any discrepancy. 

Shift details:
${data.shifts.map(s => `- ${s.cashierName}: POS KES ${s.posAmount}, variance KES ${s.variance}`).join('\n')}

Return JSON: {variance, source, severity, message_en, message_sw}`;

    try {
      const response = await manikkaService.generate(prompt, {
        temperature: 0.3,
        responseFormat: { type: 'json_object' },
      });

      const result = JSON.parse(response);
      return {
        variance: result.variance || 0,
        source: result.source || 'unknown',
        severity: result.severity || 'low',
        messageEn: result.message_en || `Variance of KES ${result.variance} detected`,
        messageSw: result.message_sw || `Tofauti ya KES ${result.variance} imegunduliwa`,
        shiftsWithMismatch: data.shifts.filter(s => s.variance !== 0).map(s => s.shiftId),
      };
    } catch (error) {
      console.error('Manikka reconciliation failed:', error);
      
      // Fallback calculation
      const variance = data.posTotal - data.mpesaTotal - data.bankTotal;
      return {
        variance,
        source: variance > 0 ? 'pos' : 'mpesa',
        severity: Math.abs(variance) > 500 ? 'high' : Math.abs(variance) > 100 ? 'medium' : 'low',
        messageEn: `Cash variance of KES ${variance} detected. Please review shift closings.`,
        messageSw: `Tofauti ya pesa ya KES ${variance} imegunduliwa. Tafadhali angalia kufunga shift.`,
        shiftsWithMismatch: data.shifts.filter(s => s.variance !== 0).map(s => s.shiftId),
      };
    }
  },

  /**
   * Notify owner of mismatch
   */
  async notifyOwner(ownerId: string, result: ReconciliationResult, businessName: string): Promise<void> {
    await notificationsService.sendToUser(ownerId, {
      type: 'cash_mismatch',
      title: '⚠️ Cash Mismatch Detected',
      body: result.messageEn,
      data: {
        variance: result.variance,
        severity: result.severity,
        businessName,
      },
      channels: ['push', 'sms'],
    });
  },
};

export default reconciliationAgent;
