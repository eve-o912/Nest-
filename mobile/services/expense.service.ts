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
};
