import api from './api';
import type { 
  SendOtpResponse, 
  VerifyOtpResponse, 
  RefreshTokenResponse,
  ApiResponse 
} from '@/types/api.types';

export const authService = {
  // Send OTP to phone
  sendOtp: async (phone: string): Promise<ApiResponse<SendOtpResponse>> => {
    return api.post('/auth/otp/send', { phone });
  },

  // Verify OTP and get tokens
  verifyOtp: async (phone: string, code: string): Promise<ApiResponse<VerifyOtpResponse>> => {
    return api.post('/auth/otp/verify', { phone, code });
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<ApiResponse<RefreshTokenResponse>> => {
    return api.post('/auth/refresh', { refreshToken });
  },

  // Logout
  logout: async (refreshToken: string): Promise<ApiResponse<{ message: string }>> => {
    return api.post('/auth/logout', { refreshToken });
  },
};
