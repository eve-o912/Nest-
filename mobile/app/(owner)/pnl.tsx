import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { pnlService } from '@/services/pnl.service';
import { colors, typography, spacing, formatMoney, formatDate } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { DailyPnl } from '@/types/models';

type DateRange = '7d' | '30d' | 'custom';

interface PnlSummary {
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  avgDailyRevenue: number;
  bestDay: { date: string; revenue: number } | null;
}

export default function PnlScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [dailyPnlList, setDailyPnlList] = useState<DailyPnl[]>([]);
  const [summary, setSummary] = useState<PnlSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const getDateRange = useCallback(() => {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date();
    
    switch (dateRange) {
      case '7d':
        from.setDate(from.getDate() - 6);
        break;
      case '30d':
        from.setDate(from.getDate() - 29);
        break;
      default:
        from.setDate(from.getDate() - 6);
    }
    
    return { from: from.toISOString().split('T')[0], to };
  }, [dateRange]);

  const loadPnl = useCallback(async () => {
    if (!user?.businessId) return;
    
    setIsLoading(true);
    try {
      const { from, to } = getDateRange();
      
      // Load summary
      const summaryResponse = await pnlService.getSummary({ from, to });
      if (summaryResponse.success) {
        const data = summaryResponse.data.summary;
        const days = summaryResponse.data.days || [];
        
        setDailyPnlList(days);
        
        // Calculate summary
        const totalRevenue = days.reduce((sum, d) => sum + (d.totalRevenue || 0), 0);
        const totalCogs = days.reduce((sum, d) => sum + (d.totalCogs || 0), 0);
        const totalExpenses = days.reduce((sum, d) => sum + (d.totalExpenses || 0), 0);
        const grossProfit = totalRevenue - totalCogs;
        const netProfit = grossProfit - totalExpenses;
        
        // Find best day
        const bestDay = days.length > 0 
          ? days.reduce((best, d) => (d.totalRevenue > best.revenue ? { date: d.date, revenue: d.totalRevenue } : best), 
              { date: days[0].date, revenue: days[0].totalRevenue })
          : null;
        
        setSummary({
          totalRevenue,
          totalCogs,
          grossProfit,
          totalExpenses,
          netProfit,
          avgDailyRevenue: days.length > 0 ? Math.round(totalRevenue / days.length) : 0,
          bestDay,
        });
      }
    } catch (error) {
      console.error('Failed to load P&L:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.businessId, getDateRange]);

  useEffect(() => {
    loadPnl();
  }, [loadPnl]);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    
    return date.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadPnl} tintColor={colors.accent} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Profit & Loss</Text>
          <Text style={styles.subtitle}>Track your business performance</Text>
        </View>
      </View>

      {/* Date Range Selector */}
      <View style={styles.rangeSelector}>
        <TouchableOpacity
          style={[styles.rangeButton, dateRange === '7d' && styles.rangeButtonActive]}
          onPress={() => setDateRange('7d')}
        >
          <Text style={[styles.rangeText, dateRange === '7d' && styles.rangeTextActive]}>
            7 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeButton, dateRange === '30d' && styles.rangeButtonActive]}
          onPress={() => setDateRange('30d')}
        >
          <Text style={[styles.rangeText, dateRange === '30d' && styles.rangeTextActive]}>
            30 Days
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Insight Card (if available) */}
      <Card style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <Text style={styles.insightIcon}>💡</Text>
          <Text style={styles.insightTitle}>Weekly AI Insight</Text>
        </View>
        <Text style={styles.insightText}>
          Your revenue has been consistent this week. Consider increasing inventory for top-selling items.
        </Text>
        <Text style={styles.insightDate}>Generated Monday, 7:00 AM</Text>
      </Card>

      {/* Summary Cards */}
      <Text style={styles.sectionTitle}>Period Summary</Text>
      <View style={styles.summaryGrid}>
        <Card style={[styles.summaryCard, styles.revenueCard]}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>{formatMoney(summary?.totalRevenue || 0)}</Text>
          <Text style={styles.summarySubtext}>
            Avg {formatMoneyShort(summary?.avgDailyRevenue || 0)}/day
          </Text>
        </Card>

        <Card style={[styles.summaryCard, styles.cogsCard]}>
          <Text style={styles.summaryLabel}>Cost of Goods</Text>
          <Text style={[styles.summaryValue, styles.negative]}>
            -{formatMoney(summary?.totalCogs || 0)}
          </Text>
        </Card>

        <Card style={[styles.summaryCard, styles.grossCard]}>
          <Text style={styles.summaryLabel}>Gross Profit</Text>
          <Text style={styles.summaryValue}>
            {formatMoney(summary?.grossProfit || 0)}
          </Text>
          <Text style={styles.summarySubtext}>
            {summary && summary.totalRevenue > 0
              ? `${Math.round((summary.grossProfit / summary.totalRevenue) * 100)}% margin`
              : '0% margin'}
          </Text>
        </Card>

        <Card style={[styles.summaryCard, styles.expensesCard]}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, styles.negative]}>
            -{formatMoney(summary?.totalExpenses || 0)}
          </Text>
        </Card>

        <Card style={[styles.summaryCard, styles.netCard, summary && summary.netProfit >= 0 ? styles.profitCard : styles.lossCard]}>
          <Text style={styles.summaryLabel}>Net Profit</Text>
          <Text style={[styles.summaryValue, styles.netValue]}>
            {formatMoney(summary?.netProfit || 0)}
          </Text>
          <Text style={styles.summarySubtext}>
            {summary && summary.totalRevenue > 0
              ? `${Math.round((summary.netProfit / summary.totalRevenue) * 100)}% net margin`
              : '0% net margin'}
          </Text>
        </Card>

        {summary?.bestDay && (
          <Card style={[styles.summaryCard, styles.bestDayCard]}>
            <Text style={styles.summaryLabel}>Best Day</Text>
            <Text style={styles.summaryValue}>
              {formatDateLabel(summary.bestDay.date)}
            </Text>
            <Text style={styles.summarySubtext}>
              {formatMoneyShort(summary.bestDay.revenue)}
            </Text>
          </Card>
        )}
      </View>

      {/* Daily Breakdown */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Breakdown</Text>
        <Text style={styles.sectionSubtitle}>{dailyPnlList.length} days</Text>
      </View>

      {dailyPnlList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No data for this period</Text>
        </Card>
      ) : (
        dailyPnlList.map((day) => (
          <TouchableOpacity
            key={day.date}
            onPress={() => setSelectedDay(selectedDay === day.date ? null : day.date)}
          >
            <Card style={styles.dayCard}>
              <View style={styles.dayRow}>
                <View style={styles.dayLeft}>
                  <Text style={styles.dayDate}>{formatDateLabel(day.date)}</Text>
                  <Text style={styles.dayFullDate}>
                    {new Date(day.date).toLocaleDateString('en-KE', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={styles.dayRight}>
                  <Text style={[styles.dayNet, day.netProfit >= 0 ? styles.profitText : styles.lossText]}>
                    {day.netProfit >= 0 ? '+' : ''}{formatMoneyShort(day.netProfit)}
                  </Text>
                  <View style={styles.dayStats}>
                    <Badge 
                      label={`${day.transactionCount} sales`} 
                      variant="default" 
                      size="sm" 
                    />
                    {day.isReconciled && (
                      <Badge 
                        label="Closed" 
                        variant="success" 
                        size="sm" 
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Expanded Details */}
              {selectedDay === day.date && (
                <View style={styles.dayExpanded}>
                  <View style={styles.divider} />
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Revenue</Text>
                    <Text style={styles.detailValue}>{formatMoney(day.totalRevenue)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cost of Goods</Text>
                    <Text style={[styles.detailValue, styles.negative]}>
                      -{formatMoney(day.totalCogs)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gross Profit</Text>
                    <Text style={styles.detailValue}>{formatMoney(day.grossProfit)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Expenses</Text>
                    <Text style={[styles.detailValue, styles.negative]}>
                      -{formatMoney(day.totalExpenses)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Auto-Saved</Text>
                    <Text style={[styles.detailValue, styles.positive]}>
                      +{formatMoney(day.autoSaved)}
                    </Text>
                  </View>

                  {day.cashVariance !== 0 && (
                    <View style={[styles.detailRow, styles.varianceRow]}>
                      <Text style={styles.detailLabel}>Cash Variance</Text>
                      <Text style={[styles.detailValue, styles.warning]}>
                        {day.cashVariance > 0 ? '+' : ''}{formatMoney(Math.abs(day.cashVariance))}
                      </Text>
                    </View>
                  )}

                  <Button
                    label="View Full Details"
                    variant="outline"
                    size="sm"
                    onPress={() => router.push(`/(owner)/pnl/${day.date}`)}
                    style={styles.detailsButton}
                  />
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: typography.display,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
    marginTop: spacing.xs,
  },
  rangeSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rangeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rangeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  rangeText: {
    fontSize: typography.sm,
    color: colors.sub,
    fontWeight: '500',
    fontFamily: typography.body,
  },
  rangeTextActive: {
    color: colors.bg,
  },
  insightCard: {
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.md,
    backgroundColor: colors.amberDim,
    borderColor: colors.amber,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  insightIcon: {
    fontSize: 20,
  },
  insightTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.amber,
    fontFamily: typography.body,
  },
  insightText: {
    fontSize: typography.sm,
    color: colors.text,
    fontFamily: typography.body,
    lineHeight: 20,
  },
  insightDate: {
    fontSize: typography.xs,
    color: colors.muted,
    fontFamily: typography.body,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.body,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  sectionSubtitle: {
    fontSize: typography.sm,
    color: colors.muted,
    fontFamily: typography.body,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    width: '47%',
    padding: spacing.md,
  },
  revenueCard: {
    backgroundColor: colors.accentDim,
  },
  cogsCard: {
    backgroundColor: colors.redDim,
  },
  grossCard: {
    backgroundColor: colors.greenDim,
  },
  expensesCard: {
    backgroundColor: colors.redDim,
  },
  netCard: {
    width: '100%',
  },
  profitCard: {
    backgroundColor: colors.greenDim,
    borderColor: colors.green,
  },
  lossCard: {
    backgroundColor: colors.redDim,
    borderColor: colors.red,
  },
  bestDayCard: {
    backgroundColor: colors.amberDim,
  },
  summaryLabel: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
  },
  summaryValue: {
    fontSize: typography.xl,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: typography.mono,
    marginTop: spacing.xs,
  },
  summarySubtext: {
    fontSize: typography.xs,
    color: colors.muted,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  negative: {
    color: colors.red,
  },
  positive: {
    color: colors.green,
  },
  netValue: {
    fontSize: typography.xxl,
  },
  profitText: {
    color: colors.green,
  },
  lossText: {
    color: colors.red,
  },
  emptyCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.base,
    color: colors.muted,
    fontFamily: typography.body,
  },
  dayCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  dayLeft: {
    flex: 1,
  },
  dayDate: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.body,
  },
  dayFullDate: {
    fontSize: typography.xs,
    color: colors.muted,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  dayRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  dayNet: {
    fontSize: typography.lg,
    fontWeight: 'bold',
    fontFamily: typography.mono,
  },
  dayStats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayExpanded: {
    padding: spacing.md,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
  },
  detailValue: {
    fontSize: typography.sm,
    color: colors.text,
    fontFamily: typography.mono,
  },
  varianceRow: {
    backgroundColor: colors.amberDim,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
  },
  warning: {
    color: colors.amber,
  },
  detailsButton: {
    marginTop: spacing.md,
  },
  spacer: {
    height: spacing.xxl,
  },
});
