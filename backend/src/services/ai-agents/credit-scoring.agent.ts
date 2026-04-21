import { db } from '../../db';
import { notificationsService } from '../notifications.service';
import { manikkaService } from './manikka.service';

/**
 * Credit Scoring Agent
 * Schedule: Weekly
 * 
 * Reads: daily_pnl, savings_entries, cashier_scores, stock_discrepancies, receipt_deliveries
 * Does: Builds composite financial passport. 6-signal weighted score. Loan limit calculation.
 * Writes: financial_passport (upsert). Triggers on-chain anchor if Phase 3 active.
 * Notifies: 'Your loan limit increased to KES 120,000' when milestone crossed
 */

// 6-signal weights as per documentation
const SIGNAL_WEIGHTS = {
  revenueConsistency: 0.25,
  netMargins: 0.20,
  savingsConsistency: 0.20,
  dataIntegrity: 0.15,
  staffReliability: 0.10,
  platformEngagement: 0.10,
};

export interface CreditScoringData {
  businessId: string;
  businessName: string;
  ownerId: string;
  
  // Revenue data (min 60 days)
  dailyPnl: Array<{
    date: string;
    revenue: number;
    expenses: number;
    netProfit: number;
    margin: number;
    transactions: number;
    isClosed: boolean;
  }>;
  
  // Savings data
  savingsEntries: Array<{
    date: string;
    amount: number;
    type: 'auto' | 'manual' | 'withdrawal';
  }>;
  walletBalance: number;
  
  // Cashier data
  cashierScores: Array<{
    userId: string;
    overallScore: number;
    totalEstimatedLoss: number;
  }>;
  
  // Integrity data
  stockDiscrepancies: number;
  unreconciledShifts: number;
  receiptDeliveryRate: number;
  
  // Engagement
  daysActive: number;
  lastLogin: string;
  appOpensPerWeek: number;
}

export interface PassportResult {
  overallScore: number;
  revenueScore: number;
  marginScore: number;
  savingsScore: number;
  integrityScore: number;
  staffScore: number;
  engagementScore: number;
  loanLimit: number;
  avgDailyRevenue: number;
  revenueConsistency: number;
  avgNetMargin: number;
  dataHash: string;
  lenderSummary: string;
  previousLoanLimit?: number;
}

