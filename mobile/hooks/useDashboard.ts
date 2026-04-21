import { useCallback, useEffect, useState } from 'react';
import { pnlService } from '@/services/pnl.service';
import { transactionService } from '@/services/transaction.service';
import { expenseService } from '@/services/expense.service';
import { savingsService } from '@/services/savings.service';
import { useAuthStore } from '@/store/auth.store';
import { useBusinessStore } from '@/store/business.store';
import type { DailyPnl, Transaction, Alert, Expense, SavingsWallet, FinancialPassport } from '@/types/models';

interface ExpenseSummary {
  total: number;
  byCategory: Record<string, number>;
  count: number;
}

interface DashboardData {
  todayPnl: DailyPnl | null;
  recentSales: Transaction[];
  alerts: Alert[];
  weekTrend: Array<{ date: string; revenue: number; profit: number; expenses: number }>;
  expenses: ExpenseSummary | null;
  savings: SavingsWallet | null;
  passport: FinancialPassport | null;
  unreadNotifications: number;
  isLoading: boolean;
  refresh: () => void;
}

export function useDashboard(): DashboardData {
  const auth = useAuthStore();
  const businessStore = useBusinessStore();
  
  const [todayPnl, setTodayPnl] = useState<DailyPnl | null>(null);
  const [recentSales, setRecentSales] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [weekTrend, setWeekTrend] = useState<Array<{ date: string; revenue: number; profit: number; expenses: number }>>([]);
  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null);
  const [savings, setSavings] = useState<SavingsWallet | null>(null);
  const [passport, setPassport] = useState<FinancialPassport | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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
      const txResponse = await transactionService.getList(auth.user.businessId, { 
        startDate: today, 
        endDate: today, 
        limit: 10 
      });
      if (txResponse.transactions) {
        setRecentSales(txResponse.transactions as unknown as Transaction[]);
      }

      // Load 7-day trend
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 6);
      const trendResponse = await pnlService.getTrend({
        from: lastWeek.toISOString().split('T')[0],
        to: today,
        granularity: 'day',
      });
      if (trendResponse.success) {
        setWeekTrend(trendResponse.data.trend);
      }

      // Load today's expenses
      const expenseResponse = await expenseService.getSummary(auth.user.businessId, today, today);
      if (expenseResponse) {
        setExpenses(expenseResponse);
      }

      // Load savings wallet
      const savingsResponse = await savingsService.getWallet();
      if (savingsResponse.success && savingsResponse.data.wallet) {
        setSavings(savingsResponse.data.wallet as unknown as SavingsWallet);
      }

      // Load passport from store or fetch
      if (businessStore.passport) {
        setPassport(businessStore.passport);
      }

      // Generate alerts based on data
      const generatedAlerts: Alert[] = [];
      
      // Check for yesterday's cash mismatch
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayPnl = await pnlService.getDaily(yesterdayStr);
      if (yesterdayPnl.success && yesterdayPnl.data.pnl) {
        const pnl = yesterdayPnl.data.pnl as DailyPnl;
        if (pnl.cashVariance !== 0) {
          generatedAlerts.push({
            id: 'mismatch-yesterday',
            businessId: auth.user.businessId,
            type: 'mismatch',
            severity: 'urgent',
            title: 'Cash Discrepancy Detected',
            body: `Yesterday's till was off by ${Math.abs(pnl.cashVariance / 100).toFixed(2)} KES`,
            data: { variance: pnl.cashVariance, isReconciled: pnl.isReconciled },
            isRead: false,
            createdAt: yesterdayStr,
          });
        }
      }

      // Check for low stock (mock for now)
      // Check for close reminder after 6 PM
      const hour = new Date().getHours();
      if (hour >= 18) {
        generatedAlerts.push({
          id: 'close-reminder',
          businessId: auth.user.businessId,
          type: 'close_reminder',
          severity: 'info',
          title: 'Time to Close Day',
          body: "Don't forget to reconcile your till before closing",
          isRead: false,
          createdAt: today,
        });
      }

      setAlerts(generatedAlerts);
      setUnreadNotifications(generatedAlerts.filter(a => !a.isRead).length);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [auth.user?.businessId, today, businessStore.passport]);

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
    expenses,
    savings,
    passport,
    unreadNotifications,
    isLoading,
    refresh: loadDashboard,
  };
}
