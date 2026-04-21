import { db } from '../../db';
import { notificationsService } from '../notifications.service';
import { manikkaService } from './manikka.service';

/**
 * Cashier Scoring Agent
 * Schedule: Nightly
 * 
 * Reads: shifts, transactions, stock_discrepancies (90-day rolling)
 * Does: Weighted 5-signal score. Pattern detection by day/time clustering.
 * Writes: cashier_scores (upsert — one row per cashier)
 * Notifies: Owner push if score drops below 50
 */

export interface CashierData {
  userId: string;
  userName: string;
  businessId: string;
  businessName: string;
  ownerId: string;
  shifts: Array<{
    shiftId: string;
    date: string;
    dayOfWeek: string;
    hourStarted: number;
    transactionsCount: number;
    voidCount: number;
    voidAmount: number;
    cashVariance: number;
    stockDiscrepancies: number;
    isReconciled: boolean;
    itemisedRate: number; // % of sales with product catalog
    receiptRate: number; // % of transactions with receipt delivered
  }>;
}

export interface CashierScoreResult {
  overallScore: number;
  cashAccuracyScore: number;
  stockIntegrityScore: number;
  recordingQualityScore: number;
  voidBehaviourScore: number;
  receiptDeliveryScore: number;
  patternDetected: boolean;
  patternDescription?: string;
  totalEstimatedLoss: number;
}

// Signal weights as per documentation
const SIGNAL_WEIGHTS = {
  cashAccuracy: 0.35,
  stockIntegrity: 0.25,
  recordingQuality: 0.20,
  voidBehaviour: 0.15,
  receiptDelivery: 0.05,
};

