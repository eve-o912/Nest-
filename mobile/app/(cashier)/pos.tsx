import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Colors, Typography, Spacing } from '@/styles/theme';

export default function PosScreen() {
  const { user, logout } = useAuthStore();
  const [items, setItems] = useState<Array<{ name: string; price: number; qty: number }>>([]);
  const [total, setTotal] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Sale</Text>
        <TouchableOpacity onPress={logout}>
          <Text>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Items List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items added yet</Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Add Item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text>{item.name}</Text>
                <Text>KES {item.price * item.qty}</Text>
              </View>
            ))
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity style={[styles.paymentOption, styles.paymentOptionActive]}>
              <Text>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.paymentOption}>
              <Text>M-Pesa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>KES {total}</Text>
        </View>
        <TouchableOpacity style={styles.chargeButton}>
          <Text style={styles.chargeButtonText}>Generate Receipt</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  addButton: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  addButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  paymentOption: {
    flex: 1,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  bottomBar: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  totalLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  totalValue: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  chargeButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  chargeButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
});
