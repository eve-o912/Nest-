import api from './api';
import type { ApiResponse } from '@/types/api.types';

export interface CashierScore {
  id: string;
  userId: string;
  userName: string;
  overallScore: number;
  cashAccuracyScore: number;
  stockIntegrityScore: number;
  recordingQualityScore: number;
  voidBehaviourScore: number;
  receiptDeliveryScore: number;
  patternNote?: string;
  totalEstimatedLoss: number;
  shiftCount: number;
  lastShiftDate: string;
  calculatedAt: string;
}

export interface ShiftHistory {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'closed' | 'flagged';
  transactionsCount: number;
  cashVariance: number;
  stockDiscrepancies: number;
  voidCount: number;
  voidAmount: number;
  isReconciled: boolean;
}

export interface SignalBreakdown {
  signal: string;
  weight: number;
  score: number;
  details: string;
}

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  role: 'owner' | 'cashier';
  isActive: boolean;
  joinedAt: string;
  score?: CashierScore;
}

export const teamService = {
  // Get team members with scores
  getTeam: async (businessId: string): Promise<{ team: TeamMember[] }> => {
    return api.get(`/businesses/${businessId}/team`);
  },

  // Get cashier detailed score
  getCashierScore: async (businessId: string, userId: string): Promise<{ 
    score: CashierScore;
    signals: SignalBreakdown[];
  }> => {
    return api.get(`/businesses/${businessId}/team/${userId}/score`);
  },

  // Get shift history (30 shifts)
  getShiftHistory: async (businessId: string, userId: string): Promise<{ 
    shifts: ShiftHistory[];
    patterns: Array<{
      pattern: string;
      occurrences: number;
      severity: 'low' | 'medium' | 'high';
    }>;
  }> => {
    return api.get(`/businesses/${businessId}/team/${userId}/history`);
  },

  // Toggle user active status (restrict access)
  toggleUserStatus: async (businessId: string, userId: string, isActive: boolean): Promise<{ 
    user: TeamMember;
    message: string;
  }> => {
    return api.put(`/businesses/${businessId}/users/${userId}`, { isActive });
  },

  // Invite new team member
  inviteMember: async (businessId: string, phone: string, role: 'cashier' = 'cashier'): Promise<{ 
    invite: {
      id: string;
      phone: string;
      status: 'pending' | 'accepted' | 'expired';
      expiresAt: string;
    }
  }> => {
    return api.post(`/businesses/${businessId}/invites`, { phone, role });
  },

  // Get cashier evidence (for download)
  getEvidence: async (businessId: string, userId: string, params?: { 
    from?: string; 
    to?: string;
  }): Promise<{
    evidence: Array<{
      id: string;
      type: 'mismatch' | 'void' | 'stock_gap' | 'no_receipt';
      date: string;
      amount: number;
      description: string;
      shiftId: string;
    }>;
    summary: {
      totalIncidents: number;
      totalAmount: number;
      byType: Record<string, number>;
    }
  }> => {
    return api.get(`/businesses/${businessId}/team/${userId}/evidence`, { params });
  },
};

export const SIGNAL_WEIGHTS = {
  cashAccuracy: 0.35,
  stockIntegrity: 0.25,
  recordingQuality: 0.20,
  voidBehaviour: 0.15,
  receiptDelivery: 0.05,
};

export const getScoreColor = (score: number): string => {
  if (score >= 85) return '#22C55E'; // green
  if (score >= 60) return '#F59E0B'; // amber
  return '#EF4444'; // red
};

export const getScoreLabel = (score: number): string => {
  if (score >= 85) return 'Reliable';
  if (score >= 60) return 'Watch';
  return 'At Risk';
};

export const formatSignalName = (signal: string): string => {
  const names: Record<string, string> = {
    cashAccuracy: 'Cash Accuracy',
    stockIntegrity: 'Stock Integrity',
    recordingQuality: 'Recording Quality',
    voidBehaviour: 'Void Behaviour',
    receiptDelivery: 'Receipt Delivery',
  };
  return names[signal] || signal;
};

export const formatShiftStatus = (status: string): string => {
  const statuses: Record<string, string> = {
    active: '🟢 Active',
    closed: '✓ Closed',
    flagged: '⚠️ Flagged',
  };
  return statuses[status] || status;
};

export const getShiftDotColor = (shift: ShiftHistory): string => {
  if (shift.status === 'flagged') return '#EF4444';
  if (!shift.isReconciled) return '#F59E0B';
  if (shift.cashVariance !== 0 || shift.voidCount > 3) return '#F59E0B';
  return '#22C55E';
};

