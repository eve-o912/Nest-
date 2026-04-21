import { db } from '../../db';
import { notificationsService } from '../notifications.service';
import { manikkaService } from './manikka.service';
import { savingsService } from '../savings.service';

/**
 * Auto-Save Optimizer Agent
 * Schedule: Daily
 * 
 * Reads: daily_pnl (last 14 days), savings_wallet
 * Does: Checks if revenue is abnormally low. Suggests rate adjustment to protect cash flow.
 * Writes: Suggestion record. May reduce rate on very slow days.
 * Notifies: 'Slow week — we reduced your save rate to 3% to protect cash flow'
 */

export interface AutoSaveData {
  businessId: string;
  businessName: string;
  ownerId: string;
  currentRate: number; // e.g., 5 = 5%
  walletBalance: number;
  savingsGoal: number;
  last14Days: Array<{
    date: string;
    revenue: number;
    netProfit: number;
    autoSaved: number;
  }>;
  avgDailyRevenue: number;
  avgDailyProfit: number;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
}

export interface AutoSaveRecommendation {
  shouldAdjust: boolean;
  recommendedRate: number;
  reasonEn: string;
  reasonSw: string;
  confidence: number;
}

export const autoSaveAgent = {
  /**
   * Run auto-save optimization for all businesses
   */
  async run(): Promise<{ checked: number; adjusted: number; notified: number }> {
    const stats = { checked: 0, adjusted: 0, notified: 0 };

    // Get all active businesses with auto-save enabled
    const businesses = await db.query(
      `SELECT b.id, b.name, b.owner_id, sw.auto_save_rate, sw.balance_cents, sw.goal_cents
       FROM businesses b
       JOIN savings_wallets sw ON b.id = sw.business_id
       WHERE b.is_active = true AND sw.auto_save_enabled = true`
    );

    for (const business of businesses.rows) {
      try {
        const data = await this.collectData(
          business.id,
          business.name,
          business.owner_id,
          parseInt(business.auto_save_rate || 5),
          parseInt(business.balance_cents || 0),
          parseInt(business.goal_cents || 0)
        );

        if (!data) {
          continue; // Not enough data
        }

        stats.checked++;

        const recommendation = await this.analyzeAndRecommend(data);

        // Log suggestion
        await db.query(
          `INSERT INTO auto_save_suggestions (
            business_id, current_rate, recommended_rate, reason, 
            confidence, trend_direction, created_at, applied
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
          [
            business.id,
            data.currentRate,
            recommendation.recommendedRate,
            recommendation.reasonEn,
            recommendation.confidence,
            data.trendDirection,
            recommendation.shouldAdjust, // If we should adjust, we apply immediately
          ]
        );

        // If recommendation is to reduce rate significantly, apply it
        if (recommendation.shouldAdjust && recommendation.recommendedRate < data.currentRate) {
          await savingsService.updateAutoSaveRate(business.id, recommendation.recommendedRate);
          stats.adjusted++;

          // Notify owner
          await this.notifyOwner(business.owner_id, recommendation, business.name, data.currentRate);
          stats.notified++;
        }

        // If business is doing well and rate was previously reduced, suggest increasing
        if (recommendation.shouldAdjust && 
            recommendation.recommendedRate > data.currentRate && 
            data.trendDirection === 'increasing') {
          // Don't auto-increase, just notify with suggestion
          await this.notifyIncreaseSuggestion(business.owner_id, recommendation, business.name);
        }
      } catch (error) {
        console.error(`Auto-save optimization failed for business ${business.id}:`, error);
      }
    }

    console.log(`[AutoSaveAgent] Completed: ${stats.checked} checked, ${stats.adjusted} adjusted, ${stats.notified} notified`);
    return stats;
  },

  /**
   * Collect 14-day revenue data
   */
  async collectData(
    businessId: string,
    businessName: string,
    ownerId: string,
    currentRate: number,
    walletBalance: number,
    savingsGoal: number
  ): Promise<AutoSaveData | null> {
    // Get last 14 days of P&L
    const pnlResult = await db.query(
      `SELECT 
         date,
         total_revenue,
         net_profit,
         auto_saved
       FROM daily_pnl 
       WHERE business_id = $1 
         AND date >= CURRENT_DATE - INTERVAL '14 days'
       ORDER BY date`,
      [businessId]
    );

    if (pnlResult.rows.length < 7) {
      return null; // Need at least 7 days of data
    }

    const last14Days = pnlResult.rows.map(row => ({
      date: row.date,
      revenue: parseInt(row.total_revenue || 0),
      netProfit: parseInt(row.net_profit || 0),
      autoSaved: parseInt(row.auto_saved || 0),
    }));

    // Calculate averages
    const avgDailyRevenue = last14Days.reduce((sum, d) => sum + d.revenue, 0) / last14Days.length;
    const avgDailyProfit = last14Days.reduce((sum, d) => sum + d.netProfit, 0) / last14Days.length;

    // Determine trend (compare first 7 days to last 7 days)
    const firstWeek = last14Days.slice(0, 7);
    const secondWeek = last14Days.slice(7, 14);
    
    const firstWeekAvg = firstWeek.reduce((sum, d) => sum + d.revenue, 0) / firstWeek.length;
    const secondWeekAvg = secondWeek.reduce((sum, d) => sum + d.revenue, 0) / secondWeek.length;

    let trendDirection: 'increasing' | 'stable' | 'decreasing' = 'stable';
    const changePct = ((secondWeekAvg - firstWeekAvg) / firstWeekAvg) * 100;
    
    if (changePct > 15) {
      trendDirection = 'increasing';
    } else if (changePct < -15) {
      trendDirection = 'decreasing';
    }

    return {
      businessId,
      businessName,
      ownerId,
      currentRate,
      walletBalance,
      savingsGoal,
      last14Days,
      avgDailyRevenue,
      avgDailyProfit,
      trendDirection,
    };
  },

  /**
   * Analyze and recommend rate adjustment
   */
  async analyzeAndRecommend(data: AutoSaveData): Promise<AutoSaveRecommendation> {
    const revenueTrend = data.last14Days.map(d => ({
      date: d.date,
      revenue: d.revenue,
      profit: d.netProfit,
    }));

    const prompt = `Given this business's last 14-day revenue trend:
${JSON.stringify(revenueTrend)}

Current auto-save rate: ${data.currentRate}%
Trend direction: ${data.trendDirection}
Average daily revenue: KES ${(data.avgDailyRevenue / 100).toLocaleString()}
Average daily profit: KES ${(data.avgDailyProfit / 100).toLocaleString()}

Determine if the auto-save rate should be temporarily reduced to protect working capital.
Consider:
- If revenue is declining significantly, reduce rate
- If profit margins are thin, reduce rate
- If savings goal is nearly met, can maintain or increase
- If revenue is stable/increasing, maintain current rate

Return JSON: {should_adjust, recommended_rate, reason_en, reason_sw}`;

    try {
      const response = await manikkaService.generate(prompt, {
        temperature: 0.4,
        responseFormat: { type: 'json_object' },
      });

      const result = JSON.parse(response);
      
      return {
        shouldAdjust: result.should_adjust || false,
        recommendedRate: Math.max(1, Math.min(20, result.recommended_rate || data.currentRate)),
        reasonEn: result.reason_en || 'Based on recent revenue trends',
        reasonSw: result.reason_sw || 'Kulingana na mwelekeo wa mapato ya hivi karibuni',
        confidence: 0.8,
      };
    } catch (error) {
      console.error('Manikka auto-save analysis failed:', error);

      // Fallback logic
      let shouldAdjust = false;
      let recommendedRate = data.currentRate;
      let reasonEn = 'Maintaining current rate';

      // If revenue declining and current rate > 5%, suggest reduction
      if (data.trendDirection === 'decreasing' && data.currentRate > 5) {
        shouldAdjust = true;
        recommendedRate = Math.max(3, data.currentRate - 2);
        reasonEn = 'Revenue declining - reducing rate to protect cash flow';
      }
      
      // If profit margin < 10%, be conservative
      const profitMargin = data.avgDailyRevenue > 0 
        ? (data.avgDailyProfit / data.avgDailyRevenue) * 100 
        : 0;
      
      if (profitMargin < 10 && data.currentRate > 5) {
        shouldAdjust = true;
        recommendedRate = Math.min(recommendedRate, 3);
        reasonEn = 'Low profit margins - protecting working capital';
      }

      // If goal is 90%+ met, can reduce temporarily
      const goalProgress = data.savingsGoal > 0 
        ? (data.walletBalance / data.savingsGoal) * 100 
        : 0;
      
      if (goalProgress >= 90 && data.currentRate > 3) {
        shouldAdjust = true;
        recommendedRate = Math.min(recommendedRate, 3);
        reasonEn = 'Savings goal nearly achieved - easing contribution';
      }

      return {
        shouldAdjust,
        recommendedRate,
        reasonEn,
        reasonSw: shouldAdjust 
          ? 'Kulinda fedha za kazi - kiwango kimepunguzwa'
          : 'Kudumisha kiwango cha sasa',
        confidence: 0.6,
      };
    }
  },

  /**
   * Notify owner of rate reduction
   */
  async notifyOwner(
    ownerId: string,
    recommendation: AutoSaveRecommendation,
    businessName: string,
    oldRate: number
  ): Promise<void> {
    await notificationsService.sendToUser(ownerId, {
      type: 'auto_save_adjusted',
      title: '💰 Auto-Save Rate Adjusted',
      body: recommendation.reasonEn,
      data: {
        oldRate,
        newRate: recommendation.recommendedRate,
        reason: recommendation.reasonEn,
        reasonSw: recommendation.reasonSw,
        businessName,
      },
      channels: ['push'],
    });
  },

  /**
   * Notify owner of increase suggestion (not auto-applied)
   */
  async notifyIncreaseSuggestion(
    ownerId: string,
    recommendation: AutoSaveRecommendation,
    businessName: string
  ): Promise<void> {
    await notificationsService.sendToUser(ownerId, {
      type: 'auto_save_suggestion',
      title: '💡 Auto-Save Suggestion',
      body: `Revenue is trending up! Consider increasing your auto-save rate to ${recommendation.recommendedRate}%`,
      data: {
        suggestedRate: recommendation.recommendedRate,
        reason: recommendation.reasonEn,
        businessName,
      },
      channels: ['push'],
    });
  },
};

export default autoSaveAgent;
