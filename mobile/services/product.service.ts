import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { Product } from '@/types/models';

export interface CreateProductRequest {
  name: string;
  category?: string;
  description?: string;
  unit?: string;
  sellingPrice: number;
  costPrice: number;
  stockQty?: number;
  reorderLevel?: number;
  barcode?: string;
}

export const productService = {
  // Get all products for a business
  getAll: async (businessId: string, params?: { category?: string; lowStock?: boolean; isActive?: boolean }): Promise<{ products: Product[] }> => {
    return api.get(`/businesses/${businessId}/products`, { params });
  },

  // Search products
  search: async (businessId: string, query: string): Promise<{ products: Product[] }> => {
    return api.get(`/businesses/${businessId}/products/search`, { params: { q: query } });
  },

  // Get low stock products
  getLowStock: async (businessId: string): Promise<{ products: Product[] }> => {
    return api.get(`/businesses/${businessId}/products/low-stock`);
  },

  // Get single product
  getById: async (businessId: string, productId: string): Promise<{ product: Product }> => {
    return api.get(`/businesses/${businessId}/products/${productId}`);
  },

  // Create product (owner only)
  create: async (businessId: string, data: CreateProductRequest): Promise<{ product: Product }> => {
    return api.post(`/businesses/${businessId}/products`, data);
  },

  // Update product (owner only)
  update: async (businessId: string, productId: string, data: Partial<CreateProductRequest> & { isActive?: boolean }): Promise<{ product: Product }> => {
    return api.put(`/businesses/${businessId}/products/${productId}`, data);
  },

  // Delete product (owner only)
  delete: async (businessId: string, productId: string): Promise<{ message: string }> => {
    return api.delete(`/businesses/${businessId}/products/${productId}`);
  },

  // Receive stock
  receiveStock: async (businessId: string, productId: string, quantity: number, unitCost?: number): Promise<{ product: Product }> => {
    return api.post(`/businesses/${businessId}/products/${productId}/receive`, { quantity, unitCost });
  },

  // Adjust stock
  adjustStock: async (businessId: string, productId: string, quantity: number, reason: string, notes?: string): Promise<{ product: Product }> => {
    return api.post(`/businesses/${businessId}/products/${productId}/adjust`, { quantity, reason, notes });
  },

  // Get stock history
  getStockHistory: async (businessId: string, productId: string): Promise<{ history: any[] }> => {
    return api.get(`/businesses/${businessId}/products/${productId}/history`);
  },
};
