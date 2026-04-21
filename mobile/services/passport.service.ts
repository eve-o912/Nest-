import api from './api';
import type { FinancialPassport } from '@/types/models';

export interface PassportShare {
  id: string;
  lenderId: string;
  lenderName: string;
  shareToken: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  accessCount: number;
  lastAccessedAt?: string;
}

export interface PassportAccessLog {
  id: string;
  shareId: string;
  lenderName: string;
  accessedAt: string;
  ipAddress?: string;
  userAgent?: string;
  dataHash: string;
}

export interface LenderOption {
  id: string;
  name: string;
  logo?: string;
  maxLoanLimit: number;
  interestRateRange: { min: number; max: number };
  requirements: string[];
  isActive: boolean;
}

export interface PassportConsentPreview {
  overallScore: number;
  loanLimit: number;
  signals: Array<{
    name: string;
    score: number;
  }>;
  dataPoints: number;
  daysOfHistory: number;
}

export interface BlockchainAnchor {
  isAnchored: boolean;
  chainTxId?: string;
  anchoredAt?: string;
  network: 'celo' | 'ethereum' | 'polygon';
  explorerUrl?: string;
}

export const passportService = {
  // Get owner's financial passport
  getPassport: async (businessId: string): Promise<{ 
    passport: FinancialPassport | null;
    daysActive: number;
    isEligible: boolean;
  }> => {
    return api.get(`/businesses/${businessId}/passport`);
  },

  // Get active shares
  getShares: async (businessId: string): Promise<{ 
    shares: PassportShare[];
    totalShares: number;
  }> => {
    return api.get(`/businesses/${businessId}/passport/shares`);
  },

  // Share passport with lender (requires PIN confirmation)
  shareWithLender: async (
    businessId: string, 
    lenderId: string, 
    pin: string,
    durationDays: number = 30
  ): Promise<{ 
    share: PassportShare;
    snapshot: PassportConsentPreview;
  }> => {
    return api.post(`/businesses/${businessId}/passport/share`, {
      lenderId,
      pin,
      durationDays,
    });
  },

  // Revoke share access
  revokeShare: async (businessId: string, shareId: string): Promise<{ 
    message: string;
  }> => {
    return api.delete(`/businesses/${businessId}/passport/shares/${shareId}`);
  },

  // Get access logs
  getAccessLogs: async (businessId: string): Promise<{ 
    logs: PassportAccessLog[];
    totalAccesses: number;
    uniqueLenders: number;
  }> => {
    return api.get(`/businesses/${businessId}/passport/access-logs`);
  },

  // Get available lenders
  getLenders: async (): Promise<{ 
    lenders: LenderOption[];
  }> => {
    return api.get('/lenders');
  },

  // Get blockchain anchor status
  getBlockchainAnchor: async (businessId: string): Promise<{
    anchor: BlockchainAnchor;
  }> => {
    return api.get(`/businesses/${businessId}/passport/anchor`);
  },

  // Trigger blockchain anchoring (Phase 3)
  triggerAnchoring: async (businessId: string, pin: string): Promise<{
    anchor: BlockchainAnchor;
  }> => {
    return api.post(`/businesses/${businessId}/passport/anchor`, { pin });
  },

  // Verify passport integrity
  verifyIntegrity: async (businessId: string): Promise<{
    isValid: boolean;
    currentHash: string;
    storedHash: string;
    lastCalculatedAt: string;
  }> => {
    return api.get(`/businesses/${businessId}/passport/verify`);
  },

  // Export passport data
  exportPassport: async (businessId: string): Promise<{
    downloadUrl: string;
    expiresAt: string;
  }> => {
    return api.get(`/businesses/${businessId}/passport/export`);
  },
};

