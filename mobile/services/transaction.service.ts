import api from './api';
import type { 
  CreateTransactionRequest, 
  CreateTransactionResponse,
  GetTransactionsResponse,
  ReconcileRequest,
  ReconcileResponse,
  ApiResponse 
} from '@/types/api.types';

export const transactionService = {
  // Create a new transaction (sale)
  create: async (data: CreateTransactionRequest): Promise<ApiResponse<CreateTransactionResponse>> => {
    return api.post('/transactions', data);
  },

  // Get transactions list
  getList: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    cashierId?: string;
    paymentMethod?: string;
  }): Promise<ApiResponse<GetTransactionsResponse>> => {
    return api.get('/transactions', { params });
  },

  // Get single transaction
  getById: async (id: string): Promise<ApiResponse<{ transaction: any }>> => {
    return api.get(`/transactions/${id}`);
  },

  // Void a transaction
  void: async (id: string, reason: string): Promise<ApiResponse<{ transaction: any }>> => {
    return api.post(`/transactions/${id}/void`, { reason });
  },

  // Reconcile day
  reconcile: async (data: ReconcileRequest): Promise<ApiResponse<ReconcileResponse>> => {
    return api.post('/reconcile', data);
  },

  // Send receipt
  sendReceipt: async (token: string, phone: string, method: 'whatsapp' | 'sms'): Promise<ApiResponse<{ message: string }>> => {
    return api.post(`/receipts/${token}/send`, { phone, method });
  },
};
