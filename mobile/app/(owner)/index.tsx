import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { useBusiness } from '@/hooks/useBusiness';
import { useDashboard } from '@/hooks/useDashboard';
import { useWebSocket } from '@/hooks/useWebSocket';
import { colors, typography, spacing, formatMoney, formatMoneyShort } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Badge } from '@/components/ui/Badge';

// Feature grid item type
interface FeatureItem {
  id: string;
  icon: string;
  label: string;
  route: string;
  badge?: string;
  badgeColor?: 'default' | 'success' | 'warning' | 'error';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { business } = useBusiness();
  const { 
    todayPnl, 
    recentSales, 
    alerts, 
    weekTrend, 
    expenses, 
    savings, 
    passport, 
    unreadNotifications,
    isLoading, 
    refresh 
  } = useDashboard();
  const { isConnected } = useWebSocket();
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const isToday = (date: string) => date === today;

  // Calculate cash progress (0-1) based on typical daily target
  // For demo: assume target is 50,000 KES, or use historical average if available
  const dailyTarget = 5000000; // 50,000 KES in cents
  const cashProgress = Math.min((todayPnl?.cashExpected || 0) / dailyTarget, 1);

  // Calculate savings goal progress
  const savingsProgress = savings && savings.goalAmount > 0 
    ? savings.balance / savings.goalAmount 
    : 0;

  // Check if loan teaser should show (passport score >= 60)
  const showLoanTeaser = passport && passport.overallScore >= 60;

