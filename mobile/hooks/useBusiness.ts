import { useCallback, useEffect } from 'react';
import { useBusinessStore } from '@/store/business.store';
import { useAuthStore } from '@/store/auth.store';
import { businessService } from '@/services/business.service';
import { useUIStore } from '@/store/ui.store';

export function useBusiness() {
  const business = useBusinessStore();
  const auth = useAuthStore();
  const ui = useUIStore();

  const loadBusiness = useCallback(async () => {
    if (!auth.user?.businessId) return;
    
    ui.setLoading(true);
    try {
      const response = await businessService.getById(auth.user.businessId);
      if (response.success) {
        business.setBusiness(response.data.business as any);
      }
    } catch (error) {
      ui.showToast('Failed to load business data', 'error');
    } finally {
      ui.setLoading(false);
    }
  }, [auth.user?.businessId, business, ui]);

  const loadTeam = useCallback(async () => {
    if (!auth.user?.businessId) return;
    
    try {
      const response = await businessService.getTeam(auth.user.businessId);
      if (response.success) {
        business.setTeam(response.data.team as any);
      }
    } catch (error) {
      console.error('Failed to load team:', error);
    }
  }, [auth.user?.businessId, business]);

  const inviteCashier = useCallback(async (phone: string, name: string) => {
    if (!auth.user?.businessId) return false;
    
    ui.setLoading(true, 'Sending invitation...');
    try {
      const response = await businessService.inviteCashier(auth.user.businessId, phone, name);
      if (response.success) {
        ui.showToast('Invitation sent successfully', 'success');
        await loadTeam();
        return true;
      }
      return false;
    } catch (error: any) {
      ui.showToast(error?.message || 'Failed to send invitation', 'error');
      return false;
    } finally {
      ui.setLoading(false);
    }
  }, [auth.user?.businessId, loadTeam, ui]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.businessId) {
      loadBusiness();
      loadTeam();
    }
  }, [auth.isAuthenticated, auth.user?.businessId]);

  return {
    ...business,
    loadBusiness,
    loadTeam,
    inviteCashier,
    refresh: () => {
      loadBusiness();
      loadTeam();
    },
  };
}
