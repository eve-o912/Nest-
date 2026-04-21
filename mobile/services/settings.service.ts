import api from './api';
import { useAuthStore } from '@/store/auth.store';

export type Language = 'en' | 'sw';
export type Currency = 'KES' | 'UGX' | 'TZS' | 'NGN';
export type Country = 'KE' | 'UG' | 'TZ' | 'NG';

export interface BusinessSettings {
  name: string;
  type: 'retail' | 'wholesale' | 'services' | 'food' | 'other';
  currency: Currency;
  country: Country;
  timezone: string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  
  // Alert types
  cashMismatch: boolean;
  lowStock: boolean;
  dailyCloseReminder: boolean;
  weeklyInsight: boolean;
  scoreDrop: boolean;
  loanMilestone: boolean;
  passportAccess: boolean;
  stockDiscrepancy: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'cash' | 'mpesa' | 'bank' | 'card' | 'other';
  name: string;
  isActive: boolean;
  config?: Record<string, any>;
}

export interface SecuritySettings {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
}

export interface ActiveSession {
  id: string;
  deviceName: string;
  deviceType: 'ios' | 'android' | 'web';
  lastActiveAt: string;
  ipAddress: string;
  location?: string;
  isCurrent: boolean;
}

export const settingsService = {
  // Business Settings
  getBusinessSettings: async (businessId: string): Promise<{ settings: BusinessSettings }> => {
    return api.get(`/businesses/${businessId}/settings`);
  },

  updateBusinessSettings: async (
    businessId: string,
    settings: Partial<BusinessSettings>
  ): Promise<{ settings: BusinessSettings }> => {
    return api.put(`/businesses/${businessId}/settings`, settings);
  },

  // Notification Settings
  getNotificationSettings: async (businessId: string): Promise<{ settings: NotificationSettings }> => {
    return api.get(`/businesses/${businessId}/notification-settings`);
  },

  updateNotificationSettings: async (
    businessId: string,
    settings: Partial<NotificationSettings>
  ): Promise<{ settings: NotificationSettings }> => {
    return api.put(`/businesses/${businessId}/notification-settings`, settings);
  },

  // Payment Methods
  getPaymentMethods: async (businessId: string): Promise<{ methods: PaymentMethod[] }> => {
    return api.get(`/businesses/${businessId}/payment-methods`);
  },

  updatePaymentMethod: async (
    businessId: string,
    methodId: string,
    updates: Partial<PaymentMethod>
  ): Promise<{ method: PaymentMethod }> => {
    return api.put(`/businesses/${businessId}/payment-methods/${methodId}`, updates);
  },

  // Security Settings
  getSecuritySettings: async (userId: string): Promise<{ settings: SecuritySettings }> => {
    return api.get(`/users/${userId}/security-settings`);
  },

  updateSecuritySettings: async (
    userId: string,
    settings: Partial<SecuritySettings>
  ): Promise<{ settings: SecuritySettings }> => {
    return api.put(`/users/${userId}/security-settings`, settings);
  },

  // PIN Management
  setupPin: async (userId: string, pin: string): Promise<{ success: boolean }> => {
    return api.post(`/users/${userId}/pin`, { pin });
  },

  verifyPin: async (userId: string, pin: string): Promise<{ valid: boolean }> => {
    return api.post(`/users/${userId}/verify-pin`, { pin });
  },

  changePin: async (
    userId: string,
    oldPin: string,
    newPin: string
  ): Promise<{ success: boolean }> => {
    return api.put(`/users/${userId}/pin`, { oldPin, newPin });
  },

  // Active Sessions
  getActiveSessions: async (userId: string): Promise<{ sessions: ActiveSession[] }> => {
    return api.get(`/users/${userId}/sessions`);
  },

  revokeSession: async (userId: string, sessionId: string): Promise<{ success: boolean }> => {
    return api.delete(`/users/${userId}/sessions/${sessionId}`);
  },

  revokeAllSessions: async (userId: string, exceptCurrent: boolean = true): Promise<{ 
    revoked: number;
  }> => {
    return api.post(`/users/${userId}/sessions/revoke-all`, { exceptCurrent });
  },

  // Sign Out
  signOut: async (): Promise<{ success: boolean }> => {
    const auth = useAuthStore.getState();
    if (auth.tokens?.refreshToken) {
      await api.post('/auth/logout', { refreshToken: auth.tokens.refreshToken });
    }
    auth.logout();
    return { success: true };
  },

  // Language Preference
  setLanguage: async (userId: string, language: Language): Promise<{ success: boolean }> => {
    return api.put(`/users/${userId}/language`, { language });
  },

  // Export Data
  exportData: async (businessId: string, format: 'csv' | 'json' | 'xlsx'): Promise<{
    downloadUrl: string;
    expiresAt: string;
  }> => {
    return api.post(`/businesses/${businessId}/export`, { format });
  },

  // Delete Account
  requestAccountDeletion: async (userId: string, reason?: string): Promise<{
    scheduledDate: string;
    message: string;
  }> => {
    return api.post(`/users/${userId}/delete-request`, { reason });
  },

  cancelAccountDeletion: async (userId: string): Promise<{ success: boolean }> => {
    return api.post(`/users/${userId}/cancel-deletion`);
  },
};

