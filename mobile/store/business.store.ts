import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Business, TeamMember, DailyPnl, FinancialPassport } from '@/types/models';

interface BusinessState {
  // Current business
  business: Business | null;
  team: TeamMember[];
  todayPnl: DailyPnl | null;
  passport: FinancialPassport | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setBusiness: (business: Business) => void;
  setTeam: (team: TeamMember[]) => void;
  setTodayPnl: (pnl: DailyPnl) => void;
  setPassport: (passport: FinancialPassport) => void;
  updateBusiness: (updates: Partial<Business>) => void;
  clearError: () => void;
  reset: () => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      // Initial state
      business: null,
      team: [],
      todayPnl: null,
      passport: null,
      isLoading: false,
      error: null,

      // Set business
      setBusiness: (business) => {
        set({ business });
      },

      // Set team
      setTeam: (team) => {
        set({ team });
      },

      // Set today's P&L
      setTodayPnl: (pnl) => {
        set({ todayPnl: pnl });
      },

      // Set passport
      setPassport: (passport) => {
        set({ passport });
      },

      // Update business partial
      updateBusiness: (updates) => {
        const { business } = get();
        if (business) {
          set({ business: { ...business, ...updates } });
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset store
      reset: () => {
        set({
          business: null,
          team: [],
          todayPnl: null,
          passport: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'nest-business-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        business: state.business,
      }),
    }
  )
);