export const cashierScoringAgent = {
  /**
   * Run scoring for all cashiers
   */
  async run(): Promise<{ scored: number; scoreDrops: number; notified: number }> {
    const stats = { scored: 0, scoreDrops: 0, notified: 0 };

    // Get all businesses with active cashiers
    const businesses = await db.query(
      `SELECT DISTINCT b.id, b.name, b.owner_id, u.id as cashier_id, u.name as cashier_name
       FROM businesses b
       JOIN business_users bu ON b.id = bu.business_id
       JOIN users u ON bu.user_id = u.id
       WHERE b.is_active = true AND bu.role = 'cashier'`
    );

    for (const row of businesses.rows) {
      try {
        const data = await this.collectData(row.cashier_id, row.cashier_name, row.id, row.name, row.owner_id);
        
        if (!data || data.shifts.length < 5) {
          continue; // Need at least 5 shifts for meaningful scoring
        }

        const result = await this.calculateScore(data);

        // Get previous score for comparison
        const prevScoreResult = await db.query(
          `SELECT overall_score FROM cashier_scores 
           WHERE user_id = $1 AND business_id = $2 
           ORDER BY calculated_at DESC LIMIT 1`,
          [row.cashier_id, row.id]
        );
        const prevScore = prevScoreResult.rows[0]?.overall_score || 100;

        // Upsert score
        await db.query(
          `INSERT INTO cashier_scores (
            user_id, business_id, overall_score, cash_accuracy_score, stock_integrity_score,
            recording_quality_score, void_behaviour_score, receipt_delivery_score,
            pattern_note, total_estimated_loss, shift_count, last_shift_date, calculated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (user_id, business_id) DO UPDATE SET
            overall_score = EXCLUDED.overall_score,
            cash_accuracy_score = EXCLUDED.cash_accuracy_score,
            stock_integrity_score = EXCLUDED.stock_integrity_score,
            recording_quality_score = EXCLUDED.recording_quality_score,
            void_behaviour_score = EXCLUDED.void_behaviour_score,
            receipt_delivery_score = EXCLUDED.receipt_delivery_score,
            pattern_note = EXCLUDED.pattern_note,
            total_estimated_loss = EXCLUDED.total_estimated_loss,
            shift_count = EXCLUDED.shift_count,
            last_shift_date = EXCLUDED.last_shift_date,
            calculated_at = EXCLUDED.calculated_at`,
          [
            row.cashier_id,
            row.id,
            result.overallScore,
            result.cashAccuracyScore,
            result.stockIntegrityScore,
            result.recordingQualityScore,
            result.voidBehaviourScore,
            result.receiptDeliveryScore,
            result.patternDescription,
            result.totalEstimatedLoss,
            data.shifts.length,
            data.shifts[data.shifts.length - 1].date,
          ]
        );

        stats.scored++;

        // Check for significant score drop
        if (result.overallScore < 50 && prevScore >= 50) {
          stats.scoreDrops++;
          await this.notifyOwner(row.owner_id, result, row.cashier_name, row.name);
          stats.notified++;
        }

        // Also notify if already below 50 (ongoing concern)
        if (result.overallScore < 50 && prevScore < 50) {
          // Update alert but don't notify again unless it's been a week
          await this.updateOngoingAlert(row.id, row.cashier_id, result);
        }
      } catch (error) {
        console.error(`Cashier scoring failed for ${row.cashier_id}:`, error);
      }
    }

    console.log(`[CashierScoringAgent] Completed: ${stats.scored} scored, ${stats.scoreDrops} drops, ${stats.notified} notified`);
    return stats;
  },

  /**
   * Collect 90-day shift data for a cashier
   */
  async collectData(
    userId: string,
    userName: string,
    businessId: string,
    businessName: string,
    ownerId: string
  ): Promise<CashierData | null> {
    const shiftsResult = await db.query(
      `SELECT 
         s.id as shift_id,
         DATE(s.started_at) as date,
         TO_CHAR(s.started_at, 'Day') as day_of_week,
         EXTRACT(HOUR FROM s.started_at) as hour_started,
         COUNT(t.id) as transactions_count,
         SUM(CASE WHEN t.voided_at IS NOT NULL THEN 1 ELSE 0 END) as void_count,
         SUM(CASE WHEN t.voided_at IS NOT NULL THEN t.total_amount ELSE 0 END) as void_amount,
         COALESCE(s.cash_closing_cents - s.cash_opening_cents - (
           SUM(CASE WHEN t.payment_method = 'cash' THEN t.total_amount ELSE 0 END)
         ), 0) as cash_variance,
         COALESCE(sd.discrepancy_count, 0) as stock_discrepancies,
         s.is_reconciled,
         CASE WHEN COUNT(t.id) > 0 
           THEN (SUM(CASE WHEN t.has_itemised_products THEN 1 ELSE 0 END)::float / COUNT(t.id) * 100)
           ELSE 0 
         END as itemised_rate,
         CASE WHEN COUNT(t.id) > 0 
           THEN (SUM(CASE WHEN t.receipt_sent THEN 1 ELSE 0 END)::float / COUNT(t.id) * 100)
           ELSE 0 
         END as receipt_rate
       FROM shifts s
       LEFT JOIN transactions t ON s.id = t.shift_id
       LEFT JOIN (
         SELECT shift_id, COUNT(*) as discrepancy_count
         FROM stock_discrepancies
         WHERE created_by = $1
         GROUP BY shift_id
       ) sd ON s.id = sd.shift_id
       WHERE s.cashier_id = $1
         AND s.business_id = $2
         AND s.started_at >= NOW() - INTERVAL '90 days'
         AND s.status = 'closed'
       GROUP BY s.id, s.started_at, s.cash_opening_cents, s.cash_closing_cents, s.is_reconciled, sd.discrepancy_count
       ORDER BY s.started_at DESC`,
      [userId, businessId]
    );

    if (shiftsResult.rows.length === 0) {
      return null;
    }

    const shifts = shiftsResult.rows.map(row => ({
      shiftId: row.shift_id,
      date: row.date,
      dayOfWeek: row.day_of_week.trim(),
      hourStarted: parseInt(row.hour_started),
      transactionsCount: parseInt(row.transactions_count || 0),
      voidCount: parseInt(row.void_count || 0),
      voidAmount: parseInt(row.void_amount || 0),
      cashVariance: parseInt(row.cash_variance || 0),
      stockDiscrepancies: parseInt(row.stock_discrepancies || 0),
      isReconciled: row.is_reconciled,
      itemisedRate: parseFloat(row.itemised_rate || 0),
      receiptRate: parseFloat(row.receipt_rate || 0),
    }));

    return {
      userId,
      userName,
      businessId,
      businessName,
      ownerId,
      shifts,
    };
  },

  /**
   * Calculate weighted 5-signal score
   */
  async calculateScore(data: CashierData): Promise<CashierScoreResult> {
    const shifts = data.shifts;
    const totalShifts = shifts.length;

    // Calculate individual signal scores (0-100)
    
    // 1. Cash Accuracy (35%): % of shifts with zero cash variance
    const cashAccurateShifts = shifts.filter(s => s.cashVariance === 0).length;
    const cashAccuracyScore = Math.round((cashAccurateShifts / totalShifts) * 100);

    // 2. Stock Integrity (25%): % of shifts with zero stock discrepancies
    const stockCleanShifts = shifts.filter(s => s.stockDiscrepancies === 0).length;
    const stockIntegrityScore = Math.round((stockCleanShifts / totalShifts) * 100);

    // 3. Recording Quality (20%): Average itemised rate
    const recordingQualityScore = Math.round(
      shifts.reduce((sum, s) => sum + s.itemisedRate, 0) / totalShifts
    );

    // 4. Void Behaviour (15%): Inverse of void rate (fewer voids = higher score)
    const totalTransactions = shifts.reduce((sum, s) => sum + s.transactionsCount, 0);
    const totalVoids = shifts.reduce((sum, s) => sum + s.voidCount, 0);
    const voidRate = totalTransactions > 0 ? totalVoids / totalTransactions : 0;
    const voidBehaviourScore = Math.round(Math.max(0, 100 - (voidRate * 500))); // Penalize heavily for voids

    // 5. Receipt Delivery (5%): Average receipt rate
    const receiptDeliveryScore = Math.round(
      shifts.reduce((sum, s) => sum + s.receiptRate, 0) / totalShifts
    );

    // Calculate weighted composite score
    const overallScore = Math.round(
      cashAccuracyScore * SIGNAL_WEIGHTS.cashAccuracy +
      stockIntegrityScore * SIGNAL_WEIGHTS.stockIntegrity +
      recordingQualityScore * SIGNAL_WEIGHTS.recordingQuality +
      voidBehaviourScore * SIGNAL_WEIGHTS.voidBehaviour +
      receiptDeliveryScore * SIGNAL_WEIGHTS.receiptDelivery
    );

    // Calculate estimated loss
    const totalEstimatedLoss = shifts.reduce((sum, s) => {
      return sum + Math.abs(s.cashVariance) + Math.abs(s.voidAmount);
    }, 0);

    // Pattern detection via Manikka
    const patternResult = await this.detectPatterns(data);

    return {
      overallScore,
      cashAccuracyScore,
      stockIntegrityScore,
      recordingQualityScore,
      voidBehaviourScore,
      receiptDeliveryScore,
      patternDetected: patternResult.patternDetected,
      patternDescription: patternResult.patternDescription,
      totalEstimatedLoss,
    };
  },

  /**
   * Detect patterns using Manikka
   */
  async detectPatterns(data: CashierData): Promise<{
    patternDetected: boolean;
    patternDescription?: string;
    confidenceLevel?: number;
    recommendedAction?: string;
  }> {
    const shiftData = data.shifts.map(s => ({
      day: s.dayOfWeek,
      hour: s.hourStarted,
      variance: s.cashVariance,
      voids: s.voidCount,
      stockGaps: s.stockDiscrepancies,
    }));

    const prompt = `Analyze this cashier's performance data over the last 90 days:
${JSON.stringify(shiftData)}

Identify any patterns in when mismatches occur (day of week, time of day, specific products).
Return JSON: {pattern_detected, pattern_description, confidence_level, recommended_action}`;

    try {
      const response = await manikkaService.generate(prompt, {
        temperature: 0.5,
        responseFormat: { type: 'json_object' },
      });

      const result = JSON.parse(response);
      return {
        patternDetected: result.pattern_detected || false,
        patternDescription: result.pattern_description,
        confidenceLevel: result.confidence_level || 0,
        recommendedAction: result.recommended_action,
      };
    } catch (error) {
      console.error('Manikka pattern detection failed:', error);

      // Simple pattern detection fallback
      const dayCount: Record<string, number> = {};
      let maxDay = '';
      let maxCount = 0;

      for (const shift of data.shifts) {
        if (shift.cashVariance !== 0 || shift.voidCount > 2) {
          dayCount[shift.dayOfWeek] = (dayCount[shift.dayOfWeek] || 0) + 1;
          if (dayCount[shift.dayOfWeek] > maxCount) {
            maxCount = dayCount[shift.dayOfWeek];
            maxDay = shift.dayOfWeek;
          }
        }
      }

      if (maxCount >= 3) {
        return {
          patternDetected: true,
          patternDescription: `Higher error rate on ${maxDay}s (${maxCount} incidents)`,
          confidenceLevel: Math.min(0.8, maxCount / 5),
          recommendedAction: 'Provide additional supervision on ' + maxDay + 's',
        };
      }

      return {
        patternDetected: false,
        patternDescription: undefined,
        confidenceLevel: 0,
        recommendedAction: 'Continue monitoring',
      };
    }
  },

  /**
   * Notify owner of score drop
   */
  async notifyOwner(
    ownerId: string,
    result: CashierScoreResult,
    cashierName: string,
    businessName: string
  ): Promise<void> {
    await notificationsService.sendToUser(ownerId, {
      type: 'cashier_score_drop',
      title: '⚠️ Cashier Score Alert',
      body: `${cashierName}'s reliability score dropped to ${result.overallScore}/100. ${result.patternDetected ? 'Pattern detected: ' + result.patternDescription : ''}`,
      data: {
        cashierName,
        overallScore: result.overallScore,
        patternDetected: result.patternDetected,
        patternDescription: result.patternDescription,
        estimatedLoss: result.totalEstimatedLoss,
        businessName,
      },
      channels: ['push'],
    });
  },

  /**
   * Update ongoing alert for low-score cashier
   */
  async updateOngoingAlert(
    businessId: string,
    cashierId: string,
    result: CashierScoreResult
  ): Promise<void> {
    // Update or create ongoing alert
    await db.query(
      `INSERT INTO alerts (business_id, type, severity, title, body, data, created_at, is_read)
       VALUES ($1, 'cashier_score_ongoing', 'warning', $2, $3, $4, NOW(), true)
       ON CONFLICT (business_id, type, (data->>'cashierId')) DO UPDATE SET
         body = EXCLUDED.body,
         data = EXCLUDED.data,
         created_at = NOW()`,
      [
        businessId,
        'Cashier Score Below Threshold',
        `Score: ${result.overallScore}/100. Estimated loss: KES ${(result.totalEstimatedLoss / 100).toLocaleString()}`,
        JSON.stringify({ cashierId, overallScore: result.overallScore }),
      ]
    );
  },
};

export default cashierScoringAgent;
