import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { Colors, Typography, Spacing, CardStyles } from '@/styles/theme';

export default function DashboardScreen() {
  const { user, logout } = useAuthStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.businessName}>{user?.name || 'Your Business'}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Text style={styles.profileText}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Summary Card */}
      <View style={[CardStyles.elevated, styles.summaryCard]}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Revenue</Text>
            <Text style={styles.summaryValue}>KES 0</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Sales</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cash</Text>
            <Text style={styles.summaryValue}>KES 0</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionLabel}>Record Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionLabel}>Add Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionLabel}>View P&L</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionIcon}>🏦</Text>
          <Text style={styles.actionLabel}>Check Savings</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Alerts */}
      <Text style={styles.sectionTitle}>Alerts</Text>
      <View style={styles.alertCard}>
        <Text style={styles.alertText}>No new alerts</Text>
      </View>

      {/* Close Day Button */}
      <TouchableOpacity style={styles.closeDayButton}>
        <Text style={styles.closeDayText}>Close Today's Business</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={logout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
  },
  greeting: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  businessName: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    fontSize: 24,
  },
  summaryCard: {
    margin: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  actionCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  alertCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
  },
  alertText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
  },
  closeDayButton: {
    backgroundColor: Colors.primary,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeDayText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
  logoutButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    color: Colors.error,
    fontSize: Typography.sizes.md,
  },
});