// Helper functions
export const getLanguageName = (code: Language): string => {
  const names: Record<Language, string> = {
    en: 'English',
    sw: 'Swahili',
  };
  return names[code];
};

export const getCurrencySymbol = (code: Currency): string => {
  const symbols: Record<Currency, string> = {
    KES: 'KES',
    UGX: 'UGX',
    TZS: 'TZS',
    NGN: '₦',
  };
  return symbols[code];
};

export const getCountryName = (code: Country): string => {
  const names: Record<Country, string> = {
    KE: 'Kenya',
    UG: 'Uganda',
    TZ: 'Tanzania',
    NG: 'Nigeria',
  };
  return names[code];
};

export const getBusinessTypeName = (type: BusinessSettings['type']): string => {
  const names: Record<BusinessSettings['type'], string> = {
    retail: 'Retail Shop',
    wholesale: 'Wholesale/Distributor',
    services: 'Service Business',
    food: 'Restaurant/Food',
    other: 'Other',
  };
  return names[type];
};

export const getPaymentMethodName = (type: PaymentMethod['type']): string => {
  const names: Record<PaymentMethod['type'], string> = {
    cash: 'Cash',
    mpesa: 'M-Pesa',
    bank: 'Bank Transfer',
    card: 'Card Payment',
    other: 'Other',
  };
  return names[type];
};

export const getPaymentMethodIcon = (type: PaymentMethod['type']): string => {
  const icons: Record<PaymentMethod['type'], string> = {
    cash: '💵',
    mpesa: '📱',
    bank: '🏦',
    card: '💳',
    other: '💰',
  };
  return icons[type];
};

export const getAlertDescription = (alertType: keyof NotificationSettings): string => {
  const descriptions: Record<string, string> = {
    cashMismatch: 'When |cash variance| > KES 5 after day close',
    lowStock: 'When stock reaches reorder level',
    dailyCloseReminder: 'At 8pm if day not closed',
    weeklyInsight: 'Monday 7am AI-generated P&L summary',
    scoreDrop: 'When cashier score falls below 50',
    loanMilestone: 'When loan limit crosses threshold',
    passportAccess: 'When lender queries passport',
    stockDiscrepancy: 'After physical count reveals gap',
    pushEnabled: 'Push notifications to device',
    whatsappEnabled: 'WhatsApp Business messages',
    smsEnabled: 'SMS fallback when WhatsApp fails',
    emailEnabled: 'Email notifications (if provided)',
  };
  return descriptions[alertType] || '';
};

export const formatSessionDevice = (session: ActiveSession): string => {
  const typeEmojis: Record<string, string> = {
    ios: '🍎',
    android: '🤖',
    web: '🌐',
  };
  return `${typeEmojis[session.deviceType] || '📱'} ${session.deviceName}`;
};

