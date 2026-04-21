import api from './api';
import type { Expense } from '@/types/models';

export interface CreateExpenseRequest {
  category: string;
  amount: number;
  description?: string;
  expenseDate: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
}

export const expenseService = {
  // Get expenses list
  getList: async (businessId: string, params?: { 
    startDate?: string; 
    endDate?: string; 
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ expenses: Expense[]; total: number }> => {
    return api.get(`/businesses/${businessId}/expenses`, { params });
  },

  // Create expense
  create: async (businessId: string, data: CreateExpenseRequest): Promise<{ expense: Expense }> => {
    return api.post(`/businesses/${businessId}/expenses`, data);
  },

  // Get expense categories
  getCategories: async (businessId: string): Promise<{ categories: string[] }> => {
    return api.get(`/businesses/${businessId}/expenses/categories`);
  },

  // Get expense summary
  getSummary: async (businessId: string, startDate: string, endDate: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    count: number;
  }> => {
    return api.get(`/businesses/${businessId}/expenses/summary`, { params: { startDate, endDate } });
  },

  // Update expense
  update: async (businessId: string, expenseId: string, data: Partial<CreateExpenseRequest>): Promise<{ expense: Expense }> => {
    return api.put(`/businesses/${businessId}/expenses/${expenseId}`, data);
  },

  // Delete expense
  delete: async (businessId: string, expenseId: string): Promise<{ message: string }> => {
    return api.delete(`/businesses/${businessId}/expenses/${expenseId}`);
  },

  // Upload receipt photo
  uploadReceipt: async (businessId: string, expenseId: string, photoUri: string): Promise<{ receiptUrl: string }> => {
    const formData = new FormData();
    formData.append('receipt', {
      uri: photoUri,
      type: 'image/jpeg',
      name: `receipt_${expenseId}.jpg`,
    } as any);
    
    return api.post(`/businesses/${businessId}/expenses/${expenseId}/receipt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // ===== RECURRING EXPENSES =====
  
  // Get recurring expenses
  getRecurring: async (businessId: string): Promise<{ 
    recurring: Array<{
      id: string;
      category: string;
      amount: number;
      description?: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfMonth?: number;
      dayOfWeek?: number;
      isActive: boolean;
      nextRunDate: string;
      createdAt: string;
    }> 
  }> => {
    return api.get(`/businesses/${businessId}/expenses/recurring`);
  },

  // Create recurring expense
  createRecurring: async (businessId: string, data: {
    category: string;
    amount: number;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfMonth?: number;
    dayOfWeek?: number;
  }): Promise<{ recurring: any }> => {
    return api.post(`/businesses/${businessId}/expenses/recurring`, data);
  },

  // Update recurring expense
  updateRecurring: async (businessId: string, recurringId: string, data: Partial<{
    category: string;
    amount: number;
    description: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfMonth: number;
    dayOfWeek: number;
    isActive: boolean;
  }>): Promise<{ recurring: any }> => {
    return api.put(`/businesses/${businessId}/expenses/recurring/${recurringId}`, data);
  },

  // Delete recurring expense
  deleteRecurring: async (businessId: string, recurringId: string): Promise<{ message: string }> => {
    return api.delete(`/businesses/${businessId}/expenses/recurring/${recurringId}`);
  },

  // ===== ANOMALY DETECTION =====

  // Get expense anomalies
  getAnomalies: async (businessId: string, params?: { from?: string; to?: string }): Promise<{
    anomalies: Array<{
      id: string;
      expenseId: string;
      category: string;
      amount: number;
      expectedRange: { min: number; max: number };
      severity: 'low' | 'medium' | 'high';
      detectedAt: string;
      isAcknowledged: boolean;
    }>;
    baseline: {
      avgDaily: number;
      avgByCategory: Record<string, number>;
      periodDays: number;
    };
  }> => {
    return api.get(`/businesses/${businessId}/expenses/anomalies`, { params });
  },

  // Acknowledge anomaly
  acknowledgeAnomaly: async (businessId: string, anomalyId: string): Promise<{ message: string }> => {
    return api.post(`/businesses/${businessId}/expenses/anomalies/${anomalyId}/acknowledge`);
  },
};
