import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useBusinessStore } from '@/store/business.store';
import { productService, type CreateProductRequest } from '@/services/product.service';
import { stockService, type StockMovement, type StockDiscrepancy } from '@/services/stock.service';
import { Colors, Typography, Spacing } from '@/styles/theme';
import type { Product } from '@/types/models';

type TabType = 'all' | 'low' | 'history';

export default function StockScreen() {
  const { currentBusiness } = useBusinessStore();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isReceiveModalVisible, setIsReceiveModalVisible] = useState(false);
  const [isAdjustModalVisible, setIsAdjustModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Form states
  const [newProduct, setNewProduct] = useState<Partial<CreateProductRequest>>({
    name: '',
    category: '',
    sellingPrice: 0,
    costPrice: 0,
    stockQty: 0,
    reorderLevel: 10,
  });
  const [receiveQuantity, setReceiveQuantity] = useState('');
  const [receiveCost, setReceiveCost] = useState('');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('correction');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Physical count & movements states
  const [isCountModalVisible, setIsCountModalVisible] = useState(false);
  const [countQuantities, setCountQuantities] = useState<Record<string, number>>({});
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [discrepancies, setDiscrepancies] = useState<StockDiscrepancy[]>([]);
  const [shrinkageRate, setShrinkageRate] = useState<number | null>(null);
  const [showMovements, setShowMovements] = useState(false);
  const [showShrinkage, setShowShrinkage] = useState(false);

  // Load products
  const loadProducts = useCallback(async () => {
    if (!currentBusiness?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [allResponse, lowResponse] = await Promise.all([
        productService.getAll(currentBusiness.id, { isActive: true }),
        productService.getLowStock(currentBusiness.id),
      ]);
      
      setProducts(allResponse.products || []);
      setLowStockProducts(lowResponse.products || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id]);

  // Load stock movements
  const loadStockMovements = useCallback(async () => {
    if (!currentBusiness?.id) return;
    try {
      const response = await stockService.getMovements(currentBusiness.id, { limit: 50 });
      setStockMovements(response.movements || []);
    } catch (err: any) {
      console.error('Failed to load stock movements:', err);
    }
  }, [currentBusiness?.id]);

  // Load discrepancies
  const loadDiscrepancies = useCallback(async () => {
    if (!currentBusiness?.id) return;
    try {
      const response = await stockService.getDiscrepancies(currentBusiness.id, { status: 'open' });
      setDiscrepancies(response.discrepancies || []);
    } catch (err: any) {
      console.error('Failed to load discrepancies:', err);
    }
  }, [currentBusiness?.id]);

  // Load shrinkage
  const loadShrinkage = useCallback(async () => {
    if (!currentBusiness?.id) return;
    try {
      const response = await stockService.getShrinkage(currentBusiness.id);
      setShrinkageRate(response.shrinkageRate);
    } catch (err: any) {
      console.error('Failed to load shrinkage:', err);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadProducts();
    loadDiscrepancies();
    loadShrinkage();
  }, [loadProducts, loadDiscrepancies, loadShrinkage]);

  // Filter products based on search
  const filteredProducts = searchQuery
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : products;

  const displayProducts = activeTab === 'low' ? lowStockProducts : filteredProducts;

  const handleAddProduct = async () => {
    if (!currentBusiness?.id) return;
    if (!newProduct.name || !newProduct.sellingPrice) {
      Alert.alert('Error', 'Please enter product name and selling price');
      return;
    }
    
    setIsLoading(true);
    try {
      await productService.create(currentBusiness.id, {
        name: newProduct.name,
        category: newProduct.category,
        sellingPrice: newProduct.sellingPrice,
        costPrice: newProduct.costPrice || 0,
        stockQty: newProduct.stockQty || 0,
        reorderLevel: newProduct.reorderLevel || 10,
      });
      
      setIsAddModalVisible(false);
      setNewProduct({
        name: '',
        category: '',
        sellingPrice: 0,
        costPrice: 0,
        stockQty: 0,
        reorderLevel: 10,
      });
      loadProducts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiveStock = async () => {
    if (!currentBusiness?.id || !selectedProduct) return;
    
    const qty = parseInt(receiveQuantity, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    
    setIsLoading(true);
    try {
      await productService.receiveStock(
        currentBusiness.id,
        selectedProduct.id,
        qty,
        receiveCost ? parseInt(receiveCost, 10) : undefined
      );
      
      setIsReceiveModalVisible(false);
      setReceiveQuantity('');
      setReceiveCost('');
      setSelectedProduct(null);
      loadProducts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to receive stock');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!currentBusiness?.id || !selectedProduct) return;
    
    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty)) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    
    setIsLoading(true);
    try {
      await productService.adjustStock(
        currentBusiness.id,
        selectedProduct.id,
        qty,
        adjustReason,
        adjustNotes
      );
      
      setIsAdjustModalVisible(false);
      setAdjustQuantity('');
      setAdjustNotes('');
      setSelectedProduct(null);
      loadProducts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to adjust stock');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle physical count with discrepancy detection
  const handlePhysicalCount = async () => {
    if (!currentBusiness?.id) return;
    
    const countEntries = Object.entries(countQuantities).filter(([_, qty]) => !isNaN(qty));
    if (countEntries.length === 0) {
      Alert.alert('Error', 'Please enter quantities for at least one product');
      return;
    }
    
    setIsLoading(true);
    try {
      const counts = countEntries.map(([productId, actualQty]) => ({
        productId,
        actualQty,
      }));
      
      const response = await stockService.submitCount(currentBusiness.id, { counts });
      
      setIsCountModalVisible(false);
      setCountQuantities({});
      loadProducts();
      loadDiscrepancies();
      
      // Show summary of discrepancies found
      if (response.summary.withVariance > 0) {
        Alert.alert(
          'Count Complete',
          `Found ${response.summary.withVariance} discrepancies totaling ${response.summary.totalGapValue} KES in gap value.`
        );
      } else {
        Alert.alert('Count Complete', 'No discrepancies found. Stock matches expected quantities.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit stock count');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          {item.category && <Text style={styles.productCategory}>{item.category}</Text>}
        </View>
        <View style={styles.stockBadge}>
          <Text style={[
            styles.stockText,
            item.stockQty <= item.reorderLevel && styles.stockTextLow
          ]}>
            {item.stockQty} {item.unit || 'pcs'}
          </Text>
        </View>
      </View>
      
      <View style={styles.productDetails}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Selling:</Text>
          <Text style={styles.priceValue}>{formatCurrency(item.sellingPrice)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Cost:</Text>
          <Text style={styles.priceValue}>{formatCurrency(item.costPrice || 0)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Margin:</Text>
          <Text style={styles.marginValue}>
            {item.sellingPrice > 0 
              ? Math.round(((item.sellingPrice - (item.costPrice || 0)) / item.sellingPrice) * 100)
              : 0}%
          </Text>
        </View>
      </View>
      
      <View style={styles.productActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.receiveButton]}
          onPress={() => {
            setSelectedProduct(item);
            setIsReceiveModalVisible(true);
          }}
        >
          <Text style={styles.receiveButtonText}>+ Receive</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.adjustButton]}
          onPress={() => {
            setSelectedProduct(item);
            setIsAdjustModalVisible(true);
          }}
        >
          <Text style={styles.adjustButtonText}>Adjust</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stock & Inventory</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            ⚠️ {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} low on stock
          </Text>
        </View>
      )}

      {/* Discrepancies Alert */}
      {discrepancies.length > 0 && (
        <TouchableOpacity 
          style={[styles.alertBanner, styles.discrepancyBanner]}
          onPress={() => setShowShrinkage(true)}
        >
          <Text style={[styles.alertText, styles.discrepancyText]}>
            🚨 {discrepancies.length} stock discrepanc{discrepancies.length > 1 ? 'ies' : 'y'} detected
          </Text>
          <Text style={styles.discrepancySubtext}>
            Tap to investigate shrinkage
          </Text>
        </TouchableOpacity>
      )}

      {/* Shrinkage Analytics Card */}
      {shrinkageRate !== null && (
        <View style={styles.shrinkageCard}>
          <View style={styles.shrinkageRow}>
            <Text style={styles.shrinkageLabel}>Weekly Shrinkage Rate</Text>
            <Text style={[
              styles.shrinkageValue,
              shrinkageRate > 5 ? styles.shrinkageHigh : shrinkageRate > 2 ? styles.shrinkageMedium : styles.shrinkageLow
            ]}>
              {shrinkageRate.toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.shrinkageSubtext}>
            {shrinkageRate > 5 
              ? 'High shrinkage affecting passport score. Review discrepancies.' 
              : shrinkageRate > 2 
                ? 'Moderate shrinkage. Monitor stock counts.' 
                : 'Good stock control. Keep it up!'}
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionChip}
          onPress={() => setIsCountModalVisible(true)}
        >
          <Text style={styles.actionChipIcon}>📋</Text>
          <Text style={styles.actionChipText}>Physical Count</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionChip}
          onPress={() => {
            loadStockMovements();
            setShowMovements(true);
          }}
        >
          <Text style={styles.actionChipIcon}>📈</Text>
          <Text style={styles.actionChipText}>Movements</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({products.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'low' && styles.tabActive]}
          onPress={() => setActiveTab('low')}
        >
          <Text style={[styles.tabText, activeTab === 'low' && styles.tabTextActive]}>
            Low Stock ({lowStockProducts.length})
          </Text>
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

      {/* Product List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'low' ? 'No low stock items' : 'No products found'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add Product Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Product</Text>
            <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Product Name *</Text>
            <TextInput
              style={styles.formInput}
              value={newProduct.name}
              onChangeText={(text) => setNewProduct({...newProduct, name: text})}
              placeholder="Enter product name"
              placeholderTextColor={Colors.textLight}
            />
            
            <Text style={styles.formLabel}>Category</Text>
            <TextInput
              style={styles.formInput}
              value={newProduct.category}
              onChangeText={(text) => setNewProduct({...newProduct, category: text})}
              placeholder="e.g., Electronics, Food, etc."
              placeholderTextColor={Colors.textLight}
            />
            
            <View style={styles.formRow}>
              <View style={styles.formFieldHalf}>
                <Text style={styles.formLabel}>Selling Price (KES) *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newProduct.sellingPrice ? newProduct.sellingPrice.toString() : ''}
                  onChangeText={(text) => setNewProduct({...newProduct, sellingPrice: parseInt(text) || 0})}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.formFieldHalf}>
                <Text style={styles.formLabel}>Cost Price (KES)</Text>
                <TextInput
                  style={styles.formInput}
                  value={newProduct.costPrice ? newProduct.costPrice.toString() : ''}
                  onChangeText={(text) => setNewProduct({...newProduct, costPrice: parseInt(text) || 0})}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            
            <View style={styles.formRow}>
              <View style={styles.formFieldHalf}>
                <Text style={styles.formLabel}>Initial Stock</Text>
                <TextInput
                  style={styles.formInput}
                  value={newProduct.stockQty ? newProduct.stockQty.toString() : ''}
                  onChangeText={(text) => setNewProduct({...newProduct, stockQty: parseInt(text) || 0})}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.formFieldHalf}>
                <Text style={styles.formLabel}>Reorder Level</Text>
                <TextInput
                  style={styles.formInput}
                  value={newProduct.reorderLevel ? newProduct.reorderLevel.toString() : ''}
                  onChangeText={(text) => setNewProduct({...newProduct, reorderLevel: parseInt(text) || 10})}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleAddProduct}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Add Product</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receive Stock Modal */}
      <Modal
        visible={isReceiveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReceiveModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.smallModal}>
            <Text style={styles.modalTitle}>Receive Stock</Text>
            {selectedProduct && (
              <Text style={styles.modalSubtitle}>{selectedProduct.name}</Text>
            )}
            
            <Text style={styles.formLabel}>Quantity to Add</Text>
            <TextInput
              style={styles.formInput}
              value={receiveQuantity}
              onChangeText={setReceiveQuantity}
              keyboardType="number-pad"
              placeholder="Enter quantity"
              placeholderTextColor={Colors.textLight}
            />
            
            <Text style={styles.formLabel}>Unit Cost (optional)</Text>
            <TextInput
              style={styles.formInput}
              value={receiveCost}
              onChangeText={setReceiveCost}
              keyboardType="number-pad"
              placeholder="Enter unit cost"
              placeholderTextColor={Colors.textLight}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsReceiveModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleReceiveStock}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Receive</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        visible={isAdjustModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAdjustModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.smallModal}>
            <Text style={styles.modalTitle}>Adjust Stock</Text>
            {selectedProduct && (
              <Text style={styles.modalSubtitle}>{selectedProduct.name}</Text>
            )}
            
            <Text style={styles.formLabel}>Adjustment (+/-)</Text>
            <TextInput
              style={styles.formInput}
              value={adjustQuantity}
              onChangeText={setAdjustQuantity}
              keyboardType="number-pad"
              placeholder="e.g., -5 or +10"
              placeholderTextColor={Colors.textLight}
            />
            
            <Text style={styles.formLabel}>Reason</Text>
            <View style={styles.reasonButtons}>
              {['correction', 'damage', 'return', 'other'].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonButton, adjustReason === reason && styles.reasonButtonActive]}
                  onPress={() => setAdjustReason(reason)}
                >
                  <Text style={[styles.reasonText, adjustReason === reason && styles.reasonTextActive]}>
                    {reason.charAt(0).toUpperCase() + reason.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.formLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.formInput}
              value={adjustNotes}
              onChangeText={setAdjustNotes}
              placeholder="Enter notes"
              placeholderTextColor={Colors.textLight}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsAdjustModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAdjustStock}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Adjust</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stock Movements Modal */}
      <Modal
        visible={showMovements}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMovements(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Stock Movements</Text>
            <TouchableOpacity onPress={() => setShowMovements(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={stockMovements}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.movementsList}
            renderItem={({ item }) => (
              <View style={styles.movementRow}>
                <View style={styles.movementLeft}>
                  <Text style={styles.movementProduct}>{item.productName}</Text>
                  <Text style={styles.movementType}>{item.type}</Text>
                  <Text style={styles.movementDate}>
                    {new Date(item.createdAt).toLocaleDateString('en-KE')}
                  </Text>
                </View>
                <View style={styles.movementRight}>
                  <Text style={[
                    styles.movementQty,
                    item.quantity > 0 ? styles.movementIn : styles.movementOut
                  ]}>
                    {item.quantity > 0 ? '+' : ''}{item.quantity}
                  </Text>
                  <Text style={styles.movementBalance}>
                    {item.previousQty} → {item.newQty}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No stock movements recorded</Text>
            }
          />
        </View>
      </Modal>

      {/* Physical Count Modal */}
      <Modal
        visible={isCountModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsCountModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Physical Stock Count</Text>
            <TouchableOpacity onPress={() => setIsCountModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.countContainer}>
            <Text style={styles.countInstructions}>
              Enter the actual quantity for each product. Nest will compare with expected stock and generate discrepancies for any variances.
            </Text>
            
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.countRow}>
                  <View style={styles.countProductInfo}>
                    <Text style={styles.countProductName}>{item.name}</Text>
                    <Text style={styles.countExpected}>Expected: {item.stockQty} {item.unit || 'pcs'}</Text>
                  </View>
                  <TextInput
                    style={styles.countInput}
                    keyboardType="number-pad"
                    placeholder="Qty"
                    value={countQuantities[item.id]?.toString() || ''}
                    onChangeText={(text) => {
                      const qty = parseInt(text, 10);
                      setCountQuantities(prev => ({
                        ...prev,
                        [item.id]: isNaN(qty) ? 0 : qty
                      }));
                    }}
                  />
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No products to count</Text>
              }
            />
            
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handlePhysicalCount}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Count & Check Discrepancies</Text>
              )}
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
  alertBanner: {
    backgroundColor: Colors.error + '15',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  alertText: {
    color: Colors.error,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.white,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchInput: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productList: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  productCategory: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  stockBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  stockText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.success,
  },
  stockTextLow: {
    color: Colors.error,
  },
  productDetails: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priceLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  priceValue: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  marginValue: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.success,
  },
  productActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  receiveButton: {
    backgroundColor: Colors.success + '15',
    borderColor: Colors.success,
  },
  receiveButtonText: {
    color: Colors.success,
    fontWeight: '600',
  },
  adjustButton: {
    backgroundColor: Colors.warning + '15',
    borderColor: Colors.warning,
  },
  adjustButtonText: {
    color: Colors.warning,
    fontWeight: '600',
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
  modalSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    textAlign: 'center',
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
  formRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  formFieldHalf: {
    flex: 1,
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  smallModal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  reasonButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  reasonButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  reasonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  reasonTextActive: {
    color: Colors.white,
  },
  // Discrepancies & Shrinkage styles
  discrepancyBanner: {
    backgroundColor: Colors.error + '20',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  discrepancyText: {
    color: Colors.error,
    fontWeight: 'bold',
  },
  discrepancySubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  shrinkageCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shrinkageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  shrinkageLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
  shrinkageValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
  },
  shrinkageHigh: {
    color: Colors.error,
  },
  shrinkageMedium: {
    color: '#F59E0B', // amber
  },
  shrinkageLow: {
    color: Colors.success,
  },
  shrinkageSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
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
  // Physical Count Modal styles
  countContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  countInstructions: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countProductInfo: {
    flex: 1,
  },
  countProductName: {
    fontSize: Typography.sizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  countExpected: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  countInput: {
    width: 80,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Stock Movements styles
  movementsList: {
    padding: Spacing.lg,
  },
  movementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  movementLeft: {
    flex: 1,
  },
  movementProduct: {
    fontSize: Typography.sizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  movementType: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textTransform: 'capitalize',
    marginTop: Spacing.xs,
  },
  movementDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  movementRight: {
    alignItems: 'flex-end',
  },
  movementQty: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
  },
  movementIn: {
    color: Colors.success,
  },
  movementOut: {
    color: Colors.error,
  },
  movementBalance: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
});