// Helper functions
export const getPassportStatus = (
  passport: FinancialPassport | null,
  daysActive: number
): {
  status: 'pending' | 'active' | 'expired';
  message: string;
  daysUntilExpiry?: number;
} => {
  if (!passport) {
    const daysNeeded = Math.max(0, 60 - daysActive);
    return {
      status: 'pending',
      message: daysNeeded > 0 
        ? `${daysNeeded} more days of data needed`
        : 'Processing your passport...',
    };
  }

  const expiresAt = new Date(passport.expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    return {
      status: 'expired',
      message: 'Passport expired - recalculation needed',
    };
  }

  return {
    status: 'active',
    message: `Valid for ${daysUntilExpiry} more days`,
    daysUntilExpiry,
  };
};

export const getLoanEligibility = (
  passport: FinancialPassport | null
): {
  isEligible: boolean;
  maxLoan: number;
  reason?: string;
} => {
  if (!passport) {
    return {
      isEligible: false,
      maxLoan: 0,
      reason: 'Passport not yet issued (60 days required)',
    };
  }

  if (passport.overallScore < 40) {
    return {
      isEligible: false,
      maxLoan: 0,
      reason: 'Score too low for lending (minimum 40 required)',
    };
  }

  return {
    isEligible: true,
    maxLoan: passport.loanLimit,
  };
};

export const formatSignalScore = (score: number): {
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  color: string;
} => {
  if (score >= 85) return { label: 'Excellent', color: '#22C55E' };
  if (score >= 70) return { label: 'Good', color: '#3B82F6' };
  if (score >= 50) return { label: 'Fair', color: '#F59E0B' };
  return { label: 'Poor', color: '#EF4444' };
};

export const calculateCompositeScore = (signals: {
  revenueScore: number;
  marginScore: number;
  savingsScore: number;
  integrityScore: number;
  staffScore: number;
  engagementScore: number;
}): number => {
  const weights = {
    revenueScore: 0.25,
    marginScore: 0.20,
    savingsScore: 0.20,
    integrityScore: 0.15,
    staffScore: 0.10,
    engagementScore: 0.10,
  };

  return Math.round(
    signals.revenueScore * weights.revenueScore +
    signals.marginScore * weights.marginScore +
    signals.savingsScore * weights.savingsScore +
    signals.integrityScore * weights.integrityScore +
    signals.staffScore * weights.staffScore +
    signals.engagementScore * weights.engagementScore
  );
};

export const getLoanLimitEstimate = (
  avgMonthlyRevenue: number,
  score: number
): number => {
  // Loan limit is typically 1-3 months of revenue based on score
  const multiplier = score >= 80 ? 3 : score >= 60 ? 2 : score >= 40 ? 1 : 0;
  return Math.round(avgMonthlyRevenue * multiplier);
};

export const generatePassportSummary = (passport: FinancialPassport): string => {
  const parts: string[] = [];
  
  parts.push(`Financial Passport Score: ${passport.overallScore}/100`);
  parts.push(`Pre-approved loan limit: KES ${(passport.loanLimit / 100).toLocaleString()}`);
  parts.push(`Based on ${passport.revenueConsistency.toFixed(1)} days of consistent data`);
  
  const signals = [
    { name: 'Revenue', score: passport.revenueScore },
    { name: 'Margins', score: passport.marginScore },
    { name: 'Savings', score: passport.savingsScore },
    { name: 'Integrity', score: passport.integrityScore },
    { name: 'Staff', score: passport.staffScore },
    { name: 'Engagement', score: passport.engagementScore },
  ];
  
  const strongest = signals.reduce((max, s) => s.score > max.score ? s : max, signals[0]);
  const weakest = signals.reduce((min, s) => s.score < min.score ? s : min, signals[0]);
  
  parts.push(`Strongest: ${strongest.name} (${strongest.score})`);
  parts.push(`Needs work: ${weakest.name} (${weakest.score})`);
  
  return parts.join('. ');
};

export const validateShareToken = (token: string): boolean => {
  // Share tokens are UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(token);
};

export const getShareExpiryWarning = (expiresAt: string): {
  isExpiringSoon: boolean;
  daysLeft: number;
  message: string;
} => {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    isExpiringSoon: daysLeft <= 7,
    daysLeft,
    message: daysLeft <= 0 
      ? 'Expired' 
      : daysLeft === 1 
        ? 'Expires tomorrow' 
        : `Expires in ${daysLeft} days`,
  };
};

