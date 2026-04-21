import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useBusinessStore } from '@/store/business.store';
import { expenseService, type CreateExpenseRequest } from '@/services/expense.service';
import { Colors, Typography, Spacing } from '@/styles/theme';
import type { Expense } from '@/types/models';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Supplies',
  'Transport',
  'Marketing',
  'Maintenance',
  'Other'
];

export default function ExpensesScreen() {
  const { currentBusiness } = useBusinessStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<{ total: number; byCategory: Record<string, number>; count: number } | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isRecurringModalVisible, setIsRecurringModalVisible] = useState(false);
  const [isAnomaliesModalVisible, setIsAnomaliesModalVisible] = useState(false);
  
  // Anomalies & recurring
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'recurring'>('expenses');
  
  // Form state
  const [formData, setFormData] = useState<Partial<CreateExpenseRequest>>({
    category: '',
    amount: 0,
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    isRecurring: false,
  });

  // Date range for summary (current month)
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    if (!currentBusiness?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [expensesResponse, summaryResponse, categoriesResponse] = await Promise.all([
        expenseService.getList(currentBusiness.id, { 
          startDate: firstDayOfMonth, 
          endDate: lastDayOfMonth 
        }),
        expenseService.getSummary(currentBusiness.id, firstDayOfMonth, lastDayOfMonth),
        expenseService.getCategories(currentBusiness.id),
      ]);
      
      setExpenses(expensesResponse.expenses || []);
      setSummary(summaryResponse);
      setCategories(categoriesResponse.categories || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadData();
    loadAnomalies();
    loadRecurring();
  }, [loadData]);

  // Load expense anomalies
  const loadAnomalies = useCallback(async () => {
    if (!currentBusiness?.id) return;
    try {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const response = await expenseService.getAnomalies(currentBusiness.id, {
        from: from.toISOString().split('T')[0],
      });
      setAnomalies(response.anomalies?.filter(a => !a.isAcknowledged) || []);
    } catch (err: any) {
      console.error('Failed to load anomalies:', err);
    }
  }, [currentBusiness?.id]);

  // Load recurring expenses
  const loadRecurring = useCallback(async () => {
    if (!currentBusiness?.id) return;
    try {
      const response = await expenseService.getRecurring(currentBusiness.id);
      setRecurringExpenses(response.recurring || []);
    } catch (err: any) {
      console.error('Failed to load recurring:', err);
    }
  }, [currentBusiness?.id]);

  // Handle receipt photo capture
  const handleCaptureReceipt = async () => {
    // Note: This requires expo-image-picker to be installed
    // For now, we'll simulate with a placeholder
    Alert.alert('Receipt Capture', 'Photo capture would open here with expo-image-picker');
    // setReceiptPhoto('captured-photo-uri');
  };

  // Upload receipt for expense
  const handleUploadReceipt = async (expenseId: string) => {
    if (!currentBusiness?.id || !receiptPhoto) return;
    try {
      await expenseService.uploadReceipt(currentBusiness.id, expenseId, receiptPhoto);
      setReceiptPhoto(null);
      Alert.alert('Success', 'Receipt uploaded successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to upload receipt');
    }
  };

  const handleAddExpense = async () => {
    if (!currentBusiness?.id) return;
    if (!formData.category || !formData.amount || formData.amount <= 0) {
      Alert.alert('Error', 'Please enter category and amount');
      return;
    }
    
    setIsLoading(true);
    try {
      await expenseService.create(currentBusiness.id, {
        category: formData.category,
        amount: formData.amount,
        description: formData.description,
        expenseDate: formData.expenseDate || new Date().toISOString().split('T')[0],
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.recurringFrequency,
      });
      
      setIsAddModalVisible(false);
      resetForm();
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!currentBusiness?.id) return;
    
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await expenseService.delete(currentBusiness.id, expenseId);
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete expense');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      category: '',
      amount: 0,
      description: '',
      expenseDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
    });
    setSelectedExpense(null);
  };

  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
      </View>
      
      {item.description && (
        <Text style={styles.expenseDescription}>{item.description}</Text>
      )}
      
      <View style={styles.expenseFooter}>
        <Text style={styles.expenseDate}>{formatDate(item.expense_date)}</Text>
        {item.is_recurring && (
          <View style={styles.recurringBadge}>
            <Text style={styles.recurringText}>↻ {item.recurring_frequency}</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteExpense(item.id)}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategorySummary = () => {
    if (!summary || Object.keys(summary.byCategory).length === 0) return null;
    
    const sortedCategories = Object.entries(summary.byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    return (
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Top Categories</Text>
        {sortedCategories.map(([category, amount]) => (
          <View key={category} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{category}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(amount)}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Anomalies Alert */}
      {anomalies.length > 0 && (
        <TouchableOpacity 
          style={styles.anomalyBanner}
          onPress={() => setIsAnomaliesModalVisible(true)}
        >
          <Text style={styles.anomalyTitle}>⚠️ Unusual Expense Detected</Text>
          <Text style={styles.anomalyText}>
            {anomalies.length} expense{anomalies.length > 1 ? 's' : ''} higher than 30-day baseline
          </Text>
          <Text style={styles.anomalySubtext}>Tap to review</Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionChip}
          onPress={() => setIsRecurringModalVisible(true)}
        >
          <Text style={styles.actionChipIcon}>🔄</Text>
          <Text style={styles.actionChipText}>Recurring ({recurringExpenses.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionChip}
          onPress={() => setIsAnomaliesModalVisible(true)}
        >
          <Text style={styles.actionChipIcon}>🔍</Text>
          <Text style={styles.actionChipText}>Anomalies ({anomalies.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Summary */}
      {summary && (
        <View style={styles.monthlyCard}>
          <Text style={styles.monthlyLabel}>This Month</Text>
          <Text style={styles.monthlyTotal}>{formatCurrency(summary.total)}</Text>
          <Text style={styles.monthlyCount}>{summary.count} expenses</Text>
        </View>
      )}

      {/* Category Summary */}
      {renderCategorySummary()}

      {/* Expenses List */}
      {isLoading && expenses.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.expenseList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No expenses this month</Text>
              <Text style={styles.emptySubtext}>Tap "+ Add" to record an expense</Text>
            </View>
          }
        />
      )}

      {/* Add Expense Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setIsAddModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TouchableOpacity onPress={() => {
              setIsAddModalVisible(false);
              resetForm();
            }}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer}>
            <Text style={styles.formLabel}>Category *</Text>
            <View style={styles.categoryGrid}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    formData.category === cat && styles.categoryChipActive
                  ]}
                  onPress={() => setFormData({...formData, category: cat})}
                >
                  <Text style={[
                    styles.categoryChipText,
                    formData.category === cat && styles.categoryChipTextActive
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.formLabel}>Amount (KES) *</Text>
            <TextInput
              style={styles.formInput}
              value={formData.amount ? formData.amount.toString() : ''}
              onChangeText={(text) => setFormData({...formData, amount: parseInt(text) || 0})}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.textLight}
            />
            
            <Text style={styles.formLabel}>Date</Text>
            <TextInput
              style={styles.formInput}
              value={formData.expenseDate}
              onChangeText={(text) => setFormData({...formData, expenseDate: text})}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textLight}
            />
            
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              placeholder="Enter description..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.recurringRow}>
              <TouchableOpacity
                style={[styles.checkbox, formData.isRecurring && styles.checkboxChecked]}
                onPress={() => setFormData({...formData, isRecurring: !formData.isRecurring})}
              >
                {formData.isRecurring && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Recurring expense</Text>
            </View>
            
            {formData.isRecurring && (
              <View style={styles.frequencyRow}>
                {['daily', 'weekly', 'monthly'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      formData.recurringFrequency === freq && styles.frequencyButtonActive
                    ]}
                    onPress={() => setFormData({...formData, recurringFrequency: freq as any})}
                  >
                    <Text style={[
                      styles.frequencyText,
                      formData.recurringFrequency === freq && styles.frequencyTextActive
                    ]}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {/* Receipt Photo Capture */}
            <View style={styles.receiptSection}>
              <Text style={styles.formLabel}>Receipt Photo (optional)</Text>
              <TouchableOpacity 
                style={styles.receiptButton}
                onPress={handleCaptureReceipt}
              >
                <Text style={styles.receiptButtonIcon}>📷</Text>
                <Text style={styles.receiptButtonText}>
                  {receiptPhoto ? 'Photo captured ✓' : 'Take photo of receipt'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.receiptHint}>
                Photos stored securely on Cloudflare R2
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleAddExpense}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Save Expense</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Anomalies Modal */}
      <Modal
        visible={isAnomaliesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAnomaliesModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Expense Anomalies</Text>
            <TouchableOpacity onPress={() => setIsAnomaliesModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.anomalyInfo}>
              AI-detected expenses that are unusually high compared to your 30-day baseline.
            </Text>
            
            {anomalies.length === 0 ? (
              <Text style={styles.emptyText}>No unacknowledged anomalies</Text>
            ) : (
              anomalies.map((anomaly) => (
                <View key={anomaly.id} style={styles.anomalyCard}>
                  <View style={styles.anomalyHeader}>
                    <Text style={styles.anomalyCategory}>{anomaly.category}</Text>
                    <View style={[styles.severityBadge, 
                      anomaly.severity === 'high' ? styles.severityHigh :
                      anomaly.severity === 'medium' ? styles.severityMedium :
                      styles.severityLow
                    ]}>
                      <Text style={styles.severityText}>{anomaly.severity}</Text>
                    </View>
                  </View>
                  <Text style={styles.anomalyAmount}>
                    KES {anomaly.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.anomalyExpected}>
                    Expected range: KES {anomaly.expectedRange.min.toLocaleString()} - {anomaly.expectedRange.max.toLocaleString()}
                  </Text>
                  <TouchableOpacity 
                    style={styles.acknowledgeButton}
                    onPress={async () => {
                      if (currentBusiness?.id) {
                        await expenseService.acknowledgeAnomaly(currentBusiness.id, anomaly.id);
                        loadAnomalies();
                      }
                    }}
                  >
                    <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Recurring Expenses Modal */}
      <Modal
        visible={isRecurringModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsRecurringModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recurring Expenses</Text>
            <TouchableOpacity onPress={() => setIsRecurringModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.recurringInfo}>
              Set up automatic expense generation for rent, salaries, and other regular payments.
            </Text>
            
            {recurringExpenses.length === 0 ? (
              <Text style={styles.emptyText}>No recurring expenses set up</Text>
            ) : (
              recurringExpenses.map((item) => (
                <View key={item.id} style={styles.recurringCard}>
                  <View style={styles.recurringHeader}>
                    <Text style={styles.recurringCategory}>{item.category}</Text>
                    <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
                      <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Paused'}</Text>
                    </View>
                  </View>
                  <Text style={styles.recurringAmount}>
                    KES {item.amount.toLocaleString()} / {item.frequency}
                  </Text>
                  {item.description && (
                    <Text style={styles.recurringDescription}>{item.description}</Text>
                  )}
                  <Text style={styles.recurringNext}>
                    Next: {new Date(item.nextRunDate).toLocaleDateString('en-KE')}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  addButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.sizes.sm,
  },
  monthlyCard: {
    backgroundColor: Colors.primary,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
  },
  monthlyLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.8,
    marginBottom: Spacing.sm,
  },
  monthlyTotal: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  monthlyCount: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.8,
    marginTop: Spacing.sm,
  },
  summarySection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  summaryValue: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  expenseList: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  expenseCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  categoryText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: Typography.sizes.sm,
  },
  expenseAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  expenseDescription: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  recurringBadge: {
    backgroundColor: Colors.success + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recurringText: {
    color: Colors.success,
    fontSize: Typography.sizes.xs,
  },
  deleteButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
  },
  deleteButtonText: {
    fontSize: Typography.sizes.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.sizes.md,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    fontSize: Typography.sizes.xl,
    color: Colors.textLight,
    padding: Spacing.sm,
  },
  formContainer: {
    padding: Spacing.lg,
  },
  formLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  categoryChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  formInput: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  frequencyButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  frequencyText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  frequencyTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  actionChipIcon: {
    fontSize: 16,
  },
  actionChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  // Anomaly Banner
  anomalyBanner: {
    backgroundColor: Colors.error + '15',
    margin: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  anomalyTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: 'bold',
    color: Colors.error,
  },
  anomalyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  anomalySubtext: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  // Modal Content
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  anomalyInfo: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  anomalyCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  anomalyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  anomalyCategory: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  anomalyAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  anomalyExpected: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
  },
  severityHigh: {
    backgroundColor: Colors.error,
  },
  severityMedium: {
    backgroundColor: '#F59E0B',
  },
  severityLow: {
    backgroundColor: Colors.success,
  },
  severityText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  acknowledgeButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  acknowledgeButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  // Recurring
  recurringInfo: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  recurringCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  recurringCategory: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  recurringAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  recurringDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  recurringNext: {
    fontSize: Typography.sizes.sm,
    color: Colors.success,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: Colors.success + '20',
  },
  statusInactive: {
    backgroundColor: Colors.textLight + '20',
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  // Receipt Section
  receiptSection: {
    marginBottom: Spacing.lg,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: Spacing.md,
  },
  receiptButtonIcon: {
    fontSize: 24,
  },
  receiptButtonText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    flex: 1,
  },
  receiptHint: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
});
