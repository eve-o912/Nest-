import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { Product } from '@/types/models';

export interface CreateProductRequest {
  name: string;
  category?: string;
  description?: string;
  unit?: string;
  sellingPrice: number;
  costPrice?: number;
  stockQty?: number;
  reorderLevel?: number;
  barcode?: string;
}

export const productService = {
  // Get all products
  getAll: async (params?: { category?: string; search?: string }): Promise<ApiResponse<{ products: Product[] }>> => {
    return api.get('/products', { params });
  },

  // Get single product
  getById: async (id: string): Promise<ApiResponse<{ product: Product }>> => {
    return api.get(`/products/${id}`);
  },

  // Create product
  create: async (data: CreateProductRequest): Promise<ApiResponse<{ product: Product }>> => {
    return api.post('/products', data);
  },

  // Update product
  update: async (id: string, data: Partial<CreateProductRequest>): Promise<ApiResponse<{ product: Product }>> => {
    return api.put(`/products/${id}`, data);
  },

  // Stock operations
  receiveStock: async (productId: string, quantity: number, unitCost?: number, supplierName?: string): Promise<ApiResponse<any>> => {
    return api.post('/stock/receive', { productId, quantity, unitCost, supplierName });
  },

  adjustStock: async (productId: string, quantity: number, reason: string, notes?: string): Promise<ApiResponse<any>> => {
    return api.post('/stock/adjust', { productId, quantity, reason, notes });
  },

  countStock: async (counts: Array<{ productId: string; countedQty: number; notes?: string }>): Promise<ApiResponse<any>> => {
    return api.post('/stock/count', { counts });
  },
};
