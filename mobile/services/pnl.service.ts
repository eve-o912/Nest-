import api from './api';
import type { 
  GetDailyPnlResponse,
  GetPnlSummaryResponse,
  ApiResponse 
} from '@/types/api.types';
import type { DailyPnl } from '@/types/models';

export const pnlService = {
  // Get daily P&L
  getDaily: async (date: string): Promise<ApiResponse<GetDailyPnlResponse>> => {
    return api.get(`/pnl/daily`, { params: { date } });
  },

  // Get P&L summary
  getSummary: async (params: { 
    from: string; 
    to: string;
  }): Promise<ApiResponse<GetPnlSummaryResponse>> => {
    return api.get('/pnl/summary', { params });
  },

  // Get P&L trend (for charts)
  getTrend: async (params: {
    from: string;
    to: string;
    granularity?: 'day' | 'week' | 'month';
  }): Promise<ApiResponse<{ trend: Array<{ date: string; revenue: number; profit: number; expenses: number }> }>> => {
    return api.get('/pnl/trend', { params });
  },
};
