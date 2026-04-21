import api from './api';

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitSellingPrice: number;
  unitCostPrice: number;
}

export interface CreateTransactionRequest {
  items: TransactionItem[];
  paymentMethod: 'cash' | 'mpesa' | 'card' | 'bank';
  customerPhone?: string;
  mpesaReceiptNumber?: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  cashier_id: string;
  customer_phone: string | null;
  total_amount: number;
  total_cogs: number;
  gross_profit: number;
  payment_method: string;
  mpesa_receipt_number: string | null;
  status: 'draft' | 'locked' | 'voided';
  receipt_token: string | null;
  receipt_url: string | null;
  hash: string | null;
  recorded_at: string;
  locked_at: string | null;
  created_at: string;
}

export interface ReceiptData {
  token: string;
  businessName: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  cashierName: string;
  createdAt: string;
}

export const transactionService = {
  // Create a new transaction (draft)
  create: async (businessId: string, data: CreateTransactionRequest): Promise<{ transaction: Transaction }> => {
    return api.post(`/businesses/${businessId}/transactions`, data);
  },

  // Lock transaction and generate receipt
  lockTransaction: async (businessId: string, transactionId: string): Promise<{ transaction: Transaction; receipt: ReceiptData }> => {
    return api.post(`/businesses/${businessId}/transactions/${transactionId}/lock`);
  },

  // Get transactions list
  getList: async (businessId: string, params?: {
    startDate?: string;
    endDate?: string;
    cashierId?: string;
    status?: 'draft' | 'locked' | 'voided';
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; total: number }> => {
    return api.get(`/businesses/${businessId}/transactions`, { params });
  },

  // Get single transaction
  getById: async (businessId: string, transactionId: string): Promise<{ transaction: Transaction; items: any[] }> => {
    return api.get(`/businesses/${businessId}/transactions/${transactionId}`);
  },

  // Void a transaction (owner only)
  void: async (businessId: string, transactionId: string, reason: string): Promise<{ transaction: Transaction }> => {
    return api.post(`/businesses/${businessId}/transactions/${transactionId}/void`, { reason });
  },
};