export const getSessionDuration = (lastActiveAt: string): string => {
  const lastActive = new Date(lastActiveAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const validatePin = (pin: string): { isValid: boolean; error?: string } => {
  if (pin.length !== 4) {
    return { isValid: false, error: 'PIN must be 4 digits' };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { isValid: false, error: 'PIN must contain only numbers' };
  }
  if (/^(\d)\1{3}$/.test(pin)) {
    return { isValid: false, error: 'PIN cannot be repeating digits (e.g., 1111)' };
  }
  if (/^(0123|1234|2345|3456|4567|5678|6789|7890|0987|9876|8765|7654|6543|5432|4321|3210)$/.test(pin)) {
    return { isValid: false, error: 'PIN cannot be sequential digits' };
  }
  return { isValid: true };
};

export const getDefaultNotificationSettings = (): NotificationSettings => ({
  pushEnabled: true,
  whatsappEnabled: true,
  smsEnabled: true,
  emailEnabled: false,
  cashMismatch: true,
  lowStock: true,
  dailyCloseReminder: true,
  weeklyInsight: true,
  scoreDrop: true,
  loanMilestone: true,
  passportAccess: true,
  stockDiscrepancy: true,
});

export const getDefaultBusinessSettings = (): BusinessSettings => ({
  name: '',
  type: 'retail',
  currency: 'KES',
  country: 'KE',
  timezone: 'Africa/Nairobi',
});

export const getDefaultSecuritySettings = (): SecuritySettings => ({
  pinEnabled: true,
  biometricEnabled: false,
  twoFactorEnabled: false,
  sessionTimeoutMinutes: 30,
});

export const groupNotificationSettings = (
  settings: NotificationSettings
): {
  channels: Array<{ key: string; enabled: boolean; label: string }>;
  alerts: Array<{ key: string; enabled: boolean; label: string; description: string }>;
} => {
  const channels = [
    { key: 'pushEnabled', enabled: settings.pushEnabled, label: 'Push Notifications' },
    { key: 'whatsappEnabled', enabled: settings.whatsappEnabled, label: 'WhatsApp' },
    { key: 'smsEnabled', enabled: settings.smsEnabled, label: 'SMS Fallback' },
    { key: 'emailEnabled', enabled: settings.emailEnabled, label: 'Email' },
  ];

  const alerts = [
    { key: 'cashMismatch', enabled: settings.cashMismatch, label: 'Cash Mismatch', description: getAlertDescription('cashMismatch') },
    { key: 'lowStock', enabled: settings.lowStock, label: 'Low Stock', description: getAlertDescription('lowStock') },
    { key: 'dailyCloseReminder', enabled: settings.dailyCloseReminder, label: 'Daily Close Reminder', description: getAlertDescription('dailyCloseReminder') },
    { key: 'weeklyInsight', enabled: settings.weeklyInsight, label: 'Weekly P&L Insight', description: getAlertDescription('weeklyInsight') },
    { key: 'scoreDrop', enabled: settings.scoreDrop, label: 'Score Drop Alert', description: getAlertDescription('scoreDrop') },
    { key: 'loanMilestone', enabled: settings.loanMilestone, label: 'Loan Milestone', description: getAlertDescription('loanMilestone') },
    { key: 'passportAccess', enabled: settings.passportAccess, label: 'Passport Access', description: getAlertDescription('passportAccess') },
    { key: 'stockDiscrepancy', enabled: settings.stockDiscrepancy, label: 'Stock Discrepancy', description: getAlertDescription('stockDiscrepancy') },
  ];

  return { channels, alerts };
};

export const compareSettings = <T extends Record<string, any>>(
  current: T,
  previous: T
): {
  changed: boolean;
  changes: Array<{ key: string; old: any; new: any }>;
} => {
  const changes: Array<{ key: string; old: any; new: any }> = [];

  for (const key of Object.keys(current)) {
    if (current[key] !== previous[key]) {
      changes.push({ key, old: previous[key], new: current[key] });
    }
  }

  return { changed: changes.length > 0, changes };
};

export const exportSettings = (settings: {
  business: BusinessSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
}): string => {
  return JSON.stringify(settings, null, 2);
};

export const importSettings = (json: string): {
  success: boolean;
  settings?: {
    business: BusinessSettings;
    notifications: NotificationSettings;
    security: SecuritySettings;
  };
  error?: string;
} => {
  try {
    const parsed = JSON.parse(json);
    // Validate structure
    if (!parsed.business || !parsed.notifications || !parsed.security) {
      return { success: false, error: 'Invalid settings file structure' };
    }
    return { success: true, settings: parsed };
  } catch (err) {
    return { success: false, error: 'Invalid JSON format' };
  }
};

export const getRecommendedSettings = (businessType: BusinessSettings['type']): {
  notifications: Partial<NotificationSettings>;
  paymentMethods: PaymentMethod['type'][];
} => {
  const recommendations: Record<BusinessSettings['type'], {
    notifications: Partial<NotificationSettings>;
    paymentMethods: PaymentMethod['type'][];
  }> = {
    retail: {
      notifications: { lowStock: true, cashMismatch: true, dailyCloseReminder: true },
      paymentMethods: ['cash', 'mpesa', 'card'],
    },
    wholesale: {
      notifications: { stockDiscrepancy: true, cashMismatch: true, weeklyInsight: true },
      paymentMethods: ['bank', 'cash', 'mpesa'],
    },
    services: {
      notifications: { dailyCloseReminder: true, weeklyInsight: true, cashMismatch: true },
      paymentMethods: ['mpesa', 'bank', 'cash'],
    },
    food: {
      notifications: { lowStock: true, dailyCloseReminder: true, cashMismatch: true },
      paymentMethods: ['cash', 'mpesa', 'card'],
    },
    other: {
      notifications: { cashMismatch: true, dailyCloseReminder: true },
      paymentMethods: ['cash', 'mpesa'],
    },
  };

  return recommendations[businessType];
};

export const generateSettingsReport = (
  business: BusinessSettings,
  notifications: NotificationSettings,
  sessions: ActiveSession[]
): string => {
  const lines = [
    'NEST SETTINGS REPORT',
    '====================',
    '',
    `Generated: ${new Date().toLocaleString('en-KE')}`,
    '',
    'BUSINESS SETTINGS:',
    `- Name: ${business.name}`,
    `- Type: ${getBusinessTypeName(business.type)}`,
    `- Currency: ${getCurrencySymbol(business.currency)}`,
    `- Country: ${getCountryName(business.country)}`,
    '',
    'NOTIFICATION CHANNELS:',
    `- Push: ${notifications.pushEnabled ? 'ON' : 'OFF'}`,
    `- WhatsApp: ${notifications.whatsappEnabled ? 'ON' : 'OFF'}`,
    `- SMS: ${notifications.smsEnabled ? 'ON' : 'OFF'}`,
    `- Email: ${notifications.emailEnabled ? 'ON' : 'OFF'}`,
    '',
    'ACTIVE ALERTS:',
    `- Cash Mismatch: ${notifications.cashMismatch ? 'ON' : 'OFF'}`,
    `- Low Stock: ${notifications.lowStock ? 'ON' : 'OFF'}`,
    `- Daily Close Reminder: ${notifications.dailyCloseReminder ? 'ON' : 'OFF'}`,
    `- Weekly Insight: ${notifications.weeklyInsight ? 'ON' : 'OFF'}`,
    `- Score Drop: ${notifications.scoreDrop ? 'ON' : 'OFF'}`,
    `- Loan Milestone: ${notifications.loanMilestone ? 'ON' : 'OFF'}`,
    `- Passport Access: ${notifications.passportAccess ? 'ON' : 'OFF'}`,
    `- Stock Discrepancy: ${notifications.stockDiscrepancy ? 'ON' : 'OFF'}`,
    '',
    `ACTIVE SESSIONS: ${sessions.length}`,
    ...sessions.map(s => `- ${formatSessionDevice(s)} (${getSessionDuration(s.lastActiveAt)})`),
  ];

  return lines.join('\n');
};

export default settingsService;
