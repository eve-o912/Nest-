import { useCallback, useEffect, useState } from 'react';
import { pnlService } from '@/services/pnl.service';
import { transactionService } from '@/services/transaction.service';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import type { DailyPnl, Transaction, Alert } from '@/types/models';

export function useDashboard() {
  const auth = useAuthStore();
  const ui = useUIStore();
  
  const [todayPnl, setTodayPnl] = useState<DailyPnl | null>(null);
  const [recentSales, setRecentSales] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [weekTrend, setWeekTrend] = useState<Array<{ date: string; revenue: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadDashboard = useCallback(async () => {
    if (!auth.user?.businessId) return;
    
    setIsLoading(true);
    try {
      // Load today's P&L
      const pnlResponse = await pnlService.getDaily(today);
      if (pnlResponse.success) {
        setTodayPnl(pnlResponse.data.pnl as DailyPnl);
      }

      // Load recent transactions
      const txResponse = await transactionService.getList({ dateFrom: today, dateTo: today });
      if (txResponse.success) {
        setRecentSales(txResponse.data.transactions as Transaction[]);
      }

      // Load 7-day trend
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const trendResponse = await pnlService.getTrend({
        from: lastWeek.toISOString().split('T')[0],
        to: today,
        granularity: 'day',
      });
      if (trendResponse.success) {
        setWeekTrend(trendResponse.data.trend);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [auth.user?.businessId, today]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadDashboard();
    }
  }, [auth.isAuthenticated, loadDashboard]);

  return {
    todayPnl,
    recentSales,
    alerts,
    weekTrend,
    isLoading,
    refresh: loadDashboard,
  };
}