export const formatBlockchainTxUrl = (txId: string, network: string): string => {
  const explorers: Record<string, string> = {
    celo: `https://explorer.celo.org/mainnet/tx/${txId}`,
    ethereum: `https://etherscan.io/tx/${txId}`,
    polygon: `https://polygonscan.com/tx/${txId}`,
  };
  return explorers[network] || '#';
};

export const generateShareReceipt = (
  share: PassportShare,
  passport: FinancialPassport
): string => {
  const lines = [
    'NEST FINANCIAL PASSPORT - SHARE RECEIPT',
    '========================================',
    '',
    `Shared with: ${share.lenderName}`,
    `Share ID: ${share.shareToken}`,
    `Created: ${new Date(share.createdAt).toLocaleString('en-KE')}`,
    `Expires: ${new Date(share.expiresAt).toLocaleString('en-KE')}`,
    '',
    'DATA SHARED:',
    `- Overall Score: ${passport.overallScore}/100`,
    `- Loan Limit: KES ${(passport.loanLimit / 100).toLocaleString()}`,
    `- Revenue Score: ${passport.revenueScore}`,
    `- Margin Score: ${passport.marginScore}`,
    `- Savings Score: ${passport.savingsScore}`,
    `- Integrity Score: ${passport.integrityScore}`,
    '',
    `Data Hash: ${passport.dataHash}`,
    'This share is cryptographically signed and tamper-evident.',
  ];
  
  return lines.join('\n');
};

export const comparePassportVersions = (
  current: FinancialPassport,
  previous: FinancialPassport
): {
  scoreChange: number;
  limitChange: number;
  improvedSignals: string[];
  declinedSignals: string[];
} => {
  const scoreChange = current.overallScore - previous.overallScore;
  const limitChange = current.loanLimit - previous.loanLimit;
  
  const signals: Array<{ name: string; current: number; previous: number }> = [
    { name: 'Revenue', current: current.revenueScore, previous: previous.revenueScore },
    { name: 'Margins', current: current.marginScore, previous: previous.marginScore },
    { name: 'Savings', current: current.savingsScore, previous: previous.savingsScore },
    { name: 'Integrity', current: current.integrityScore, previous: previous.integrityScore },
    { name: 'Staff', current: current.staffScore, previous: previous.staffScore },
    { name: 'Engagement', current: current.engagementScore, previous: previous.engagementScore },
  ];
  
  const improvedSignals = signals
    .filter(s => s.current > s.previous + 5)
    .map(s => s.name);
  
  const declinedSignals = signals
    .filter(s => s.current < s.previous - 5)
    .map(s => s.name);
  
  return { scoreChange, limitChange, improvedSignals, declinedSignals };
};

export const getRecommendedLenders = (
  passport: FinancialPassport,
  lenders: LenderOption[]
): LenderOption[] => {
  return lenders
    .filter(l => l.isActive)
    .filter(l => passport.loanLimit <= l.maxLoanLimit)
    .filter(l => passport.overallScore >= 40)
    .sort((a, b) => a.interestRateRange.min - b.interestRateRange.min);
};

export const calculateTrustTier = (passport: FinancialPassport): {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  benefits: string[];
} => {
  const score = passport.overallScore;
  const consistency = passport.revenueConsistency;
  
  if (score >= 90 && consistency >= 0.9) {
    return {
      tier: 'platinum',
      benefits: ['Highest loan limits', 'Lowest rates', 'Priority processing', 'Dedicated support'],
    };
  }
  if (score >= 80 && consistency >= 0.8) {
    return {
      tier: 'gold',
      benefits: ['High loan limits', 'Competitive rates', 'Fast processing'],
    };
  }
  if (score >= 65 && consistency >= 0.7) {
    return {
      tier: 'silver',
      benefits: ['Standard loan limits', 'Market rates', 'Regular processing'],
    };
  }
  return {
    tier: 'bronze',
    benefits: ['Entry-level loans', 'Higher rates', 'Standard processing'],
  };
};