export const creditScoringAgent = {
  /**
   * Run credit scoring for all eligible businesses
   */
  async run(): Promise<{ scored: number; limitIncreases: number; notified: number }> {
    const stats = { scored: 0, limitIncreases: 0, notified: 0 };

    // Get all active businesses with at least 60 days of data
    const businesses = await db.query(
      `SELECT b.id, b.name, b.owner_id,
              MIN(dp.date) as first_data_date,
              COUNT(DISTINCT dp.date) as data_days
       FROM businesses b
       JOIN daily_pnl dp ON b.id = dp.business_id
       WHERE b.is_active = true
       GROUP BY b.id, b.name, b.owner_id
       HAVING COUNT(DISTINCT dp.date) >= 60`
    );

    for (const business of businesses.rows) {
      try {
        const data = await this.collectData(
          business.id,
          business.name,
          business.owner_id,
          parseInt(business.data_days)
        );

        if (!data) {
          continue;
        }

        const result = await this.calculatePassport(data);

        // Get previous passport for comparison
        const prevResult = await db.query(
          `SELECT loan_limit_cents, overall_score 
           FROM financial_passports 
           WHERE business_id = $1 
           ORDER BY calculated_at DESC LIMIT 1`,
          [business.id]
        );
        const prevLoanLimit = prevResult.rows[0]?.loan_limit_cents;
        const prevScore = prevResult.rows[0]?.overall_score;

        // Generate data hash (SHA-256 of key metrics)
        const dataHash = await this.generateDataHash(result);

        // Check if on-chain anchor should be triggered (Phase 3)
        const shouldAnchor = result.overallScore >= 60 && !prevResult.rows.length;

        // Upsert financial passport
        await db.query(
          `INSERT INTO financial_passports (
            business_id, overall_score, revenue_score, margin_score, savings_score,
            integrity_score, staff_score, engagement_score, loan_limit_cents,
            avg_daily_revenue_cents, revenue_consistency, avg_net_margin,
            data_hash, calculated_at, expires_at, lender_summary
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW() + INTERVAL '90 days', $14)
          ON CONFLICT (business_id) DO UPDATE SET
            overall_score = EXCLUDED.overall_score,
            revenue_score = EXCLUDED.revenue_score,
            margin_score = EXCLUDED.margin_score,
            savings_score = EXCLUDED.savings_score,
            integrity_score = EXCLUDED.integrity_score,
            staff_score = EXCLUDED.staff_score,
            engagement_score = EXCLUDED.engagement_score,
            loan_limit_cents = EXCLUDED.loan_limit_cents,
            avg_daily_revenue_cents = EXCLUDED.avg_daily_revenue_cents,
            revenue_consistency = EXCLUDED.revenue_consistency,
            avg_net_margin = EXCLUDED.avg_net_margin,
            data_hash = EXCLUDED.data_hash,
            calculated_at = EXCLUDED.calculated_at,
            expires_at = EXCLUDED.expires_at,
            lender_summary = EXCLUDED.lender_summary`,
          [
            business.id,
            result.overallScore,
            result.revenueScore,
            result.marginScore,
            result.savingsScore,
            result.integrityScore,
            result.staffScore,
            result.engagementScore,
            result.loanLimit,
            result.avgDailyRevenue,
            result.revenueConsistency,
            result.avgNetMargin,
            dataHash,
            result.lenderSummary,
          ]
        );

        stats.scored++;

        // Check for significant limit increase
        if (prevLoanLimit && result.loanLimit > prevLoanLimit * 1.2) { // 20% increase
          const increase = result.loanLimit - prevLoanLimit;
          await this.notifyLimitIncrease(
            business.owner_id,
            result,
            prevLoanLimit,
            business.name
          );
          stats.limitIncreases++;
          stats.notified++;
        }

        // Notify if score milestone crossed (e.g., reached 60 for first time)
        if (result.overallScore >= 60 && (!prevScore || prevScore < 60)) {
          await this.notifyPassportEligible(business.owner_id, result, business.name);
          stats.notified++;
        }

        // Trigger on-chain anchoring if needed (Phase 3)
        if (shouldAnchor) {
          await this.triggerAnchoring(business.id, dataHash);
        }
      } catch (error) {
        console.error(`Credit scoring failed for business ${business.id}:`, error);
      }
    }

    console.log(`[CreditScoringAgent] Completed: ${stats.scored} scored, ${stats.limitIncreases} limit increases, ${stats.notified} notified`);
    return stats;
  },

  /**
   * Collect all required data for credit scoring
   */
  async collectData(
    businessId: string,
    businessName: string,
    ownerId: string,
    daysActive: number
  ): Promise<CreditScoringData | null> {
    // Get last 90 days of P&L (or all available if less)
    const pnlResult = await db.query(
      `SELECT 
         date,
         total_revenue,
         total_expenses,
         net_profit,
         CASE WHEN total_revenue > 0 
           THEN (net_profit::float / total_revenue) 
           ELSE 0 
         END as margin,
         transaction_count,
         is_reconciled
       FROM daily_pnl 
       WHERE business_id = $1 
         AND date >= CURRENT_DATE - INTERVAL '90 days'
       ORDER BY date`,
      [businessId]
    );

    if (pnlResult.rows.length < 60) {
      return null; // Need at least 60 days
    }

    const dailyPnl = pnlResult.rows.map(row => ({
      date: row.date,
      revenue: parseInt(row.total_revenue || 0),
      expenses: parseInt(row.total_expenses || 0),
      netProfit: parseInt(row.net_profit || 0),
      margin: parseFloat(row.margin || 0),
      transactions: parseInt(row.transaction_count || 0),
      isClosed: row.is_reconciled,
    }));

    // Get savings data
    const savingsResult = await db.query(
      `SELECT 
         DATE(created_at) as date,
         amount_cents as amount,
         type
       FROM savings_entries 
       WHERE business_id = $1 
         AND created_at >= CURRENT_DATE - INTERVAL '90 days'
       ORDER BY created_at`,
      [businessId]
    );

    const savingsEntries = savingsResult.rows.map(row => ({
      date: row.date,
      amount: parseInt(row.amount || 0),
      type: row.type,
    }));

    // Get wallet balance
    const walletResult = await db.query(
      `SELECT balance_cents FROM savings_wallets WHERE business_id = $1`,
      [businessId]
    );
    const walletBalance = parseInt(walletResult.rows[0]?.balance_cents || 0);

    // Get cashier scores
    const cashierResult = await db.query(
      `SELECT 
         user_id,
         overall_score,
         total_estimated_loss
       FROM cashier_scores 
       WHERE business_id = $1`,
      [businessId]
    );

    const cashierScores = cashierResult.rows.map(row => ({
      userId: row.user_id,
      overallScore: parseInt(row.overall_score || 0),
      totalEstimatedLoss: parseInt(row.total_estimated_loss || 0),
    }));

    // Get integrity metrics
    const integrityResult = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM stock_discrepancies WHERE business_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '90 days') as stock_discrepancies,
         (SELECT COUNT(*) FROM shifts WHERE business_id = $1 AND status = 'closed' AND is_reconciled = false AND started_at >= CURRENT_DATE - INTERVAL '90 days') as unreconciled_shifts,
         (SELECT CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN receipt_sent THEN 1 ELSE 0 END)::float / COUNT(*) * 100) ELSE 0 END FROM transactions WHERE business_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '90 days') as receipt_rate`,
      [businessId]
    );

    // Get engagement metrics
    const engagementResult = await db.query(
      `SELECT 
         (SELECT MAX(last_active_at) FROM user_sessions WHERE user_id = $2) as last_login,
         (SELECT COUNT(*) FROM app_opens WHERE business_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days') as app_opens`,
      [businessId, ownerId]
    );

    return {
      businessId,
      businessName,
      ownerId,
      dailyPnl,
      savingsEntries,
      walletBalance,
      cashierScores,
      stockDiscrepancies: parseInt(integrityResult.rows[0]?.stock_discrepancies || 0),
      unreconciledShifts: parseInt(integrityResult.rows[0]?.unreconciled_shifts || 0),
      receiptDeliveryRate: parseFloat(integrityResult.rows[0]?.receipt_rate || 0),
      daysActive,
      lastLogin: engagementResult.rows[0]?.last_login || new Date().toISOString(),
      appOpensPerWeek: parseInt(engagementResult.rows[0]?.app_opens || 0),
    };
  },

  /**
   * Calculate 6-signal composite score and loan limit
   */
  async calculatePassport(data: CreditScoringData): Promise<PassportResult> {
    const pnl = data.dailyPnl;
    
    // 1. Revenue Consistency Score (25%)
    const revenues = pnl.map(d => d.revenue);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgRevenue > 0 ? stdDev / avgRevenue : 1; // Coefficient of variation
    const revenueScore = Math.round(Math.max(0, 100 - (cv * 100)));

    // 2. Net Margins Score (20%)
    const avgMargin = pnl.reduce((sum, d) => sum + d.margin, 0) / pnl.length;
    const marginScore = Math.round(Math.min(100, Math.max(0, avgMargin * 200))); // 50% margin = 100 score

    // 3. Savings Consistency Score (20%)
    const savingsScore = this.calculateSavingsScore(data.savingsEntries, data.walletBalance);

    // 4. Data Integrity Score (15%)
    const integrityScore = this.calculateIntegrityScore(
      data.stockDiscrepancies,
      data.unreconciledShifts,
      data.receiptDeliveryRate,
      pnl.length
    );

    // 5. Staff Reliability Score (10%)
    const staffScore = this.calculateStaffScore(data.cashierScores);

    // 6. Platform Engagement Score (10%)
    const engagementScore = this.calculateEngagementScore(data.daysActive, data.appOpensPerWeek);

    // Calculate weighted composite
    const overallScore = Math.round(
      revenueScore * SIGNAL_WEIGHTS.revenueConsistency +
      marginScore * SIGNAL_WEIGHTS.netMargins +
      savingsScore * SIGNAL_WEIGHTS.savingsConsistency +
      integrityScore * SIGNAL_WEIGHTS.dataIntegrity +
      staffScore * SIGNAL_WEIGHTS.staffReliability +
      engagementScore * SIGNAL_WEIGHTS.platformEngagement
    );

    // Calculate loan limit based on score and revenue
    const avgMonthlyRevenue = avgRevenue * 30;
    let loanLimit = 0;
    
    if (overallScore >= 40) {
      // Loan limit = 1-3 months revenue based on score
      const months = overallScore >= 80 ? 3 : overallScore >= 60 ? 2 : 1;
      loanLimit = avgMonthlyRevenue * months;
      
      // Cap based on score tier
      const caps: Record<number, number> = {
        40: 5000000,   // KES 50,000
        50: 10000000,  // KES 100,000
        60: 25000000,  // KES 250,000
        70: 50000000,  // KES 500,000
        80: 100000000, // KES 1,000,000
        90: 250000000, // KES 2,500,000
      };
      
      for (const [minScore, cap] of Object.entries(caps).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))) {
        if (overallScore >= parseInt(minScore)) {
          loanLimit = Math.min(loanLimit, cap);
          break;
        }
      }
    }

    // Generate lender summary using Manikka
    const lenderSummary = await this.generateLenderSummary(data, {
      overallScore,
      revenueScore,
      marginScore,
      savingsScore,
      integrityScore,
      staffScore,
      engagementScore,
      loanLimit,
      avgDailyRevenue: avgRevenue,
      revenueConsistency: Math.max(0, 1 - cv),
      avgNetMargin: avgMargin,
      dataHash: '',
      lenderSummary: '',
    });

    return {
      overallScore,
      revenueScore,
      marginScore,
      savingsScore,
      integrityScore,
      staffScore,
      engagementScore,
      loanLimit,
      avgDailyRevenue: avgRevenue,
      revenueConsistency: Math.max(0, 1 - cv),
      avgNetMargin: avgMargin,
      dataHash: '', // Will be set after
      lenderSummary,
    };
  },

  calculateSavingsScore(entries: CreditScoringData['savingsEntries'], balance: number): number {
    if (entries.length === 0) return 50;
    
    // Score based on:
    // - Consistency of savings (auto-saves happening regularly)
    // - Balance growth over time
    // - No recent large withdrawals
    
    const autoSaves = entries.filter(e => e.type === 'auto').length;
    const withdrawals = entries.filter(e => e.type === 'withdrawal');
    const totalSaved = entries.filter(e => e.type !== 'withdrawal').reduce((sum, e) => sum + e.amount, 0);
    
    let score = 50;
    
    // Bonus for consistent auto-saves
    if (autoSaves >= entries.length * 0.8) score += 20;
    else if (autoSaves >= entries.length * 0.5) score += 10;
    
    // Penalty for recent withdrawals
    const recentWithdrawals = withdrawals.filter(e => 
      new Date(e.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    score -= recentWithdrawals * 5;
    
    // Bonus for growing balance
    if (balance > totalSaved * 0.5) score += 10;
    
    return Math.round(Math.max(0, Math.min(100, score)));
  },

  calculateIntegrityScore(
    discrepancies: number,
    unreconciled: number,
    receiptRate: number,
    totalDays: number
  ): number {
    let score = 100;
    
    // Penalty for stock discrepancies
    score -= Math.min(30, discrepancies * 5);
    
    // Penalty for unreconciled shifts
    const unreconciledRate = totalDays > 0 ? unreconciled / totalDays : 0;
    score -= Math.min(30, unreconciledRate * 100);
    
    // Penalty for low receipt rate
    score -= Math.min(20, (100 - receiptRate) / 5);
    
    return Math.round(Math.max(0, score));
  },

  calculateStaffScore(cashiers: CreditScoringData['cashierScores']): number {
    if (cashiers.length === 0) return 75; // Default if no cashiers
    
    const avgScore = cashiers.reduce((sum, c) => sum + c.overallScore, 0) / cashiers.length;
    const totalLoss = cashiers.reduce((sum, c) => sum + c.totalEstimatedLoss, 0);
    
    // Penalty for high losses
    const lossPenalty = Math.min(30, totalLoss / 10000);
    
    return Math.round(Math.max(0, Math.min(100, avgScore - lossPenalty)));
  },

  calculateEngagementScore(daysActive: number, appOpensPerWeek: number): number {
    let score = 50;
    
    // Bonus for consistent usage
    if (daysActive >= 60) score += 20;
    else if (daysActive >= 30) score += 10;
    
    // Bonus for app engagement
    if (appOpensPerWeek >= 5) score += 20;
    else if (appOpensPerWeek >= 3) score += 10;
    
    return Math.round(Math.min(100, score));
  },

  async generateLenderSummary(data: CreditScoringData, passport: PassportResult): Promise<string> {
    const passportData = {
      businessName: data.businessName,
      overallScore: passport.overallScore,
      avgMonthlyRevenue: (passport.avgDailyRevenue * 30 / 100).toLocaleString(),
      revenueScore: passport.revenueScore,
      marginScore: passport.marginScore,
      savingsScore: passport.savingsScore,
      integrityScore: passport.integrityScore,
      staffScore: passport.staffScore,
      engagementScore: passport.engagementScore,
      loanLimit: (passport.loanLimit / 100).toLocaleString(),
      revenueConsistency: (passport.revenueConsistency * 100).toFixed(0) + '%',
      avgNetMargin: (passport.avgNetMargin * 100).toFixed(1) + '%',
      daysActive: data.daysActive,
    };

    const prompt = `You are a credit analyst. Given this business's financial passport data:
${JSON.stringify(passportData)}

Write a one-paragraph lender summary (max 80 words) that highlights the 3 strongest signals and 1 area of concern. This will be shown to lending institutions. Be factual and precise.`;

    try {
      const response = await manikkaService.generate(prompt, {
        temperature: 0.5,
        maxTokens: 200,
      });
      return response.trim();
    } catch (error) {
      console.error('Manikka lender summary failed:', error);
      
      // Fallback
      const signals = [
        { name: 'Revenue Consistency', score: passport.revenueScore },
        { name: 'Net Margins', score: passport.marginScore },
        { name: 'Savings Rate', score: passport.savingsScore },
        { name: 'Data Integrity', score: passport.integrityScore },
        { name: 'Staff Reliability', score: passport.staffScore },
        { name: 'Platform Engagement', score: passport.engagementScore },
      ].sort((a, b) => b.score - a.score);
      
      const top3 = signals.slice(0, 3);
      const concern = signals[signals.length - 1];
      
      return `Verified business with ${passportData.daysActive} days of immutable financial records. 
Strengths: ${top3.map(s => `${s.name} (${s.score}/100)`).join(', ')}. 
Watch: ${concern.name} (${concern.score}/100). 
Pre-approved limit: KES ${passportData.loanLimit}.`;
    }
  },

  async generateDataHash(passport: PassportResult): Promise<string> {
    // In production, this would be a real SHA-256 hash
    // For now, return a deterministic string based on key values
    const data = [
      passport.overallScore,
      passport.revenueScore,
      passport.marginScore,
      passport.savingsScore,
      passport.integrityScore,
      passport.staffScore,
      passport.engagementScore,
      passport.loanLimit,
      Math.round(passport.avgDailyRevenue),
      Math.round(passport.revenueConsistency * 100),
    ].join('|');
    
    // Simple hash simulation (in production use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  },

  async triggerAnchoring(businessId: string, dataHash: string): Promise<void> {
    // Phase 3: On-chain anchoring
    // This would call a blockchain service to anchor the hash
    console.log(`[CreditScoringAgent] Triggering on-chain anchoring for business ${businessId}`);
    
    // In production:
    // const txId = await blockchainService.anchorToCelo(dataHash);
    // await db.query(`UPDATE financial_passports SET chain_tx_id = $1 WHERE business_id = $2`, [txId, businessId]);
  },

  async notifyLimitIncrease(
    ownerId: string,
    result: PassportResult,
    prevLimit: number,
    businessName: string
  ): Promise<void> {
    const increase = result.loanLimit - prevLimit;
    
    await notificationsService.sendToUser(ownerId, {
      type: 'loan_limit_increase',
      title: '🎉 Loan Limit Increased!',
      body: `Your pre-approved loan limit increased to KES ${(result.loanLimit / 100).toLocaleString()} (+KES ${(increase / 100).toLocaleString()})`,
      data: {
        newLimit: result.loanLimit,
        previousLimit: prevLimit,
        increase,
        overallScore: result.overallScore,
        businessName,
      },
      channels: ['push', 'whatsapp'],
    });
  },

  async notifyPassportEligible(
    ownerId: string,
    result: PassportResult,
    businessName: string
  ): Promise<void> {
    await notificationsService.sendToUser(ownerId, {
      type: 'passport_eligible',
      title: '🛂 Financial Passport Ready!',
      body: `Your Financial Passport is now active! Score: ${result.overallScore}/100. Pre-approved loan: KES ${(result.loanLimit / 100).toLocaleString()}`,
      data: {
        overallScore: result.overallScore,
        loanLimit: result.loanLimit,
        businessName,
      },
      channels: ['push', 'whatsapp'],
    });
  },
};

export default creditScoringAgent;