export const calculateWeightedScore = (scores: {
  cashAccuracy: number;
  stockIntegrity: number;
  recordingQuality: number;
  voidBehaviour: number;
  receiptDelivery: number;
}): number => {
  return Math.round(
    scores.cashAccuracy * SIGNAL_WEIGHTS.cashAccuracy +
    scores.stockIntegrity * SIGNAL_WEIGHTS.stockIntegrity +
    scores.recordingQuality * SIGNAL_WEIGHTS.recordingQuality +
    scores.voidBehaviour * SIGNAL_WEIGHTS.voidBehaviour +
    scores.receiptDelivery * SIGNAL_WEIGHTS.receiptDelivery
  );
};

export const getPatternSeverity = (occurrences: number): 'low' | 'medium' | 'high' => {
  if (occurrences >= 10) return 'high';
  if (occurrences >= 5) return 'medium';
  return 'low';
};

export const generatePatternNote = (patterns: Array<{ pattern: string; occurrences: number }>): string => {
  if (patterns.length === 0) return 'No significant patterns detected';
  const topPattern = patterns.reduce((max, p) => p.occurrences > max.occurrences ? p : max, patterns[0]);
  return `Pattern: ${topPattern.pattern} (${topPattern.occurrences} occurrences)`;
};

export const exportEvidenceReport = async (businessId: string, userId: string): Promise<string> => {
  const { evidence, summary } = await teamService.getEvidence(businessId, userId);
  
  // Generate CSV content
  const headers = 'Date,Type,Amount,Description,Shift ID\n';
  const rows = evidence.map(e => 
    `${e.date},${e.type},${e.amount},"${e.description}",${e.shiftId}`
  ).join('\n');
  
  const csv = headers + rows + `\n\nSummary\nTotal Incidents,${summary.totalIncidents}\nTotal Amount,${summary.totalAmount}`;
  
  return csv;
};

export const canRestrictAccess = (role: string): boolean => {
  return role === 'owner' || role === 'admin';
};

export const requireReconciliationBeforeClose = (shift: ShiftHistory): boolean => {
  return shift.cashVariance !== 0 || shift.voidCount > 5;
};

export const flagShiftForReview = async (businessId: string, shiftId: string, reason: string): Promise<void> => {
  await api.post(`/businesses/${businessId}/shifts/${shiftId}/flag`, { reason });
};

export const getRecommendedAction = (score: CashierScore): {
  action: 'praise' | 'watch' | 'coach' | 'restrict';
  message: string;
} => {
  if (score.overallScore >= 90) {
    return { action: 'praise', message: 'Top performer! Recognize their excellent work.' };
  }
  if (score.overallScore >= 75) {
    return { action: 'watch', message: 'Good performance with minor areas for improvement.' };
  }
  if (score.overallScore >= 50) {
    return { action: 'coach', message: 'Needs coaching. Review specific signal breakdowns.' };
  }
  return { action: 'restrict', message: 'High risk. Consider restricting till access.' };
};

export const downloadEvidence = async (businessId: string, userId: string): Promise<Blob> => {
  const response = await api.get(`/businesses/${businessId}/team/${userId}/evidence/download`, {
    responseType: 'blob',
  });
  return response;
};

export const sendScoreNotification = async (businessId: string, userId: string): Promise<void> => {
  await api.post(`/businesses/${businessId}/team/${userId}/notify-score`);
};

export const getScoreTrend = (shifts: ShiftHistory[]): 'improving' | 'stable' | 'declining' => {
  if (shifts.length < 10) return 'stable';
  
  const recent = shifts.slice(0, 10);
  const older = shifts.slice(10, 20);
  
  const recentIssues = recent.filter(s => s.cashVariance !== 0 || s.voidCount > 3).length;
  const olderIssues = older.filter(s => s.cashVariance !== 0 || s.voidCount > 3).length;
  
  if (recentIssues < olderIssues * 0.7) return 'improving';
  if (recentIssues > olderIssues * 1.3) return 'declining';
  return 'stable';
};

export const getShiftHeatmapData = (shifts: ShiftHistory[]): Array<{
  day: string;
  hour: number;
  risk: number;
}> => {
  const heatmap: Record<string, number> = {};
  
  shifts.forEach(shift => {
    const date = new Date(shift.startTime);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const hour = date.getHours();
    const key = `${day}-${hour}`;
    
    let risk = 0;
    if (shift.cashVariance !== 0) risk += 2;
    if (shift.voidCount > 3) risk += 1;
    if (shift.stockDiscrepancies > 0) risk += 2;
    
    heatmap[key] = (heatmap[key] || 0) + risk;
  });
  
  return Object.entries(heatmap).map(([key, risk]) => {
    const [day, hour] = key.split('-');
    return { day, hour: parseInt(hour), risk };
  });
};

