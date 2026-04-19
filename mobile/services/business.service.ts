import api from './api';
import type { 
  CreateBusinessRequest,
  CreateBusinessResponse,
  GetBusinessResponse,
  GetTeamResponse,
  ApiResponse 
} from '@/types/api.types';

export const businessService = {
  // Create new business
  create: async (data: CreateBusinessRequest): Promise<ApiResponse<CreateBusinessResponse>> => {
    return api.post('/businesses', data);
  },

  // Get business by ID
  getById: async (id: string): Promise<ApiResponse<GetBusinessResponse>> => {
    return api.get(`/businesses/${id}`);
  },

  // Update business
  update: async (id: string, data: Partial<CreateBusinessRequest>): Promise<ApiResponse<GetBusinessResponse>> => {
    return api.put(`/businesses/${id}`, data);
  },

  // Get team members
  getTeam: async (id: string): Promise<ApiResponse<GetTeamResponse>> => {
    return api.get(`/businesses/${id}/team`);
  },

  // Invite cashier
  inviteCashier: async (id: string, phone: string, name: string): Promise<ApiResponse<{ invitation: any }>> => {
    return api.post(`/businesses/${id}/invite`, { phone, name });
  },

  // Update team member
  updateTeamMember: async (businessId: string, userId: string, updates: { role?: string; isActive?: boolean }): Promise<ApiResponse<{ member: any }>> => {
    return api.put(`/businesses/${businessId}/users/${userId}`, updates);
  },

  // Get cashier history
  getCashierHistory: async (businessId: string, userId: string): Promise<ApiResponse<{ shifts: any[]; recentTransactions: any[] }>> => {
    return api.get(`/businesses/${businessId}/team/${userId}/history`);
  },
};
