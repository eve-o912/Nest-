import api from './api';

export type ConnectionType = 'mpesa_daraja' | 'stitch' | 'mono' | 'sms_fallback';
export type ConnectionStatus = 'pending' | 'active' | 'error' | 'disconnected';

export interface AccountConnection {
  id: string;
  businessId: string;
  type: ConnectionType;
  name: string;
  status: ConnectionStatus;
  config: Record<string, any>;
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
  isDefault: boolean;
}

export interface AccountTransaction {
  id: string;
  connectionId: string;
  externalId: string;
  amount: number;
  currency: string;
  direction: 'in' | 'out';
  description: string;
  timestamp: string;
  matchedTransactionId?: string;
  matchConfidence?: number;
  rawData: Record<string, any>;
}

export interface MpesaConfig {
  shortCode: string;
  tillNumber?: string;
  consumerKey: string;
  consumerSecret: string;
  passKey: string;
  callbackUrl: string;
}

export interface StitchConfig {
  clientId: string;
  bankCode: string;
  accountId?: string;
}

export interface SmsFallbackConfig {
  phoneNumber: string;
  provider: 'africas_talking' | 'twilio';
}

export const connectionService = {
  // Get all connections for business
  getConnections: async (businessId: string): Promise<{ connections: AccountConnection[] }> => {
    return api.get(`/businesses/${businessId}/connections`);
  },

  // Create M-Pesa Daraja connection
  createMpesaConnection: async (
    businessId: string,
    config: MpesaConfig
  ): Promise<{ connection: AccountConnection }> => {
    return api.post(`/businesses/${businessId}/connections/mpesa`, config);
  },

  // Create Stitch bank connection
  createStitchConnection: async (
    businessId: string,
    config: StitchConfig
  ): Promise<{ connection: AccountConnection; authUrl: string }> => {
    return api.post(`/businesses/${businessId}/connections/stitch`, config);
  },

  // Create SMS fallback connection
  createSmsConnection: async (
    businessId: string,
    config: SmsFallbackConfig
  ): Promise<{ connection: AccountConnection }> => {
    return api.post(`/businesses/${businessId}/connections/sms`, config);
  },

  // Delete connection
  deleteConnection: async (businessId: string, connectionId: string): Promise<{ message: string }> => {
    return api.delete(`/businesses/${businessId}/connections/${connectionId}`);
  },

  // Test connection
  testConnection: async (businessId: string, connectionId: string): Promise<{ 
    success: boolean; 
    message: string;
  }> => {
    return api.post(`/businesses/${businessId}/connections/${connectionId}/test`);
  },

  // Get account transactions
  getTransactions: async (
    businessId: string,
    params?: {
      connectionId?: string;
      from?: string;
      to?: string;
      unmatchedOnly?: boolean;
      limit?: number;
    }
  ): Promise<{ transactions: AccountTransaction[]; total: number }> => {
    return api.get(`/businesses/${businessId}/account-transactions`, { params });
  },

  // Manually match transaction
  matchTransaction: async (
    businessId: string,
    accountTxId: string,
    transactionId: string
  ): Promise<{ success: boolean }> => {
    return api.post(`/businesses/${businessId}/account-transactions/${accountTxId}/match`, {
      transactionId,
    });
  },

  // Get reconciliation stats
  getReconciliationStats: async (businessId: string): Promise<{
    totalTransactions: number;
    matched: number;
    unmatched: number;
    matchRate: number;
    byConnection: Record<string, { total: number; matched: number }>;
  }> => {
    return api.get(`/businesses/${businessId}/reconciliation-stats`);
  },

  // Register webhook endpoint (server-side)
  registerDarajaWebhook: async (businessId: string, url: string): Promise<{ 
    registered: boolean;
    validationUrl: string;
    confirmationUrl: string;
  }> => {
    return api.post(`/webhooks/daraja/register`, { businessId, url });
  },

  // Simulate Daraja webhook (for testing)
  simulateMpesaPayment: async (
    businessId: string,
    data: {
      amount: number;
      phoneNumber: string;
      reference: string;
    }
  ): Promise<{ success: boolean; transactionId: string }> => {
    return api.post(`/businesses/${businessId}/simulate-mpesa`, data);
  },
};

// Helper functions
export const getConnectionIcon = (type: ConnectionType): string => {
  const icons: Record<ConnectionType, string> = {
    mpesa_daraja: '📱',
    stitch: '🏦',
    mono: '🏛️',
    sms_fallback: '💬',
  };
  return icons[type];
};

export const getConnectionName = (type: ConnectionType): string => {
  const names: Record<ConnectionType, string> = {
    mpesa_daraja: 'M-Pesa (Daraja)',
    stitch: 'Bank Account (Stitch)',
    mono: 'Bank Account (Mono)',
    sms_fallback: 'SMS Fallback',
  };
  return names[type];
};