export const predictNextShiftRisk = (shifts: ShiftHistory[]): {
  risk: 'low' | 'medium' | 'high';
  confidence: number;
} => {
  if (shifts.length < 5) return { risk: 'low', confidence: 0.3 };
  
  const recent = shifts.slice(0, 5);
  const issues = recent.filter(s => s.cashVariance !== 0 || s.voidCount > 3).length;
  
  if (issues >= 3) return { risk: 'high', confidence: 0.7 };
  if (issues >= 1) return { risk: 'medium', confidence: 0.6 };
  return { risk: 'low', confidence: 0.8 };
};

export const compareToTeamAverage = (score: number, teamScores: number[]): {
  comparison: 'above' | 'average' | 'below';
  percentile: number;
} => {
  const sorted = [...teamScores].sort((a, b) => a - b);
  const rank = sorted.filter(s => s < score).length;
  const percentile = Math.round((rank / sorted.length) * 100);
  
  if (percentile >= 75) return { comparison: 'above', percentile };
  if (percentile >= 25) return { comparison: 'average', percentile };
  return { comparison: 'below', percentile };
};

export const generateCoachingTips = (score: CashierScore): string[] => {
  const tips: string[] = [];
  
  if (score.cashAccuracyScore < 70) {
    tips.push('Cash accuracy needs improvement. Review counting procedures.');
  }
  if (score.stockIntegrityScore < 70) {
    tips.push('Stock discrepancies detected. Ensure proper stock handling.');
  }
  if (score.recordingQualityScore < 70) {
    tips.push('Low itemised sales rate. Use product catalog for accuracy.');
  }
  if (score.voidBehaviourScore < 70) {
    tips.push('High void rate detected. Review void authorization process.');
  }
  if (score.receiptDeliveryScore < 70) {
    tips.push('Low receipt delivery rate. Ensure customers get receipts.');
  }
  
  return tips.length > 0 ? tips : ['Maintain current performance levels.'];
};

export const getSignalImpact = (signal: string, score: number): {
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
} => {
  const weight = SIGNAL_WEIGHTS[signal as keyof typeof SIGNAL_WEIGHTS] || 0.2;
  const weightedImpact = (100 - score) * weight;
  
  if (weightedImpact > 10) {
    return { 
      impact: 'high', 
      recommendation: `Focus on improving ${formatSignalName(signal)} - major score impact` 
    };
  }
  if (weightedImpact > 5) {
    return { 
      impact: 'medium', 
      recommendation: `${formatSignalName(signal)} has moderate impact on overall score` 
    };
  }
  return { 
    impact: 'low', 
    recommendation: `${formatSignalName(signal)} is not significantly impacting score` 
  };
};

export const createScoreAlert = (score: CashierScore): {
  shouldAlert: boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string;
} => {
  if (score.overallScore < 50) {
    return { 
      shouldAlert: true, 
      severity: 'critical', 
      message: `Cashier ${score.userName} has critically low reliability score (${score.overallScore})` 
    };
  }
  if (score.totalEstimatedLoss > 10000) {
    return { 
      shouldAlert: true, 
      severity: 'critical', 
      message: `High estimated loss detected: KES ${score.totalEstimatedLoss.toLocaleString()}` 
    };
  }
  if (score.overallScore < 70) {
    return { 
      shouldAlert: true, 
      severity: 'warning', 
      message: `Cashier ${score.userName} needs attention (Score: ${score.overallScore})` 
    };
  }
  return { shouldAlert: false, severity: 'info', message: '' };
};

export const scheduleScoreReview = (businessId: string, userId: string, date: string): Promise<void> => {
  return api.post(`/businesses/${businessId}/team/${userId}/schedule-review`, { date });
};

export const getScoreHistory = async (businessId: string, userId: string): Promise<{
  history: Array<{
    date: string;
    score: number;
    change: number;
  }>;
}> => {
  return api.get(`/businesses/${businessId}/team/${userId}/score-history`);
};

export const getSignalTrends = async (businessId: string, userId: string): Promise<{
  trends: Array<{
    signal: string;
    direction: 'improving' | 'stable' | 'declining';
    changePercent: number;
  }>;
}> => {
  return api.get(`/businesses/${businessId}/team/${userId}/signal-trends`);
};

export const bulkRestrictAccess = async (businessId: string, userIds: string[]): Promise<{
  restricted: string[];
  failed: string[];
}> => {
  const results = await Promise.allSettled(
    userIds.map(id => teamService.toggleUserStatus(businessId, id, false))
  );
  
  const restricted: string[] = [];
  const failed: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      restricted.push(userIds[index]);
    } else {
      failed.push(userIds[index]);
    }
  });
  
  return { restricted, failed };
};

export const getTeamScoreStats = async (businessId: string): Promise<{
  averageScore: number;
  medianScore: number;
  atRiskCount: number;
  topPerformer: string;
}> => {
  return api.get(`/businesses/${businessId}/team/stats`);
};

