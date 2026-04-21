import { db } from '../../db';
import { notificationsService } from '../notifications.service';
import { manikkaService } from './manikka.service';

/**
 * Business Insight Agent
 * Schedule: Weekly Monday 7am
 * 
 * Reads: daily_pnl (last 7 days)
 * Does: Passes P&L JSON to Claude/Manikka, generates plain-language weekly summary
 * Writes: insight_reports table
 * Notifies: WhatsApp message every Monday 7am
 */

export interface WeeklyPnLData {
  businessId: string;
  businessName: string;
  ownerId: string;
  ownerLanguage: string;
  weekStart: string;
  weekEnd: string;
  dailyData: Array<{
    date: string;
    revenue: number;
    expenses: number;
    netProfit: number;
    margin: number;
    transactions: number;
  }>;
  totals: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    avgMargin: number;
    totalTransactions: number;
  };
  comparison: {
    prevWeekRevenue: number;
    prevWeekProfit: number;
    revenueChange: number;
    profitChange: number;
  };
}

export interface InsightResult {
  insightEn: string;
  insightSw: string;
  bestDay: string;
  worstDay: string;
  recommendation: string;
  summary: string;
}

export const insightAgent = {
  /**
   * Run weekly insight generation for all businesses
   */
  async run(): Promise<{ generated: number; notified: number }> {
    const today = new Date();
    
    // Only run on Mondays
    if (today.getDay() !== 1) {
      console.log('[InsightAgent] Skipping - not Monday');
      return { generated: 0, notified: 0 };
    }

    const stats = { generated: 0, notified: 0 };

    // Get all active businesses with WhatsApp enabled
    const businesses = await db.query(
      `SELECT b.id, b.name, b.owner_id, u.preferred_language
       FROM businesses b
       JOIN users u ON b.owner_id = u.id
       JOIN notification_settings ns ON b.id = ns.business_id
       WHERE b.is_active = true AND ns.weekly_insight = true`
    );

    for (const business of businesses.rows) {
      try {
        const data = await this.collectData(business.id, business.name, business.owner_id, business.preferred_language || 'en');
        
        if (!data) {
          continue; // Not enough data
        }

        const result = await this.generateInsight(data);

        // Save to insight_reports
        await db.query(
          `INSERT INTO insight_reports (business_id, week_start, week_end, insight_en, insight_sw, data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            business.id,
            data.weekStart,
            data.weekEnd,
            result.insightEn,
            result.insightSw,
            JSON.stringify(data),
          ]
        );

        stats.generated++;

        // Send WhatsApp notification
        await this.notifyOwner(business.owner_id, result, business.preferred_language || 'en', business.name);
        stats.notified++;
      } catch (error) {
        console.error(`Insight generation failed for business ${business.id}:`, error);
      }
    }

    console.log(`[InsightAgent] Completed: ${stats.generated} insights generated, ${stats.notified} notified`);
    return stats;
  },

  /**
   * Collect weekly P&L data
   */
  async collectData(
    businessId: string,
    businessName: string,
    ownerId: string,
    language: string
  ): Promise<WeeklyPnLData | null> {
    // Calculate last week (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - daysSinceMonday - 1); // Last Sunday
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6); // Last Monday

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Get daily P&L for the week
    const pnlResult = await db.query(
      `SELECT 
         date,
         total_revenue,
         total_expenses,
         net_profit,
         CASE WHEN total_revenue > 0 
           THEN (net_profit::float / total_revenue * 100) 
           ELSE 0 
         END as margin,
         transaction_count
       FROM daily_pnl 
       WHERE business_id = $1 
         AND date >= $2 
         AND date <= $3
       ORDER BY date`,
      [businessId, weekStartStr, weekEndStr]
    );

    if (pnlResult.rows.length < 3) {
      return null; // Need at least 3 days of data
    }

    const dailyData = pnlResult.rows.map(row => ({
      date: row.date,
      revenue: parseInt(row.total_revenue || 0),
      expenses: parseInt(row.total_expenses || 0),
      netProfit: parseInt(row.net_profit || 0),
      margin: parseFloat(row.margin || 0),
      transactions: parseInt(row.transaction_count || 0),
    }));

    // Calculate totals
    const totals = {
      totalRevenue: dailyData.reduce((sum, d) => sum + d.revenue, 0),
      totalExpenses: dailyData.reduce((sum, d) => sum + d.expenses, 0),
      totalProfit: dailyData.reduce((sum, d) => sum + d.netProfit, 0),
      avgMargin: dailyData.reduce((sum, d) => sum + d.margin, 0) / dailyData.length,
      totalTransactions: dailyData.reduce((sum, d) => sum + d.transactions, 0),
    };

    // Get previous week for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(weekEnd.getDate() - 7);

    const prevResult = await db.query(
      `SELECT 
         SUM(total_revenue) as revenue,
         SUM(net_profit) as profit
       FROM daily_pnl 
       WHERE business_id = $1 
         AND date >= $2 
         AND date <= $3`,
      [businessId, prevWeekStart.toISOString().split('T')[0], prevWeekEnd.toISOString().split('T')[0]]
    );

    const prevWeekRevenue = parseInt(prevResult.rows[0]?.revenue || 0);
    const prevWeekProfit = parseInt(prevResult.rows[0]?.profit || 0);

    const comparison = {
      prevWeekRevenue,
      prevWeekProfit,
      revenueChange: prevWeekRevenue > 0 ? ((totals.totalRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : 0,
      profitChange: prevWeekProfit > 0 ? ((totals.totalProfit - prevWeekProfit) / prevWeekProfit) * 100 : 0,
    };

    return {
      businessId,
      businessName,
      ownerId,
      ownerLanguage: language,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      dailyData,
      totals,
      comparison,
    };
  },

  /**
   * Generate insight using Manikka
   */
  async generateInsight(data: WeeklyPnLData): Promise<InsightResult> {
    const pnlJson = JSON.stringify({
      week: `${data.weekStart} to ${data.weekEnd}`,
      totalRevenue: data.totals.totalRevenue,
      totalExpenses: data.totals.totalExpenses,
      totalProfit: data.totals.totalProfit,
      avgMargin: data.totals.avgMargin.toFixed(1) + '%',
      totalTransactions: data.totals.totalTransactions,
      dailyBreakdown: data.dailyData.map(d => ({
        day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: d.revenue,
        profit: d.netProfit,
        margin: d.margin.toFixed(1) + '%',
      })),
      vsLastWeek: {
        revenueChange: (data.comparison.revenueChange > 0 ? '+' : '') + data.comparison.revenueChange.toFixed(1) + '%',
        profitChange: (data.comparison.profitChange > 0 ? '+' : '') + data.comparison.profitChange.toFixed(1) + '%',
      },
    });

    const promptEn = `You are a business advisor for a small business in Kenya. Analyze this week's P&L data:
${pnlJson}

Write a WhatsApp message (max 200 words) that:
1) highlights the best and worst day
2) notes any margin changes vs last week
3) gives one actionable recommendation

Write in English. Be direct and practical.`;

    const promptSw = `You are a business advisor for a small business in Kenya. Analyze this week's P&L data:
${pnlJson}

Write a WhatsApp message (max 200 words) that:
1) highlights the best and worst day
2) notes any margin changes vs last week
3) gives one actionable recommendation

