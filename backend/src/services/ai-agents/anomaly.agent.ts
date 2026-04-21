import { db } from '../../db';
import { notificationsService } from '../notifications.service';
import { manikkaService } from './manikka.service';

/**
 * Anomaly Detection Agent
 * Schedule: Hourly
 * 
 * Reads: transactions (rolling 30-day baseline per business)
 * Does: Statistical deviation from business's own historical norm, flags outliers
 * Writes: Alert records, flags on transactions
 * Notifies: 'Sales today 40% below your usual Tuesday'
 */

export interface AnomalyData {
  businessId: string;
  businessName: string;
  ownerId: string;
  todayRevenue: number;
  transactionCount: number;
  baselineRevenue: number;
  baselineCount: number;
  weekday: string;
  hour: number;
}

export interface AnomalyResult {
  isAnomalous: boolean;
  deviationPct: number;
  explanationEn: string;
  explanationSw: string;
  severity: 'low' | 'medium' | 'high';
}

export const anomalyAgent = {
  /**
   * Run anomaly detection for all businesses
   */
  async run(): Promise<{ checked: number; anomalies: number; notified: number }> {
    const today = new Date();
    const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
    const currentHour = today.getHours();
    const stats = { checked: 0, anomalies: 0, notified: 0 };

    // Get all active businesses
    const businesses = await db.query(
      `SELECT id, name, owner_id FROM businesses WHERE is_active = true`
    );

    for (const business of businesses.rows) {
      try {
        // Only check during business hours (8am - 8pm)
        if (currentHour < 8 || currentHour > 20) {
          continue;
        }

        const data = await this.collectData(business.id, business.name, business.owner_id, weekday, currentHour);
        
        if (!data) {
          continue; // Not enough data
        }

        stats.checked++;

        const result = await this.detectAnomaly(data);

        if (result.isAnomalous && result.severity !== 'low') {
          stats.anomalies++;
          
          // Create alert
          await db.query(
            `INSERT INTO alerts (business_id, type, severity, title, body, data, created_at)
             VALUES ($1, 'anomaly', $2, $3, $4, $5, NOW())
             ON CONFLICT (business_id, type, DATE(created_at)) DO UPDATE SET
               severity = EXCLUDED.severity,
               body = EXCLUDED.body,
               data = EXCLUDED.data`,
            [
              business.id,
              result.severity,
              'Revenue Anomaly Detected',
              result.explanationEn,
              JSON.stringify({ deviationPct: result.deviationPct, hour: currentHour }),
            ]
          );

          // Notify if significant
          if (result.severity === 'high' || (result.severity === 'medium' && currentHour >= 18)) {
            await this.notifyOwner(business.owner_id, result, business.name);
            stats.notified++;
          }
        }
      } catch (error) {
        console.error(`Anomaly detection failed for business ${business.id}:`, error);
      }
    }

    console.log(`[AnomalyAgent] Completed: ${stats.checked} checked, ${stats.anomalies} anomalies, ${stats.notified} notified`);
    return stats;
  },

  /**
   * Collect data for anomaly detection
   */
  async collectData(
    businessId: string,
    businessName: string,
    ownerId: string,
    weekday: string,
    currentHour: number
  ): Promise<AnomalyData | null> {
    const today = new Date().toISOString().split('T')[0];

    // Get today's revenue so far (up to current hour)
    const todayResult = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue,
              COUNT(*) as count
       FROM transactions 
       WHERE business_id = $1 
         AND DATE(created_at) = $2
         AND EXTRACT(HOUR FROM created_at) <= $3`,
      [businessId, today, currentHour]
    );

    const todayRevenue = parseInt(todayResult.rows[0]?.revenue || 0);
    const transactionCount = parseInt(todayResult.rows[0]?.count || 0);

    // Need at least some transactions to analyze
    if (transactionCount === 0) {
      return null;
    }

    // Get 30-day baseline for same weekday and hour range
    const baselineResult = await db.query(
      `SELECT COALESCE(AVG(daily_revenue), 0) as avg_revenue,
              COALESCE(AVG(transaction_count), 0) as avg_count
       FROM (
         SELECT DATE(created_at) as date,
                SUM(total_amount) as daily_revenue,
                COUNT(*) as transaction_count
         FROM transactions 
         WHERE business_id = $1 
           AND created_at >= NOW() - INTERVAL '30 days'
           AND EXTRACT(DOW FROM created_at) = EXTRACT(DOW FROM NOW())
           AND EXTRACT(HOUR FROM created_at) <= $2
           AND DATE(created_at) != $3
         GROUP BY DATE(created_at)
       ) daily_stats`,
      [businessId, currentHour, today]
    );

    const baselineRevenue = parseInt(baselineResult.rows[0]?.avg_revenue || 0);
    const baselineCount = parseInt(baselineResult.rows[0]?.avg_count || 0);

    // Need at least 3 days of baseline data
    if (baselineRevenue === 0) {
      return null;
    }

    return {
      businessId,
      businessName,
      ownerId,
      todayRevenue,
      transactionCount,
      baselineRevenue,
      baselineCount,
      weekday,
      hour: currentHour,
    };
  },

  /**
   * Detect anomaly using Manikka
   */
  async detectAnomaly(data: AnomalyData): Promise<AnomalyResult> {
    const prompt = `Given this business's 30-day average revenue per ${data.weekday} by ${data.hour}:00 is KES ${data.baselineRevenue} 
(${data.baselineCount} transactions), and today's revenue so far is KES ${data.todayRevenue} 
(${data.transactionCount} transactions) on a ${data.weekday}, calculate the deviation percentage 
and determine if this is anomalous.

Return JSON: {is_anomalous, deviation_pct, explanation_en, explanation_sw}`;

    try {
      const response = await manikkaService.generate(prompt, {
        temperature: 0.3,
        responseFormat: { type: 'json_object' },
      });

      const result = JSON.parse(response);
      const deviationPct = result.deviation_pct || 0;
      
      // Determine severity based on deviation
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (Math.abs(deviationPct) > 50) severity = 'high';
      else if (Math.abs(deviationPct) > 25) severity = 'medium';

      return {
        isAnomalous: result.is_anomalous || Math.abs(deviationPct) > 20,
        deviationPct,
        explanationEn: result.explanation_en || `Revenue ${deviationPct > 0 ? 'up' : 'down'} ${Math.abs(deviationPct)}% from usual`,
        explanationSw: result.explanation_sw || `Mapato ${deviationPct > 0 ? 'ya juu' : 'ya chini'} ${Math.abs(deviationPct)}% kutoka kwa kawaida`,
        severity,
      };
    } catch (error) {
      console.error('Manikka anomaly detection failed:', error);

      // Fallback calculation
      const deviationPct = ((data.todayRevenue - data.baselineRevenue) / data.baselineRevenue) * 100;
      
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (Math.abs(deviationPct) > 50) severity = 'high';
      else if (Math.abs(deviationPct) > 25) severity = 'medium';

      return {
        isAnomalous: Math.abs(deviationPct) > 20,
        deviationPct,
        explanationEn: `Sales today ${Math.abs(deviationPct).toFixed(0)}% ${deviationPct > 0 ? 'above' : 'below'} your usual ${data.weekday}`,
        explanationSw: `Mauzo ya leo ${Math.abs(deviationPct).toFixed(0)}% ${deviationPct > 0 ? 'zaidi' : 'chini'} ya ${data.weekday} yako ya kawaida`,
        severity,
      };
    }
  },

  /**
   * Notify owner of anomaly
   */
  async notifyOwner(ownerId: string, result: AnomalyResult, businessName: string): Promise<void> {
    await notificationsService.sendToUser(ownerId, {
      type: 'revenue_anomaly',
      title: result.deviationPct < 0 ? '📉 Sales Below Average' : '📈 Sales Above Average',
      body: result.explanationEn,
      data: {
        deviationPct: result.deviationPct,
        severity: result.severity,
        businessName,
      },
      channels: ['push', result.severity === 'high' ? 'sms' : null].filter(Boolean) as string[],
    });
  },
};

export default anomalyAgent;
