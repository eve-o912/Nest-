import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { Expense } from '@/types/models';

export interface CreateExpenseRequest {
  category: string;
  amount: number;
  description?: string;
  expenseDate?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
}

export const expenseService = {
  // Get expenses list
  getList: async (params?: { 
    from?: string; 
    to?: string; 
    category?: string;
  }): Promise<ApiResponse<{ expenses: Expense[] }>> => {
    return api.get('/expenses', { params });
  },

  // Create expense
  create: async (data: CreateExpenseRequest): Promise<ApiResponse<{ expense: Expense }>> => {
    return api.post('/expenses', data);
  },

  // Create recurring expense
  createRecurring: async (data: CreateExpenseRequest & { recurringFrequency: 'daily' | 'weekly' | 'monthly' }): Promise<ApiResponse<{ expense: Expense }>> => {
    return api.post('/expenses/recurring', data);
  },

  // Get expense categories (aggregated)
  getCategories: async (params?: { from?: string; to?: string }): Promise<ApiResponse<{ categories: Array<{ name: string; total: number; count: number }> }>> => {
    return api.get('/expenses/categories', { params });
  },
};
