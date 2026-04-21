import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList, Modal, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useBusinessStore } from '@/store/business.store';
import { useCartStore } from '@/store/cart.store';
import { productService } from '@/services/product.service';
import { transactionService, type TransactionItem, type ReceiptData } from '@/services/transaction.service';
import { Colors, Typography, Spacing } from '@/styles/theme';
import type { Product } from '@/types/models';

export default function PosScreen() {
  const { user } = useAuthStore();
  const { currentBusiness } = useBusinessStore();
  const { items, method, customerPhone, addItem, removeItem, updateQuantity, setMethod, setCustomerPhone, clear, total, itemCount } = useCartStore();
  
  // Product catalog state
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load products on mount
  useEffect(() => {
    if (currentBusiness?.id) {
      loadProducts();
    }
  }, [currentBusiness?.id]);

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.includes(query))
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  const loadProducts = async () => {
    if (!currentBusiness?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await productService.getAll(currentBusiness.id, { isActive: true });
      const productsList = response.products || [];
      setProducts(productsList);
      setFilteredProducts(productsList);
      
      // Extract unique categories
      const cats = [...new Set(productsList.filter(p => p.category).map(p => p.category))];
      setCategories(cats as string[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    addItem(product, quantity);
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    const cartItem = items.find(item => item.product.id === productId);
    if (cartItem) {
      const newQty = cartItem.quantity + delta;
      if (newQty <= 0) {
        removeItem(productId);
      } else {
        updateQuantity(productId, newQty);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const handleGenerateReceipt = async () => {
    if (!currentBusiness?.id) {
      Alert.alert('Error', 'No business selected');
      return;
    }
    
    if (items.length === 0) {
      Alert.alert('Error', 'Please add items to the cart');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create transaction items
      const transactionItems: TransactionItem[] = items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitSellingPrice: item.product.sellingPrice,
        unitCostPrice: item.product.costPrice || 0,
      }));
      
      // Create draft transaction
      const createResponse = await transactionService.create(currentBusiness.id, {
        items: transactionItems,
        paymentMethod: method,
        customerPhone: customerPhone || undefined,
      });
      
      // Lock transaction and generate receipt
      const lockResponse = await transactionService.lockTransaction(
        currentBusiness.id,
        createResponse.transaction.id
      );
      
      setReceipt(lockResponse.receipt);
      setIsReceiptModalVisible(true);
      clear(); // Clear cart
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to process transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewSale = () => {
    setIsReceiptModalVisible(false);
    setReceipt(null);
    clear();
  };

  const renderCartItem = ({ item }: { item: typeof items[0] }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <Text style={styles.cartItemPrice}>
          {formatCurrency(item.product.sellingPrice)} × {item.quantity}
        </Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity 
          style={styles.qtyButton}
          onPress={() => handleQuantityChange(item.product.id, -1)}
        >
          <Text style={styles.qtyButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity 
          style={styles.qtyButton}
          onPress={() => handleQuantityChange(item.product.id, 1)}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemTotal}>{formatCurrency(item.lineTotal)}</Text>
    </View>
  );

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={[styles.productCard, item.stockQty <= 0 && styles.productCardDisabled]}
      onPress={() => item.stockQty > 0 && handleAddToCart(item)}
      disabled={item.stockQty <= 0}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        {item.category && <Text style={styles.productCategory}>{item.category}</Text>}
      </View>
      <View style={styles.productPriceRow}>
        <Text style={styles.productPrice}>{formatCurrency(item.sellingPrice)}</Text>
        {item.stockQty <= 5 && item.stockQty > 0 && (
          <Text style={styles.lowStockBadge}>Only {item.stockQty} left</Text>
        )}
        {item.stockQty <= 0 && (
          <Text style={styles.outOfStockBadge}>Out of stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: '💵' },
    { id: 'mpesa', label: 'M-Pesa', icon: '📱' },
    { id: 'card', label: 'Card', icon: '💳' },
    { id: 'bank', label: 'Bank', icon: '🏦' },
  ] as const;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>New Sale</Text>
          <Text style={styles.headerSubtitle}>{user?.name || 'Cashier'}</Text>
        </View>
        <TouchableOpacity style={styles.catalogButton} onPress={() => setIsProductModalVisible(true)}>
          <Text style={styles.catalogButtonText}>📦 Catalog</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Section */}
      <View style={styles.cartSection}>
        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>Cart is empty</Text>
            <Text style={styles.emptyCartSubtext}>Tap "Catalog" to add items</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.product.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Payment Method */}
      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentGrid}>
          {paymentMethods.map((pm) => (
            <TouchableOpacity
              key={pm.id}
              style={[styles.paymentButton, method === pm.id && styles.paymentButtonActive]}
              onPress={() => setMethod(pm.id)}
            >
              <Text style={styles.paymentIcon}>{pm.icon}</Text>
              <Text style={[styles.paymentLabel, method === pm.id && styles.paymentLabelActive]}>
                {pm.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Customer Phone (for M-Pesa) */}
      {method === 'mpesa' && (
        <View style={styles.phoneSection}>
          <Text style={styles.sectionTitle}>Customer Phone</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="+254XXXXXXXXX"
            placeholderTextColor={Colors.textLight}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
        </View>
      )}

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Items</Text>
          <Text style={styles.totalValue}>{itemCount()}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total())}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.chargeButton, (items.length === 0 || isProcessing) && styles.chargeButtonDisabled]}
          onPress={handleGenerateReceipt}
          disabled={items.length === 0 || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.chargeButtonText}>
              Charge {formatCurrency(total())}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Product Catalog Modal */}
      <Modal
        visible={isProductModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsProductModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Product Catalog</Text>
            <TouchableOpacity onPress={() => setIsProductModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryList}
              contentContainerStyle={styles.categoryListContent}
            >
              <TouchableOpacity
                style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.productGrid}
              contentContainerStyle={styles.productList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No products found</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={isReceiptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReceiptModalVisible(false)}
      >
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>✓ Sale Complete</Text>
            </View>
            
            {receipt && (
              <View style={styles.receiptBody}>
                <Text style={styles.receiptBusiness}>{receipt.businessName}</Text>
                <Text style={styles.receiptDate}>
                  {new Date(receipt.createdAt).toLocaleString()}
                </Text>
                
                <View style={styles.receiptDivider} />
                
                <View style={styles.receiptItems}>
                  {receipt.items.map((item, idx) => (
                    <View key={idx} style={styles.receiptItem}>
                      <View style={styles.receiptItemLeft}>
                        <Text style={styles.receiptItemName}>{item.name}</Text>
                        <Text style={styles.receiptItemQty}>{item.quantity} × {formatCurrency(item.price)}</Text>
                      </View>
                      <Text style={styles.receiptItemTotal}>{formatCurrency(item.total)}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.receiptDivider} />
                
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Total</Text>
                  <Text style={styles.receiptTotalValue}>{formatCurrency(receipt.totalAmount)}</Text>
                </View>
                
                <View style={styles.receiptPaymentRow}>
                  <Text style={styles.receiptPaymentLabel}>Paid via</Text>
                  <Text style={styles.receiptPaymentValue}>
                    {receipt.paymentMethod === 'mpesa' ? 'M-Pesa' : 
                     receipt.paymentMethod === 'cash' ? 'Cash' :
                     receipt.paymentMethod === 'card' ? 'Card' : 'Bank Transfer'}
                  </Text>
                </View>
                
                <View style={styles.receiptTokenBox}>
                  <Text style={styles.receiptTokenLabel}>Receipt Token</Text>
                  <Text style={styles.receiptToken}>{receipt.token.slice(0, 16)}...</Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity style={styles.newSaleButton} onPress={handleNewSale}>
              <Text style={styles.newSaleButtonText}>New Sale</Text>
            </TouchableOpacity>
          </View>
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
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  catalogButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  catalogButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.sizes.sm,
  },
  cartSection: {
    flex: 1,
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: 12,
    padding: Spacing.md,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: Typography.sizes.lg,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  emptyCartSubtext: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  cartItemPrice: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  qtyText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: Spacing.md,
    minWidth: 24,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 80,
    textAlign: 'right',
  },
  paymentSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  paymentGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  paymentButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  paymentButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  paymentIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  paymentLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  phoneSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  bottomBar: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  totalLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  totalValue: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  chargeButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  chargeButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  chargeButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
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
  searchContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  categoryList: {
    maxHeight: 50,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryListContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    backgroundColor: Colors.background,
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
  productList: {
    padding: Spacing.md,
  },
  productGrid: {
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    minWidth: '47%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productInfo: {
    marginBottom: Spacing.md,
  },
  productName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: Typography.sizes.md,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  lowStockBadge: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
  },
  outOfStockBadge: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
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
  },
  // Receipt modal styles
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  receiptContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  receiptHeader: {
    backgroundColor: Colors.success,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  receiptTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  receiptBody: {
    padding: Spacing.lg,
  },
  receiptBusiness: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  receiptDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  receiptItems: {
    gap: Spacing.sm,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptItemLeft: {
    flex: 1,
  },
  receiptItemName: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  receiptItemQty: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  receiptItemTotal: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptTotalLabel: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  receiptTotalValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  receiptPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  receiptPaymentLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  receiptPaymentValue: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
  receiptTokenBox: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  receiptTokenLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginBottom: 4,
  },
  receiptToken: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  newSaleButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    margin: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  newSaleButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
  },
});
