import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/services/api.service';

interface User {
  id: string;
  phone: string;
  name?: string;
  role: 'owner' | 'cashier';
  businessId?: string;
  preferredLanguage: string;
  isNewUser?: boolean;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthState {
  // State
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasBusiness: boolean;
  error: string | null;
  
  // Actions
  checkAuth: () => Promise<void>;
  sendOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, code: string) => Promise<{ success: boolean; isNewUser?: boolean }>;
  setTokens: (tokens: Tokens) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      hasBusiness: false,
      error: null,

      // Check auth status on app start
      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const { tokens } = get();
          
          if (!tokens) {
            set({ isAuthenticated: false, isLoading: false });
            return;
          }

          // Validate token by making an API call
          const response = await authApi.refreshToken(tokens.refreshToken);
          
          if (response.success) {
            set({
              tokens: response.data.tokens,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Token refresh failed, clear auth
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // Send OTP
      sendOtp: async (phone: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.sendOtp(phone);
          
          if (response.success) {
            set({ isLoading: false });
            return true;
          } else {
            set({ error: response.data?.message || 'Failed to send OTP', isLoading: false });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to send OTP', isLoading: false });
          return false;
        }
      },

      // Verify OTP
      verifyOtp: async (phone: string, code: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.verifyOtp(phone, code);
          
          if (response.success) {
            const { tokens, user, isNewUser } = response.data;
            
            set({
              tokens,
              user,
              isAuthenticated: true,
              hasBusiness: !!user.businessId,
              isLoading: false,
              error: null,
            });
            
            return { success: true, isNewUser };
          } else {
            set({ error: response.error?.message || 'Verification failed', isLoading: false });
            return { success: false };
          }
        } catch (error: any) {
          set({ error: error.message || 'Verification failed', isLoading: false });
          return { success: false };
        }
      },

      // Set tokens manually
      setTokens: (tokens: Tokens) => {
        set({ tokens });
      },

      // Set user manually
      setUser: (user: User) => {
        set({ user, hasBusiness: !!user.businessId });
      },

      // Logout
      logout: async () => {
        const { tokens } = get();
        
        if (tokens?.refreshToken) {
          try {
            await authApi.logout(tokens.refreshToken);
          } catch {
            // Ignore errors on logout
          }
        }
        
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          hasBusiness: false,
          error: null,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'nest-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        hasBusiness: state.hasBusiness,
      }),
    }
  )
);
