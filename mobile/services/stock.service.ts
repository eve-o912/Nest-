import api from './api';
import type { ApiResponse } from '@/types/api.types';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'sale' | 'receive' | 'adjustment' | 'count';
  quantity: number;
  previousQty: number;
  newQty: number;
  unitCost?: number;
  totalCost?: number;
  reference?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface StockCountItem {
  productId: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
  unitCost: number;
  gapValue: number;
}

export interface StockDiscrepancy {
  id: string;
  productId: string;
  productName: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
  unitCost: number;
  gapValue: number;
  likelyCashierId?: string;
  likelyCashierName?: string;
  status: 'open' | 'investigating' | 'resolved';
  notes?: string;
  countDate: string;
  createdAt: string;
}

export interface PhysicalCountRequest {
  counts: Array<{
    productId: string;
    actualQty: number;
    notes?: string;
  }>;
  countDate?: string;
}

export interface ReceiveStockRequest {
  supplierId?: string;
  invoiceNumber?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
  notes?: string;
}

export const stockService = {
  // Get stock movements for business
  getMovements: async (businessId: string, params?: { 
    productId?: string; 
    type?: string; 
    from?: string; 
    to?: string;
    limit?: number;
  }): Promise<{ movements: StockMovement[] }> => {
    return api.get(`/businesses/${businessId}/stock/movements`, { params });
  },

  // Submit physical count
  submitCount: async (businessId: string, data: PhysicalCountRequest): Promise<{ 
    discrepancies: StockDiscrepancy[];
    summary: {
      totalProducts: number;
      withVariance: number;
      totalGapValue: number;
    }
  }> => {
    return api.post(`/businesses/${businessId}/stock/count`, data);
  },

  // Get stock discrepancies
  getDiscrepancies: async (businessId: string, params?: { 
    status?: string; 
    from?: string; 
    to?: string;
  }): Promise<{ discrepancies: StockDiscrepancy[] }> => {
    return api.get(`/businesses/${businessId}/stock/discrepancies`, { params });
  },

  // Update discrepancy status
  updateDiscrepancy: async (
    businessId: string, 
    discrepancyId: string, 
    data: { status: string; notes?: string }
  ): Promise<{ discrepancy: StockDiscrepancy }> => {
    return api.put(`/businesses/${businessId}/stock/discrepancies/${discrepancyId}`, data);
  },

  // Receive stock from supplier
  receiveStock: async (businessId: string, data: ReceiveStockRequest): Promise<{
    received: Array<{
      productId: string;
      productName: string;
      quantity: number;
      totalCost: number;
    }>;
    totalValue: number;
  }> => {
    return api.post(`/businesses/${businessId}/stock/receive`, data);
  },

  // Get shrinkage report
  getShrinkage: async (businessId: string, params?: { from?: string; to?: string }): Promise<{
    shrinkageRate: number;
    totalGapValue: number;
    totalRevenue: number;
    byProduct: Array<{
      productId: string;
      productName: string;
      gapValue: number;
      gapPercent: number;
    }>;
    byCashier: Array<{
      cashierId: string;
      cashierName: string;
      gapValue: number;
      occurrenceCount: number;
    }>;
  }> => {
    return api.get(`/businesses/${businessId}/stock/shrinkage`, { params });
  },
};
