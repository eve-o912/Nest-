import { useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { useUIStore } from '@/store/ui.store';

export function useAuth() {
  const auth = useAuthStore();
  const ui = useUIStore();

  const login = useCallback(async (phone: string, code: string) => {
    ui.setLoading(true, 'Verifying...');
    try {
      const result = await auth.verifyOtp(phone, code);
      if (result.success) {
        ui.showToast('Welcome to Nest!', 'success');
      }
      return result;
    } finally {
      ui.setLoading(false);
    }
  }, [auth, ui]);

  const sendOtp = useCallback(async (phone: string) => {
    ui.setLoading(true, 'Sending code...');
    try {
      return await auth.sendOtp(phone);
    } finally {
      ui.setLoading(false);
    }
  }, [auth, ui]);

  const logout = useCallback(async () => {
    await auth.logout();
    ui.showToast('Logged out successfully', 'info');
  }, [auth, ui]);

  return {
    ...auth,
    login,
    sendOtp,
    logout,
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
  };
}
