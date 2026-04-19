import api from './api';
import type { 
  GetSavingsResponse,
  UpdateSavingsRateRequest,
  ApiResponse 
} from '@/types/api.types';
import type { SavingsEntry } from '@/types/models';

export const savingsService = {
  // Get savings wallet and recent entries
  getWallet: async (): Promise<ApiResponse<GetSavingsResponse>> => {
    return api.get('/savings');
  },

  // Update auto-save rate
  updateRate: async (autoSaveRate: number): Promise<ApiResponse<{ wallet: any }>> => {
    return api.put('/savings/rate', { autoSaveRate });
  },

  // Request withdrawal
  withdraw: async (amount: number, reason?: string): Promise<ApiResponse<{ entry: SavingsEntry }>> => {
    return api.post('/savings/withdraw', { amount, reason });
  },

  // Get savings history
  getHistory: async (params?: { from?: string; to?: string }): Promise<ApiResponse<{ entries: SavingsEntry[] }>> => {
    return api.get('/savings/history', { params });
  },
};