Write in Swahili. Be direct and practical.`;

    try {
      // Generate both languages in parallel
      const [responseEn, responseSw] = await Promise.all([
        manikkaService.generate(promptEn, { temperature: 0.7, maxTokens: 400 }),
        manikkaService.generate(promptSw, { temperature: 0.7, maxTokens: 400 }),
      ]);

      // Find best and worst days
      const sortedByProfit = [...data.dailyData].sort((a, b) => b.netProfit - a.netProfit);
      const bestDay = sortedByProfit[0];
      const worstDay = sortedByProfit[sortedByProfit.length - 1];

      return {
        insightEn: responseEn.trim(),
        insightSw: responseSw.trim(),
        bestDay: new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long' }),
        worstDay: new Date(worstDay.date).toLocaleDateString('en-US', { weekday: 'long' }),
        recommendation: 'Monitor margins closely', // Placeholder - Manikka should provide this
        summary: `Week: +${data.comparison.revenueChange.toFixed(1)}% revenue, +${data.comparison.profitChange.toFixed(1)}% profit`,
      };
    } catch (error) {
      console.error('Manikka insight generation failed:', error);

      // Fallback
      const sortedByProfit = [...data.dailyData].sort((a, b) => b.netProfit - a.netProfit);
      const bestDay = sortedByProfit[0];
      const worstDay = sortedByProfit[sortedByProfit.length - 1];

      return {
        insightEn: `📊 Weekly Summary\n\nRevenue: KES ${(data.totals.totalRevenue / 100).toLocaleString()}\nProfit: KES ${(data.totals.totalProfit / 100).toLocaleString()}\nMargin: ${data.totals.avgMargin.toFixed(1)}%\n\nBest day: ${new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long' })} (KES ${(bestDay.netProfit / 100).toLocaleString()})\nWatch: ${new Date(worstDay.date).toLocaleDateString('en-US', { weekday: 'long' })} (KES ${(worstDay.netProfit / 100).toLocaleString()})\n\nRecommendation: Focus on high-margin products.`,
        insightSw: `📊 Muhtasari wa Wiki\n\nMapato: KES ${(data.totals.totalRevenue / 100).toLocaleString()}\nFaida: KES ${(data.totals.totalProfit / 100).toLocaleString()}\n\nSiku bora: ${new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long' })}\n\nShauri: Songamza bidhaa za faida kubwa.`,
        bestDay: new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long' }),
        worstDay: new Date(worstDay.date).toLocaleDateString('en-US', { weekday: 'long' }),
        recommendation: 'Focus on high-margin products',
        summary: `Week: +${data.comparison.revenueChange.toFixed(1)}% revenue, +${data.comparison.profitChange.toFixed(1)}% profit`,
      };
    }
  },

  /**
   * Notify owner via WhatsApp
   */
  async notifyOwner(ownerId: string, result: InsightResult, language: string, businessName: string): Promise<void> {
    const message = language === 'sw' ? result.insightSw : result.insightEn;
    
    await notificationsService.sendToUser(ownerId, {
      type: 'weekly_insight',
      title: '📊 Weekly Business Summary',
      body: message,
      data: {
        bestDay: result.bestDay,
        worstDay: result.worstDay,
        recommendation: result.recommendation,
        summary: result.summary,
        businessName,
      },
      channels: ['whatsapp', 'push'],
    });
  },
};

export default insightAgent;