export const exportTeamReport = async (businessId: string): Promise<string> => {
  const { team } = await teamService.getTeam(businessId);
  
  const headers = 'Name,Overall Score,Cash Accuracy,Stock Integrity,Recording Quality,Void Behaviour,Receipt Delivery,Status\n';
  const rows = team.map(member => {
    const s = member.score;
    return s 
      ? `${member.name},${s.overallScore},${s.cashAccuracyScore},${s.stockIntegrityScore},${s.recordingQualityScore},${s.voidBehaviourScore},${s.receiptDeliveryScore},${member.isActive ? 'Active' : 'Restricted'}`
      : `${member.name},No Score,N/A,N/A,N/A,N/A,N/A,${member.isActive ? 'Active' : 'Restricted'}`;
  }).join('\n');
  
  return headers + rows;
};

export const getScoreCorrelations = (scores: CashierScore[]): Array<{
  signal1: string;
  signal2: string;
  correlation: number;
}> => {
  // Simple correlation calculation
  const correlations: Array<{ signal1: string; signal2: string; correlation: number }> = [];
  const signals = ['cashAccuracy', 'stockIntegrity', 'recordingQuality', 'voidBehaviour', 'receiptDelivery'];
  
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const s1 = signals[i];
      const s2 = signals[j];
      
      const pairs = scores.map(s => ({
        x: s[`${s1}Score` as keyof CashierScore] as number,
        y: s[`${s2}Score` as keyof CashierScore] as number,
      }));
      
      const avgX = pairs.reduce((sum, p) => sum + p.x, 0) / pairs.length;
      const avgY = pairs.reduce((sum, p) => sum + p.y, 0) / pairs.length;
      
      const num = pairs.reduce((sum, p) => sum + (p.x - avgX) * (p.y - avgY), 0);
      const den = Math.sqrt(
        pairs.reduce((sum, p) => sum + Math.pow(p.x - avgX, 2), 0) *
        pairs.reduce((sum, p) => sum + Math.pow(p.y - avgY, 2), 0)
      );
      
      correlations.push({
        signal1: formatSignalName(s1),
        signal2: formatSignalName(s2),
        correlation: den === 0 ? 0 : Math.round((num / den) * 100) / 100,
      });
    }
  }
  
  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
};

export const validateScoreCalculation = (score: CashierScore): {
  isValid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];
  
  // Check if weighted sum matches overall score
  const calculated = calculateWeightedScore({
    cashAccuracy: score.cashAccuracyScore,
    stockIntegrity: score.stockIntegrityScore,
    recordingQuality: score.recordingQualityScore,
    voidBehaviour: score.voidBehaviourScore,
    receiptDelivery: score.receiptDeliveryScore,
  });
  
  if (Math.abs(calculated - score.overallScore) > 2) {
    issues.push(`Score mismatch: calculated ${calculated}, stored ${score.overallScore}`);
  }
  
  // Check individual signal ranges
  const signals = [
    { name: 'Cash Accuracy', value: score.cashAccuracyScore },
    { name: 'Stock Integrity', value: score.stockIntegrityScore },
    { name: 'Recording Quality', value: score.recordingQualityScore },
    { name: 'Void Behaviour', value: score.voidBehaviourScore },
    { name: 'Receipt Delivery', value: score.receiptDeliveryScore },
  ];
  
  signals.forEach(s => {
    if (s.value < 0 || s.value > 100) {
      issues.push(`${s.name} score out of range: ${s.value}`);
    }
  });
  
  return { isValid: issues.length === 0, issues };
};

export const recalculateScore = async (businessId: string, userId: string): Promise<{
  score: CashierScore;
  recalculated: boolean;
}> => {
  return api.post(`/businesses/${businessId}/team/${userId}/recalculate`);
};

export const getScoreBenchmarks = (): {
  excellent: number;
  good: number;
  average: number;
  poor: number;
  critical: number;
} => {
  return {
    excellent: 90,
    good: 75,
    average: 60,
    poor: 40,
    critical: 20,
  };
};

export const comparePeriods = (current: CashierScore, previous: CashierScore): {
  overallChange: number;
  signalChanges: Record<string, number>;
  improved: string[];
  declined: string[];
} => {
  const overallChange = current.overallScore - previous.overallScore;
  
  const signalChanges: Record<string, number> = {
    cashAccuracy: current.cashAccuracyScore - previous.cashAccuracyScore,
    stockIntegrity: current.stockIntegrityScore - previous.stockIntegrityScore,
    recordingQuality: current.recordingQualityScore - previous.recordingQualityScore,
    voidBehaviour: current.voidBehaviourScore - previous.voidBehaviourScore,
    receiptDelivery: current.receiptDeliveryScore - previous.receiptDeliveryScore,
  };
  
  const improved = Object.entries(signalChanges)
    .filter(([_, change]) => change > 5)
    .map(([signal, _]) => formatSignalName(signal));
  
  const declined = Object.entries(signalChanges)
    .filter(([_, change]) => change < -5)
    .map(([signal, _]) => formatSignalName(signal));
  
  return { overallChange, signalChanges, improved, declined };
};