export const estimateImprovementPotential = (
  passport: FinancialPassport
): {
  maxPossibleScore: number;
  potentialLoanIncrease: number;
  priorityActions: string[];
} => {
  const signals = [
    { name: 'Revenue Consistency', score: passport.revenueScore, weight: 0.25 },
    { name: 'Net Margins', score: passport.marginScore, weight: 0.20 },
    { name: 'Savings Rate', score: passport.savingsScore, weight: 0.20 },
    { name: 'Data Integrity', score: passport.integrityScore, weight: 0.15 },
    { name: 'Staff Reliability', score: passport.staffScore, weight: 0.10 },
    { name: 'Platform Engagement', score: passport.engagementScore, weight: 0.10 },
  ];
  
  const currentWeighted = signals.reduce((sum, s) => sum + s.score * s.weight, 0);
  const maxWeighted = signals.reduce((sum, s) => sum + 100 * s.weight, 0);
  const improvementPotential = maxWeighted - currentWeighted;
  
  const weakestSignals = signals
    .filter(s => s.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
  
  return {
    maxPossibleScore: Math.round(currentWeighted + improvementPotential),
    potentialLoanIncrease: Math.round(improvementPotential * 10000), // Approximate
    priorityActions: weakestSignals.map(s => `Improve ${s.name} (currently ${s.score})`),
  };
};

export const generateLenderPitch = (passport: FinancialPassport): string => {
  const avgRevenue = passport.avgMonthlyRevenue / 100;
  const loanLimit = passport.loanLimit / 100;
  
  return `
    This business has been verified through 60+ days of immutable financial records on Nest.
    
    Key Metrics:
    - Average Monthly Revenue: KES ${avgRevenue.toLocaleString()}
    - Revenue Consistency: ${(passport.revenueConsistency * 100).toFixed(0)}%
    - Net Margin: ${(passport.avgNetMargin * 100).toFixed(1)}%
    - Data Integrity Score: ${passport.integrityScore}/100
    - Pre-approved Loan Limit: KES ${loanLimit.toLocaleString()}
    
    All data is cryptographically signed with SHA-256 hash ${passport.dataHash.substring(0, 16)}...
    ${passport.chainTxId ? `Anchored to blockchain: ${passport.chainTxId.substring(0, 16)}...` : ''}
  `.trim();
};

export const getPrivacySettings = (): Array<{
  field: string;
  isShared: boolean;
  sensitivity: 'low' | 'medium' | 'high';
}> => {
  return [
    { field: 'Overall Score', isShared: true, sensitivity: 'low' },
    { field: 'Loan Limit', isShared: true, sensitivity: 'low' },
    { field: 'Revenue Score', isShared: true, sensitivity: 'medium' },
    { field: 'Margin Score', isShared: true, sensitivity: 'medium' },
    { field: 'Savings Score', isShared: true, sensitivity: 'medium' },
    { field: 'Integrity Score', isShared: true, sensitivity: 'low' },
    { field: 'Staff Score', isShared: false, sensitivity: 'high' },
    { field: 'Engagement Score', isShared: false, sensitivity: 'low' },
    { field: 'Raw Transaction Data', isShared: false, sensitivity: 'high' },
    { field: 'Individual Cashier Scores', isShared: false, sensitivity: 'high' },
    { field: 'Data Hash', isShared: true, sensitivity: 'low' },
    { field: 'Blockchain Tx ID', isShared: true, sensitivity: 'low' },
  ];
};

export const calculateDataFreshness = (calculatedAt: string): {
  isFresh: boolean;
  ageDays: number;
  recommendation: string;
} => {
  const calculated = new Date(calculatedAt);
  const now = new Date();
  const ageDays = Math.floor((now.getTime() - calculated.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    isFresh: ageDays <= 7,
    ageDays,
    recommendation: ageDays > 14 
      ? 'Passport should be recalculated for accuracy'
      : ageDays > 7 
        ? 'Data is getting stale'
        : 'Data is current',
  };
};

export default passportService;
