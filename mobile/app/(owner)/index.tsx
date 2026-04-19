import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { useBusiness } from '@/hooks/useBusiness';
import { useDashboard } from '@/hooks/useDashboard';
import { useWebSocket } from '@/hooks/useWebSocket';
import { colors, typography, spacing, formatMoney, formatDate } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Badge } from '@/components/ui/Badge';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { business } = useBusiness();
  const { todayPnl, recentSales, alerts, weekTrend, isLoading, refresh } = useDashboard();
  const { isConnected } = useWebSocket();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.accent} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.businessName}>{business?.business?.name || user?.name || 'Your Business'}</Text>
          <View style={styles.connectionStatus}>
            <View style={[styles.dot, isConnected && styles.dotConnected]} />
            <Text style={styles.connectionText}>
              {isConnected ? 'Live updates' : 'Offline mode'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => logout()}>
          <Text style={styles.profileText}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {alerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          title={alert.title}
          body={alert.body}
          severity={alert.severity}
          onDismiss={() => {}}
        />
      ))}

      {/* Today's Summary */}
      <Card elevated style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Revenue"
            value={todayPnl?.totalRevenue || 0}
            color="accent"
            compact
          />
          <StatCard
            label="Sales"
            value={todayPnl?.transactionCount || 0}
            isMoney={false}
            color="default"
            compact
          />
          <StatCard
            label="Net Profit"
            value={todayPnl?.netProfit || 0}
            color={todayPnl && todayPnl.netProfit >= 0 ? 'green' : 'red'}
            compact
          />
          <StatCard
            label="Cash Expected"
            value={todayPnl?.cashExpected || 0}
            color="default"
            compact
          />
        </View>
      </Card>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/(owner)/record')}
        >
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionLabel}>Record Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/(owner)/stock')}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionLabel}>Add Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/(owner)/expenses')}
        >
          <Text style={styles.actionIcon}>💸</Text>
          <Text style={styles.actionLabel}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/(owner)/team')}
        >
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionLabel}>View Team</Text>
        </TouchableOpacity>
      </View>

      {/* Week Trend */}
      <Text style={styles.sectionTitle}>Last 7 Days</Text>
      <Card style={styles.trendCard}>
        {weekTrend.length > 0 ? (
          <View style={styles.trendBars}>
            {weekTrend.map((day, index) => {
              const maxRevenue = Math.max(...weekTrend.map(d => d.revenue));
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              return (
                <View key={index} style={styles.trendBarContainer}>
                  <View style={[styles.trendBar, { height: `${height}%` }]} />
                  <Text style={styles.trendLabel}>
                    {new Date(day.date).toLocaleDateString('en-KE', { weekday: 'narrow' })}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No data available</Text>
        )}
      </Card>

      {/* Recent Sales */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Sales</Text>
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
            <View style={styles.saleRow}>
              <View>
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
          </Card>
        ))
      )}

      {/* Close Day Button */}
      <Button
        label="Close Today's Business"
        variant="ghost"
        onPress={() => router.push('/(owner)/close-day')}
      />

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
  greeting: {
    fontSize: typography.sm,
    color: colors.sub,
    fontFamily: typography.body,
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
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  profileText: {
    fontSize: 20,
  },
  summaryCard: {
    margin: spacing.lg,
    marginTop: 0,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.bg2,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: '500',
    fontFamily: typography.body,
  },
  trendCard: {
    margin: spacing.lg,
    marginTop: 0,
    height: 120,
    justifyContent: 'center',
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    paddingHorizontal: spacing.md,
  },
  trendBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  trendBar: {
    width: 24,
    backgroundColor: colors.accent,
    borderRadius: 4,
    minHeight: 4,
  },
  trendLabel: {
    fontSize: typography.xs,
    color: colors.muted,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing.lg,
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
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  spacer: {
    height: spacing.xxl,
  },
});