export const getRecommendedTraining = (score: CashierScore): Array<{
  module: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}> => {
  const modules: Array<{ module: string; priority: 'high' | 'medium' | 'low'; reason: string }> = [];
  
  if (score.cashAccuracyScore < 60) {
    modules.push({
      module: 'Cash Handling Basics',
      priority: 'high',
      reason: 'Low cash accuracy score',
    });
  }
  if (score.stockIntegrityScore < 60) {
    modules.push({
      module: 'Stock Management',
      priority: 'high',
      reason: 'Stock discrepancies detected',
    });
  }
  if (score.voidBehaviourScore < 60) {
    modules.push({
      module: 'Void Authorization',
      priority: 'high',
      reason: 'High void rate',
    });
  }
  if (score.recordingQualityScore < 70) {
    modules.push({
      module: 'Product Catalog Usage',
      priority: 'medium',
      reason: 'Low itemised sales rate',
    });
  }
  if (score.receiptDeliveryScore < 70) {
    modules.push({
      module: 'Customer Service',
      priority: 'low',
      reason: 'Receipt delivery rate',
    });
  }
  
  return modules.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

export const simulateScoreChange = (
  current: CashierScore,
  improvements: Partial<{
    cashAccuracy: number;
    stockIntegrity: number;
    recordingQuality: number;
    voidBehaviour: number;
    receiptDelivery: number;
  }>
): number => {
  const newScores = {
    cashAccuracy: improvements.cashAccuracy ?? current.cashAccuracyScore,
    stockIntegrity: improvements.stockIntegrity ?? current.stockIntegrityScore,
    recordingQuality: improvements.recordingQuality ?? current.recordingQualityScore,
    voidBehaviour: improvements.voidBehaviour ?? current.voidBehaviourScore,
    receiptDelivery: improvements.receiptDelivery ?? current.receiptDeliveryScore,
  };
  
  return calculateWeightedScore(newScores);
};

export const getScoreGoal = (currentScore: number): {
  target: number;
  timeframe: string;
  requiredImprovements: string[];
} => {
  const benchmarks = getScoreBenchmarks();
  
  if (currentScore < benchmarks.poor) {
    return {
      target: benchmarks.poor,
      timeframe: '2 weeks',
      requiredImprovements: ['Focus on cash accuracy', 'Reduce voids', 'Improve stock handling'],
    };
  }
  if (currentScore < benchmarks.average) {
    return {
      target: benchmarks.average,
      timeframe: '1 month',
      requiredImprovements: ['Improve 2 weakest signals', 'Consistent daily performance'],
    };
  }
  if (currentScore < benchmarks.good) {
    return {
      target: benchmarks.good,
      timeframe: '2 months',
      requiredImprovements: ['Fine-tune all signals', 'Maintain consistency'],
    };
  }
  return {
    target: benchmarks.excellent,
    timeframe: '3 months',
    requiredImprovements: ['Maintain excellence', 'Mentor others'],
  };
};

export const createScoreMilestone = (score: number, previousScore: number): {
  achieved: boolean;
  milestone: string;
  reward?: string;
} | null => {
  const milestones = [
    { threshold: 90, name: 'Gold Standard', reward: 'Recognition bonus' },
    { threshold: 80, name: 'Silver Performer', reward: 'Certificate' },
    { threshold: 70, name: 'Bronze Achiever', reward: 'Badge' },
    { threshold: 60, name: 'Passed Threshold', reward: null },
  ];
  
  for (const m of milestones) {
    if (score >= m.threshold && previousScore < m.threshold) {
      return {
        achieved: true,
        milestone: m.name,
        reward: m.reward || undefined,
      };
    }
  }
  
  return null;
};

export const getShiftQualityDistribution = (shifts: ShiftHistory[]): {
  excellent: number;
  good: number;
  average: number;
  poor: number;
} => {
  const distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
  
  shifts.forEach(shift => {
    let quality = 0;
    if (shift.cashVariance === 0) quality += 2;
    if (shift.voidCount <= 1) quality += 2;
    if (shift.stockDiscrepancies === 0) quality += 1;
    if (shift.isReconciled) quality += 1;
    
    if (quality >= 5) distribution.excellent++;
    else if (quality >= 3) distribution.good++;
    else if (quality >= 2) distribution.average++;
    else distribution.poor++;
  });
  
  return distribution;
};

export const identifyRiskFactors = (score: CashierScore, shifts: ShiftHistory[]): string[] => {
  const risks: string[] = [];
  
  if (score.cashAccuracyScore < 50) risks.push('Critical cash handling issues');
  if (score.voidBehaviourScore < 50) risks.push('Potential theft indicators');
  if (score.stockIntegrityScore < 50) risks.push('Stock mishandling pattern');
  
  const recentShifts = shifts.slice(0, 5);
  const unreconciled = recentShifts.filter(s => !s.isReconciled).length;
  if (unreconciled >= 2) risks.push('Frequent unreconciled shifts');
  
  const weekendIssues = shifts.filter(s => {
    const day = new Date(s.startTime).getDay();
    return (day === 0 || day === 6) && (s.cashVariance !== 0 || s.voidCount > 2);
  }).length;
  if (weekendIssues >= 3) risks.push('Weekend performance issues');
  
  return risks;
};

export const calculateTrustIndex = (score: CashierScore, tenureDays: number): {
  index: number;
  level: 'new' | 'developing' | 'trusted' | 'expert';
} => {
  const tenureWeight = Math.min(tenureDays / 90, 1);
  const performanceWeight = score.overallScore / 100;
  
  const index = Math.round((tenureWeight * 0.3 + performanceWeight * 0.7) * 100);
  
  let level: 'new' | 'developing' | 'trusted' | 'expert' = 'new';
  if (index >= 90) level = 'expert';
  else if (index >= 75) level = 'trusted';
  else if (index >= 50) level = 'developing';
  
  return { index, level };
};

export const getOptimalShiftAssignment = (
  cashier: CashierScore,
  otherCashiers: CashierScore[]
): {
  recommended: 'solo' | 'paired' | 'supervised';
  pairWith?: string;
  reason: string;
} => {
  const avgPeerScore = otherCashiers.reduce((sum, c) => sum + c.overallScore, 0) / otherCashiers.length;
  
  if (cashier.overallScore >= 85) {
    return { recommended: 'solo', reason: 'High reliability - can work independently' };
  }
  
  if (cashier.overallScore >= 60) {
    const mentor = otherCashiers
      .filter(c => c.overallScore >= 80)
      .sort((a, b) => b.overallScore - a.overallScore)[0];
    
    if (mentor) {
      return { 
        recommended: 'paired', 
        pairWith: mentor.userName,
        reason: 'Pair with experienced cashier for mentoring' 
      };
    }
    return { recommended: 'solo', reason: 'Moderate reliability - monitor closely' };
  }
  
  const supervisor = otherCashiers
    .filter(c => c.overallScore >= 85)
    .sort((a, b) => b.overallScore - a.overallScore)[0];
  
  if (supervisor) {
    return { 
      recommended: 'supervised', 
      pairWith: supervisor.userName,
      reason: 'Low score - requires direct supervision' 
    };
  }
  
  return { recommended: 'supervised', reason: 'Critical - requires owner supervision' };
};

export const analyzeShiftPatterns = (shifts: ShiftHistory[]): {
  preferredDays: string[];
  riskiestTimes: string[];
  consistencyScore: number;
} => {
  const dayCounts: Record<string, { count: number; issues: number }> = {};
  const hourCounts: Record<number, { count: number; issues: number }> = {};
  
  shifts.forEach(shift => {
    const date = new Date(shift.startTime);
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = date.getHours();
    
    if (!dayCounts[day]) dayCounts[day] = { count: 0, issues: 0 };
    if (!hourCounts[hour]) hourCounts[hour] = { count: 0, issues: 0 };
    
    dayCounts[day].count++;
    hourCounts[hour].count++;
    
    const hasIssue = shift.cashVariance !== 0 || shift.voidCount > 2 || shift.stockDiscrepancies > 0;
    if (hasIssue) {
      dayCounts[day].issues++;
      hourCounts[hour].issues++;
    }
  });
  
  const preferredDays = Object.entries(dayCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([day, _]) => day);
  
  const riskiestTimes = Object.entries(hourCounts)
    .filter(([_, data]) => data.count > 0)
    .map(([hour, data]) => ({ 
      hour: parseInt(hour), 
      risk: data.issues / data.count 
    }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 3)
    .map(({ hour }) => `${hour}:00-${hour + 1}:00`);
  
  const variance = shifts.filter(s => s.cashVariance !== 0).length;
  const consistencyScore = Math.round((1 - variance / shifts.length) * 100);
  
  return { preferredDays, riskiestTimes, consistencyScore };
};

export const generatePerformanceSummary = (score: CashierScore, shifts: ShiftHistory[]): string => {
  const parts: string[] = [];
  
  parts.push(`Overall reliability: ${score.overallScore}/100 (${getScoreLabel(score.overallScore)})`);
  
  const weakestSignal = Object.entries({
    'Cash Accuracy': score.cashAccuracyScore,
    'Stock Integrity': score.stockIntegrityScore,
    'Recording Quality': score.recordingQualityScore,
    'Void Behaviour': score.voidBehaviourScore,
    'Receipt Delivery': score.receiptDeliveryScore,
  }).sort((a, b) => a[1] - b[1])[0];
  
  parts.push(`Weakest area: ${weakestSignal[0]} (${weakestSignal[1]})`);
  
  const totalShifts = shifts.length;
  const cleanShifts = shifts.filter(s => 
    s.cashVariance === 0 && s.voidCount <= 1 && s.stockDiscrepancies === 0
  ).length;
  
  parts.push(`Clean shifts: ${cleanShifts}/${totalShifts} (${Math.round(cleanShifts / totalShifts * 100)}%)`);
  
  if (score.patternNote) {
    parts.push(`Pattern: ${score.patternNote}`);
  }
  
  return parts.join('. ');
};

export const getPeerComparisonInsights = (
  cashier: CashierScore,
  peers: CashierScore[]
): {
  percentile: number;
  strongerIn: string[];
  weakerIn: string[];
  gapToTop: number;
} => {
  const sorted = [...peers, cashier].sort((a, b) => b.overallScore - a.overallScore);
  const rank = sorted.findIndex(s => s.userId === cashier.userId) + 1;
  const percentile = Math.round((1 - rank / sorted.length) * 100);
  
  const avgPeerScores = {
    cashAccuracy: peers.reduce((sum, p) => sum + p.cashAccuracyScore, 0) / peers.length,
    stockIntegrity: peers.reduce((sum, p) => sum + p.stockIntegrityScore, 0) / peers.length,
    recordingQuality: peers.reduce((sum, p) => sum + p.recordingQualityScore, 0) / peers.length,
    voidBehaviour: peers.reduce((sum, p) => sum + p.voidBehaviourScore, 0) / peers.length,
    receiptDelivery: peers.reduce((sum, p) => sum + p.receiptDeliveryScore, 0) / peers.length,
  };
  
  const signals: Array<{ name: string; cashier: number; peer: number }> = [
    { name: 'Cash Accuracy', cashier: cashier.cashAccuracyScore, peer: avgPeerScores.cashAccuracy },
    { name: 'Stock Integrity', cashier: cashier.stockIntegrityScore, peer: avgPeerScores.stockIntegrity },
    { name: 'Recording Quality', cashier: cashier.recordingQualityScore, peer: avgPeerScores.recordingQuality },
    { name: 'Void Behaviour', cashier: cashier.voidBehaviourScore, peer: avgPeerScores.voidBehaviour },
    { name: 'Receipt Delivery', cashier: cashier.receiptDeliveryScore, peer: avgPeerScores.receiptDelivery },
  ];
  
  const strongerIn = signals.filter(s => s.cashier > s.peer + 5).map(s => s.name);
  const weakerIn = signals.filter(s => s.cashier < s.peer - 5).map(s => s.name);
  
  const topScore = Math.max(...peers.map(p => p.overallScore));
  const gapToTop = topScore - cashier.overallScore;
  
  return { percentile, strongerIn, weakerIn, gapToTop };
};

export const predictScoreTrajectory = (
  history: Array<{ date: string; score: number }>
): {
  direction: 'improving' | 'stable' | 'declining';
  predictedNextScore: number;
  confidence: number;
} => {
  if (history.length < 3) {
    return { direction: 'stable', predictedNextScore: history[0]?.score || 50, confidence: 0.3 };
  }
  
  const recent = history.slice(0, 5);
  const older = history.slice(5, 10);
  
  const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((sum, h) => sum + h.score, 0) / older.length : recentAvg;
  
  const change = recentAvg - olderAvg;
  const direction = change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';
  
  // Simple linear extrapolation
  const slope = recent.length > 1 
    ? (recent[0].score - recent[recent.length - 1].score) / (recent.length - 1)
    : 0;
  
  const predictedNextScore = Math.max(0, Math.min(100, Math.round(recent[0].score + slope)));
  const confidence = Math.min(0.9, 0.5 + history.length * 0.05);
  
  return { direction, predictedNextScore, confidence };
};

export const getInterventionPriority = (cashier: CashierScore): {
  priority: 'immediate' | 'this_week' | 'this_month' | 'routine';
  urgency: number;
  actions: string[];
} => {
  let priority: 'immediate' | 'this_week' | 'this_month' | 'routine' = 'routine';
  let urgency = 0;
  const actions: string[] = [];
  
  if (cashier.overallScore < 40) {
    priority = 'immediate';
    urgency = 10;
    actions.push('Restrict till access immediately');
    actions.push('Schedule emergency meeting');
    actions.push('Review all recent shifts');
  } else if (cashier.overallScore < 60) {
    priority = 'this_week';
    urgency = 7;
    actions.push('One-on-one coaching session');
    actions.push('Review weakest signals');
    actions.push('Set improvement goals');
  } else if (cashier.overallScore < 75) {
    priority = 'this_month';
    urgency = 5;
    actions.push('Monitor weekly progress');
    actions.push('Provide feedback');
    actions.push('Offer additional training');
  } else {
    priority = 'routine';
    urgency = 2;
    actions.push('Continue regular check-ins');
    actions.push('Recognize good performance');
  }
  
  if (cashier.totalEstimatedLoss > 5000) {
    urgency = Math.min(10, urgency + 2);
    actions.unshift('Investigate loss incidents');
  }
  
  return { priority, urgency, actions };
};

export const createScoreAlertRule = (condition: {
  signal: string;
  threshold: number;
  duration: string;
}): {
  ruleId: string;
  description: string;
  isValid: boolean;
} => {
  const validSignals = Object.keys(SIGNAL_WEIGHTS);
  
  if (!validSignals.includes(condition.signal)) {
    return { ruleId: '', description: '', isValid: false };
  }
  
  if (condition.threshold < 0 || condition.threshold > 100) {
    return { ruleId: '', description: '', isValid: false };
  }
  
  const ruleId = `rule_${Date.now()}`;
  const description = `Alert when ${formatSignalName(condition.signal)} falls below ${condition.threshold} for ${condition.duration}`;
  
  return { ruleId, description, isValid: true };
};

export const getScoreDistributionAnalysis = (scores: CashierScore[]): {
  histogram: number[];
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
} => {
  const values = scores.map(s => s.overallScore);
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate skewness
  const skewness = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / values.length;
  
  // Create histogram (bins of 10)
  const histogram = new Array(10).fill(0);
  values.forEach(v => {
    const bin = Math.min(9, Math.floor(v / 10));
    histogram[bin]++;
  });
  
  return { histogram, mean, median, stdDev, skewness };
};

export const identifyTopPerformers = (scores: CashierScore[], count: number = 3): CashierScore[] => {
  return [...scores]
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, count);
};

export const identifyNeedsAttention = (scores: CashierScore[], count: number = 3): CashierScore[] => {
  return [...scores]
    .sort((a, b) => a.overallScore - b.overallScore)
    .filter(s => s.overallScore < 75)
    .slice(0, count);
};

export const calculateTeamHealth = (scores: CashierScore[]): {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
} => {
  if (scores.length === 0) {
    return { score: 0, status: 'poor', recommendations: ['Hire and train cashiers'] };
  }
  
  const avgScore = scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length;
  const atRiskCount = scores.filter(s => s.overallScore < 60).length;
  const atRiskPercent = atRiskCount / scores.length;
  
  let score = Math.round(avgScore);
  if (atRiskPercent > 0.3) score -= 15;
  else if (atRiskPercent > 0.15) score -= 8;
  
  let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  if (score >= 85) status = 'excellent';
  else if (score >= 70) status = 'good';
  else if (score >= 50) status = 'fair';
  
  const recommendations: string[] = [];
  
  if (atRiskPercent > 0.2) {
    recommendations.push('Multiple cashiers need immediate attention');
  }
  if (avgScore < 70) {
    recommendations.push('Consider team-wide training program');
  }
  if (scores.filter(s => s.overallScore >= 85).length < 2) {
    recommendations.push('Develop top performers to mentor others');
  }
  
  return { score: Math.max(0, score), status, recommendations };
};

export const getCashierScorecard = (score: CashierScore, shifts: ShiftHistory[]): {
  summary: string;
  strengths: string[];
  improvements: string[];
  actions: string[];
} => {
  const strengths: string[] = [];
  const improvements: string[] = [];
  
  if (score.cashAccuracyScore >= 80) strengths.push('Reliable cash handling');
  else improvements.push('Cash accuracy needs work');
  
  if (score.stockIntegrityScore >= 80) strengths.push('Good stock management');
  else improvements.push('Stock handling requires attention');
  
  if (score.recordingQualityScore >= 80) strengths.push('Accurate sales recording');
  else improvements.push('Use product catalog more consistently');
  
  if (score.voidBehaviourScore >= 80) strengths.push('Appropriate void usage');
  else improvements.push('Review void procedures');
  
  if (score.receiptDeliveryScore >= 80) strengths.push('Good customer service');
  else improvements.push('Ensure all customers get receipts');
  
  const actions = getRecommendedTraining(score).map(t => t.module);
  
  return {
    summary: generatePerformanceSummary(score, shifts),
    strengths,
    improvements,
    actions,
  };
};

export default teamService;
