import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

// Response interceptor for token refresh and error handling
apiClient.interceptors.response.use(
  (response) => response.data.data, // Unwrap { success, data } envelope
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const { tokens, setTokens, logout } = useAuthStore.getState();
      
      if (tokens?.refreshToken) {
        try {
          // Try to refresh token
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });
          
          if (response.data.success) {
            const { tokens: newTokens } = response.data.data;
            setTokens(newTokens);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return apiClient(originalRequest);
          } else {
            // Refresh failed - logout
            await logout();
            useUIStore.getState().showToast('Session expired. Please login again.', 'error');
          }
        } catch (refreshError) {
          await logout();
          useUIStore.getState().showToast('Session expired. Please login again.', 'error');
        }
      }
    }
    
    // Handle other errors
    const errorMessage = (error.response?.data as any)?.error?.message || error.message || 'An error occurred';
    useUIStore.getState().showToast(errorMessage, 'error');
    
    return Promise.reject(error);
  }
);

// API wrapper with consistent error handling
export const api = {
  get: async <T>(url: string, params?: any): Promise<T> => {
    return apiClient.get(url, { params });
  },
  
  post: async <T>(url: string, data?: any): Promise<T> => {
    return apiClient.post(url, data);
  },
  
  put: async <T>(url: string, data?: any): Promise<T> => {
    return apiClient.put(url, data);
  },
  
  delete: async <T>(url: string): Promise<T> => {
    return apiClient.delete(url);
  },
};

export default apiClient;