export const getConnectionDescription = (type: ConnectionType): string => {
  const descriptions: Record<ConnectionType, string> = {
    mpesa_daraja: 'Instant M-Pesa payments via Safaricom Daraja API',
    stitch: 'Daily bank sync via Stitch OAuth',
    mono: 'Bank transactions via Mono API',
    sms_fallback: 'SMS forwarding for businesses without Till Number',
  };
  return descriptions[type];
};

export const getStatusColor = (status: ConnectionStatus): string => {
  const colors: Record<ConnectionStatus, string> = {
    pending: '#F59E0B',
    active: '#22C55E',
    error: '#EF4444',
    disconnected: '#6B7280',
  };
  return colors[status];
};

export const getStatusLabel = (status: ConnectionStatus): string => {
  const labels: Record<ConnectionStatus, string> = {
    pending: 'Setting up...',
    active: 'Connected',
    error: 'Error',
    disconnected: 'Disconnected',
  };
  return labels[status];
};

export const formatMpesaShortCode = (code: string): string => {
  // Format as 123456 or 12345
  return code.replace(/\D/g, '').slice(0, 6);
};

export const validateMpesaConfig = (config: MpesaConfig): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!config.shortCode || config.shortCode.length < 5) {
    errors.push('Short code must be at least 5 digits');
  }
  if (!config.consumerKey) {
    errors.push('Consumer key is required');
  }
  if (!config.consumerSecret) {
    errors.push('Consumer secret is required');
  }
  if (!config.passKey) {
    errors.push('Pass key is required');
  }

  return { isValid: errors.length === 0, errors };
};

export const generateCallbackUrl = (businessId: string): string => {
  // Production URL would be configured
  return `https://api.nest.co.ke/webhooks/daraja/${businessId}`;
};

export const formatAccountTransaction = (tx: AccountTransaction): {
  displayAmount: string;
  displayTime: string;
  isMatched: boolean;
  matchStatus: string;
} => {
  const displayAmount = `KES ${(tx.amount / 100).toLocaleString()}`;
  const displayTime = new Date(tx.timestamp).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const isMatched = !!tx.matchedTransactionId;
  const matchStatus = isMatched 
    ? `Matched (${Math.round((tx.matchConfidence || 0) * 100)}%)`
    : 'Unmatched';

  return { displayAmount, displayTime, isMatched, matchStatus };
};

export const getReconciliationHealth = (
  stats: { matchRate: number; unmatched: number }
): {
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  message: string;
} => {
  if (stats.matchRate >= 95 && stats.unmatched === 0) {
    return { status: 'excellent', message: 'Perfect reconciliation' };
  }
  if (stats.matchRate >= 85) {
    return { status: 'good', message: 'Good match rate' };
  }
  if (stats.matchRate >= 70) {
    return { status: 'needs_attention', message: 'Review unmatched transactions' };
  }
  return { status: 'critical', message: 'Reconciliation issues detected' };
};

export const autoMatchTransactions = async (
  businessId: string,
  connectionId: string,
  windowMinutes: number = 5
): Promise<{
  matched: number;
  unmatched: number;
}> => {
  // This would call an API endpoint for auto-matching
  const response = await api.post(`/businesses/${businessId}/auto-match`, {
    connectionId,
    windowMinutes,
  });
  return response.data;
};

export const exportReconciliationReport = async (
  businessId: string,
  dateRange: { from: string; to: string }
): Promise<{ downloadUrl: string }> => {
  return api.post(`/businesses/${businessId}/reconciliation-export`, dateRange);
};

export const getSuggestedMatches = async (
  businessId: string,
  accountTxId: string
): Promise<{
  suggestions: Array<{
    transactionId: string;
    confidence: number;
    amount: number;
    time: string;
  }>;
}> => {
  return api.get(`/businesses/${businessId}/account-transactions/${accountTxId}/suggestions`);
};

export const batchMatchTransactions = async (
  businessId: string,
  matches: Array<{ accountTxId: string; transactionId: string }>
): Promise<{
  successful: number;
  failed: number;
}> => {
  return api.post(`/businesses/${businessId}/batch-match`, { matches });
};

export const ignoreTransaction = async (
  businessId: string,
  accountTxId: string,
  reason: string
): Promise<{ success: boolean }> => {
  return api.post(`/businesses/${businessId}/account-transactions/${accountTxId}/ignore`, {
    reason,
  });
};

export const getUnmatchedAlerts = async (
  businessId: string,
  threshold: number = 5
): Promise<{
  hasAlerts: boolean;
  count: number;
  oldestUnmatched: string;
}> => {
  const { transactions } = await connectionService.getTransactions(businessId, {
    unmatchedOnly: true,
    limit: threshold,
  });

  return {
    hasAlerts: transactions.length >= threshold,
    count: transactions.length,
    oldestUnmatched: transactions[transactions.length - 1]?.timestamp || '',
  };
};

export default connectionService;
