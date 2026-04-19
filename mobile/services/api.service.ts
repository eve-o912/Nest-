import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { tokens } = useAuthStore.getState();
    
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const { tokens, setTokens, logout } = useAuthStore.getState();
      
      if (tokens?.refreshToken) {
        try {
          const response = await authApi.refreshToken(tokens.refreshToken);
          
          if (response.success) {
            setTokens(response.data.tokens);
            originalRequest.headers.Authorization = `Bearer ${response.data.tokens.accessToken}`;
            return apiClient(originalRequest);
          } else {
            await logout();
          }
        } catch {
          await logout();
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API response types
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    request_id: string;
  };
}

// Auth API
export const authApi = {
  sendOtp: async (phone: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post('/auth/otp/send', { phone });
    return response.data;
  },

  verifyOtp: async (phone: string, code: string): Promise<ApiResponse<{
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    user: any;
    isNewUser: boolean;
  }>> => {
    const response = await apiClient.post('/auth/otp/verify', { phone, code });
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  }>> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post('/auth/logout', { refreshToken });
    return response.data;
  },
};

// Business API
export const businessApi = {
  createBusiness: async (data: {
    name: string;
    businessType: string;
    currency?: string;
    autoSaveRate?: number;
    savingsGoal?: number;
    timezone?: string;
  }): Promise<ApiResponse<{ business: any }>> => {
    const response = await apiClient.post('/businesses', data);
    return response.data;
  },

  getBusiness: async (id: string): Promise<ApiResponse<{ business: any }>> => {
    const response = await apiClient.get(`/businesses/${id}`);
    return response.data;
  },

  updateBusiness: async (id: string, data: any): Promise<ApiResponse<{ business: any }>> => {
    const response = await apiClient.put(`/businesses/${id}`, data);
    return response.data;
  },

  getTeam: async (id: string): Promise<ApiResponse<{ team: any[] }>> => {
    const response = await apiClient.get(`/businesses/${id}/team`);
    return response.data;
  },

  inviteCashier: async (id: string, data: { phone: string; name: string }): Promise<ApiResponse<{ invitation: any }>> => {
    const response = await apiClient.post(`/businesses/${id}/invite`, data);
    return response.data;
  },
};

export default apiClient;