  // Features grid data - 12 cards
  const features: FeatureItem[] = [
    { id: 'record', icon: '➕', label: 'Record Sale', route: '/(owner)/record' },
    { id: 'stock', icon: '📦', label: 'Stock', route: '/(owner)/stock', badge: '3', badgeColor: 'warning' },
    { id: 'expenses', icon: '💸', label: 'Expenses', route: '/(owner)/expenses' },
    { id: 'team', icon: '👥', label: 'Team', route: '/(owner)/team' },
    { id: 'savings', icon: '🏦', label: 'Savings', route: '/(owner)/savings' },
    { id: 'pnl', icon: '📊', label: 'P&L', route: '/(owner)/pnl' },
    { id: 'passport', icon: '🛂', label: 'Passport', route: '/(owner)/passport' },
    { id: 'close', icon: '🔒', label: 'Close Day', route: '/(owner)/close-day' },
    { id: 'reports', icon: '📈', label: 'Reports', route: '/(owner)/reports' },
    { id: 'settings', icon: '⚙️', label: 'Settings', route: '/(owner)/settings' },
    { id: 'help', icon: '❓', label: 'Help', route: '/(owner)/help' },
    { id: 'share', icon: '🔗', label: 'Share', route: '/(owner)/share' },
  ];

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.accent} />
      }
    >
      {/* Header with Date, Business Name, Avatar & Notification Bell */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dateText}>{todayFormatted}</Text>
          <Text style={styles.businessName}>{business?.name || user?.name || 'Your Business'}</Text>
          <View style={styles.connectionStatus}>
            <View style={[styles.dot, isConnected && styles.dotConnected]} />
            <Text style={styles.connectionText}>
              {isConnected ? 'Live updates' : 'Offline mode'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* Notification Bell */}
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/(owner)/notifications')}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Profile Avatar */}
          <TouchableOpacity style={styles.avatarButton} onPress={() => logout()}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || '👤'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mismatch Alert Banner */}
      {alerts.filter(a => a.type === 'mismatch').map((alert) => (
        <AlertBanner
          key={alert.id}
          title={alert.title}
          body={alert.body + (alert.data?.cashierName ? ` • Cashier: ${alert.data.cashierName}` : '')}
          severity="warning"
          action={{ label: 'Review', onPress: () => router.push('/(owner)/close-day') }}
          onDismiss={() => {}}
        />
      ))}

      {/* Other Alerts */}
      {alerts.filter(a => a.type !== 'mismatch').map((alert) => (
        <AlertBanner
          key={alert.id}
          title={alert.title}
          body={alert.body}
          severity={alert.severity}
          onDismiss={() => {}}
        />
      ))}

      {/* Today's Sales - KES amount + transaction count */}
      <Card elevated style={styles.mainStatCard}>
        <Text style={styles.mainStatLabel}>Today's Sales</Text>
        <Text style={styles.mainStatValue}>
          {formatMoney(todayPnl?.totalRevenue || 0)}
        </Text>
        <View style={styles.mainStatRow}>
          <Badge 
            label={`${todayPnl?.transactionCount || 0} transactions`} 
            variant="default" 
            size="sm" 
          />
          {isConnected && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Stats Grid: Net Profit, Cash Expected, Savings */}
      <View style={styles.statsGrid}>
        {/* Net Profit with Margin % */}
        <Card style={[styles.statCard, styles.statCardFlex]}>
          <Text style={styles.statLabel}>Net Profit</Text>
          <Text style={[styles.statValue, { color: todayPnl && todayPnl.netProfit >= 0 ? colors.green : colors.red }]}>
            {formatMoneyShort(todayPnl?.netProfit || 0)}
          </Text>
          <Text style={styles.statSubtext}>
            {todayPnl?.netMarginPct || 0}% margin
          </Text>
        </Card>

        {/* Cash Expected with Progress Bar */}
        <Card style={[styles.statCard, styles.statCardFlex]}>
          <Text style={styles.statLabel}>Cash Expected</Text>
          <Text style={styles.statValue}>
            {formatMoneyShort(todayPnl?.cashExpected || 0)}
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${cashProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(cashProgress * 100)}%</Text>
          </View>
        </Card>
      </View>

      {/* Nest Savings */}
      <Card elevated style={styles.savingsCard}>
        <View style={styles.savingsHeader}>
          <View>
            <Text style={styles.savingsLabel}>Nest Savings</Text>
            <Text style={styles.savingsValue}>
              {formatMoney(savings?.balance || 0)}
            </Text>
          </View>
          <ScoreRing score={savingsProgress > 0 ? Math.round(savingsProgress * 100) : null} size={50} />
        </View>
        <View style={styles.savingsProgressRow}>
          <View style={styles.savingsProgressBar}>
            <View style={[styles.savingsProgressFill, { width: `${Math.min(savingsProgress * 100, 100)}%` }]} />
          </View>
          <Text style={styles.savingsProgressText}>
            {Math.round(savingsProgress * 100)}% of goal
          </Text>
        </View>
        <Text style={styles.savingsSubtext}>
          Auto-saving {savings?.autoSaveRate || business?.autoSaveRate || 5}% of profit
        </Text>
      </Card>

      {/* Weekly Trend Chart */}
      <Text style={styles.sectionTitle}>Weekly Trend</Text>
      <Card style={styles.trendCard}>
        {weekTrend.length > 0 ? (
          <View style={styles.trendBars}>
            {weekTrend.map((day, index) => {
              const maxRevenue = Math.max(...weekTrend.map(d => d.revenue));
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              const isTodayBar = isToday(day.date);
              return (
                <View key={index} style={styles.trendBarContainer}>
                  <View 
                    style={[
                      styles.trendBar, 
                      { height: `${Math.max(height, 5)}%` },
                      isTodayBar && styles.trendBarToday
                    ]} 
                  />
                  <Text style={[styles.trendLabel, isTodayBar && styles.trendLabelToday]}>
                    {new Date(day.date).toLocaleDateString('en-KE', { weekday: 'narrow' })}
                  </Text>
                  {isTodayBar && <View style={styles.todayIndicator} />}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No data available</Text>
        )}
      </Card>

      {/* Expenses Today */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Expenses Today</Text>
        <Text style={styles.expensesTotal}>{formatMoneyShort(expenses?.total || 0)}</Text>
      </View>
      <Card style={styles.expensesCard}>
        {expenses && expenses.byCategory && Object.keys(expenses.byCategory).length > 0 ? (
          <View style={styles.expenseCategories}>
            {Object.entries(expenses.byCategory).map(([category, amount]) => (
              <View key={category} style={styles.expenseCategoryRow}>
                <Text style={styles.expenseCategoryName}>{category}</Text>
                <Text style={styles.expenseCategoryAmount}>{formatMoneyShort(amount)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No expenses recorded today</Text>
        )}
      </Card>

      {/* Loan Teaser - Only if passport score >= 60 */}
      {showLoanTeaser && (
        <Card elevated style={styles.loanCard}>
          <View style={styles.loanHeader}>
            <Text style={styles.loanIcon}>💰</Text>
            <View style={styles.loanTextContainer}>
              <Text style={styles.loanTitle}>Loan Available!</Text>
              <Text style={styles.loanSubtitle}>
                Pre-approved up to {formatMoneyShort(passport.loanLimit)}
              </Text>
            </View>
            <ScoreRing score={passport.overallScore} size={45} />
          </View>
          <TouchableOpacity 
            style={styles.loanButton}
            onPress={() => router.push('/(owner)/passport')}
          >
            <Text style={styles.loanButtonText}>View Lender Options →</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* All Features Grid - 12 Tappable Cards */}
      <Text style={styles.sectionTitle}>All Features</Text>
      <View style={styles.featuresGrid}>
        {features.map((feature) => (
          <TouchableOpacity 
            key={feature.id}
            style={styles.featureCard}
            onPress={() => router.push(feature.route as any)}
          >
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              {feature.badge && (
                <View style={[
                  styles.featureBadge,
                  feature.badgeColor === 'warning' && { backgroundColor: colors.amber },
                  feature.badgeColor === 'error' && { backgroundColor: colors.red },
                  feature.badgeColor === 'success' && { backgroundColor: colors.green },
                ]}>
                  <Text style={styles.featureBadgeText}>{feature.badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.featureLabel}>{feature.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Sales List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Sales</Text>
        <TouchableOpacity onPress={() => router.push('/(owner)/transactions')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      
      {recentSales.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No sales recorded today</Text>
        </Card>
      ) : (
        recentSales.slice(0, 5).map((sale) => (
          <Card key={sale.id} style={styles.saleCard}>
            <TouchableOpacity 
              onPress={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
              activeOpacity={0.7}
            >
              <View style={styles.saleRow}>
                <View style={styles.saleLeft}>
                  <Text style={styles.saleTime}>
                    {new Date(sale.recordedAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.saleCashier}>{sale.cashierName || 'Unknown'}</Text>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleAmount}>{formatMoney(sale.totalAmount)}</Text>
                  <Badge 
                    label={sale.paymentMethod} 
                    variant={sale.paymentMethod === 'cash' ? 'default' : 'info'}
                    size="sm"
                  />
                </View>
              </View>
              
              {/* Expanded View */}
              {expandedSale === sale.id && sale.items && sale.items.length > 0 && (
                <View style={styles.saleExpanded}>
                  <View style={styles.divider} />
                  {sale.items.map((item, idx) => (
                    <View key={idx} style={styles.saleItemRow}>
                      <Text style={styles.saleItemName}>{item.productName}</Text>
                      <Text style={styles.saleItemQty}>×{item.quantity}</Text>
                      <Text style={styles.saleItemAmount}>{formatMoney(item.lineTotal)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          </Card>
        ))
      )}

      {/* Close Day Button */}
      <View style={styles.closeDayContainer}>
        <Button
          label="Close Today's Business"
          variant="primary"
          onPress={() => router.push('/(owner)/close-day')}
        />
        <Text style={styles.closeDaySubtext}>
          End your day and reconcile the till
        </Text>
      </View>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
    textTransform: 'capitalize',
  },
  businessName: {
    fontSize: typography.xxl,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: typography.display,
    marginTop: spacing.xs,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  dotConnected: {
    backgroundColor: colors.green,
  },
  connectionText: {
    fontSize: typography.xs,
    color: colors.sub,
    fontFamily: typography.body,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.red,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: typography.xs,
    color: colors.text,
    fontWeight: 'bold',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  avatarText: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: 'bold',
  },
  mainStatCard: {
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.lg,
    alignItems: 'center',
  },
  mainStatLabel: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
  },
  mainStatValue: {
    fontSize: typography.hero,
    fontWeight: 'bold',
    color: colors.accent,
    fontFamily: typography.mono,
    marginVertical: spacing.sm,
  },
  mainStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.greenDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  liveText: {
    fontSize: typography.xs,
    color: colors.green,
    fontWeight: 'bold',
    fontFamily: typography.body,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    padding: spacing.md,
    flex: 1,
  },
  statCardFlex: {
    flex: 1,
  },
  statLabel: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.xl,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: typography.mono,
  },
  statSubtext: {
    fontSize: typography.xs,
    color: colors.muted,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.bg4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: typography.xs,
    color: colors.sub,
    fontFamily: typography.mono,
    minWidth: 28,
  },
  savingsCard: {
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.lg,
  },
  savingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  savingsLabel: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
  },
  savingsValue: {
    fontSize: typography.xxl,
    fontWeight: 'bold',
    color: colors.green,
    fontFamily: typography.mono,
    marginTop: spacing.xs,
  },
  savingsProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  savingsProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.bg4,
    borderRadius: 3,
    overflow: 'hidden',
  },
  savingsProgressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  savingsProgressText: {
    fontSize: typography.xs,
    color: colors.sub,
    fontFamily: typography.mono,
    minWidth: 50,
  },
  savingsSubtext: {
    fontSize: typography.xs,
    color: colors.muted,
    marginTop: spacing.sm,
    fontFamily: typography.body,
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
  trendCard: {
    margin: spacing.lg,
    marginTop: 0,
    height: 140,
    justifyContent: 'center',
    padding: spacing.md,
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: spacing.sm,
  },
  trendBarContainer: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  trendBar: {
    width: 28,
    backgroundColor: colors.accent,
    borderRadius: 4,
    minHeight: 4,
    opacity: 0.7,
  },
  trendBarToday: {
    backgroundColor: colors.amber,
    opacity: 1,
  },
  trendLabel: {
    fontSize: typography.xs,
    color: colors.muted,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  trendLabelToday: {
    color: colors.amber,
    fontWeight: 'bold',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.amber,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing.lg,
    marginTop: spacing.lg,
  },
  expensesTotal: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.red,
    fontFamily: typography.mono,
  },
  expensesCard: {
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.md,
  },
  expenseCategories: {
    gap: spacing.sm,
  },
  expenseCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  expenseCategoryName: {
    fontSize: typography.sm,
    color: colors.text,
    fontFamily: typography.body,
    textTransform: 'capitalize',
  },
  expenseCategoryAmount: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.mono,
  },
  loanCard: {
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.lg,
    backgroundColor: colors.greenDim,
    borderColor: colors.green,
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  loanIcon: {
    fontSize: 32,
  },
  loanTextContainer: {
    flex: 1,
  },
  loanTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.green,
    fontFamily: typography.body,
  },
  loanSubtitle: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
    marginTop: spacing.xs,
  },
  loanButton: {
    backgroundColor: colors.green,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  loanButtonText: {
    fontSize: typography.sm,
    color: colors.bg,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  featureCard: {
    width: '30%',
    backgroundColor: colors.bg2,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.sm,
  },
  featureIconContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.amber,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  featureBadgeText: {
    fontSize: 10,
    color: colors.bg,
    fontWeight: 'bold',
  },
  featureLabel: {
    fontSize: typography.xs,
    color: colors.text,
    fontWeight: '500',
    fontFamily: typography.body,
    textAlign: 'center',
  },
  seeAll: {
    fontSize: typography.sm,
    color: colors.accent,
    fontWeight: '500',
    fontFamily: typography.body,
  },
  emptyCard: {
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.base,
    color: colors.muted,
    fontFamily: typography.body,
  },
  saleCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  saleLeft: {
    flex: 1,
  },
  saleTime: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
  },
  saleCashier: {
    fontSize: typography.xs,
    color: colors.muted,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  saleRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  saleAmount: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.mono,
  },
  saleExpanded: {
    padding: spacing.md,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.sm,
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  saleItemName: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
    flex: 1,
  },
  saleItemQty: {
    fontSize: typography.sm,
    color: colors.muted,
    fontFamily: typography.body,
    marginHorizontal: spacing.sm,
  },
  saleItemAmount: {
    fontSize: typography.sm,
    color: colors.text,
    fontFamily: typography.mono,
  },
  closeDayContainer: {
    margin: spacing.lg,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  closeDaySubtext: {
    fontSize: typography.sm,
    color: colors.muted,
    marginTop: spacing.sm,
    fontFamily: typography.body,
  },
  spacer: {
    height: spacing.xxl,
  },
});
