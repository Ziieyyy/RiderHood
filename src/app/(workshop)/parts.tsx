import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import {
  Package,
  Plus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Trash2,
  X,
  History,
  Search,
  DollarSign,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  Check,
  Tag,
} from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop } from '../../services/workshopService';
import {
  getWorkshopProducts,
  getProductCategories,
  getProducts,
  createProduct,
  adjustWorkshopInventory,
  updateWorkshopProductPrice,
  updateWorkshopProductAvailability,
  getInventoryHistory,
  deleteProduct,
} from '../../services/productService';
import type {
  WorkshopProduct,
  ProductCategory,
  Product,
  InventoryTransaction,
} from '../../types/database';
import { useTranslation } from '../../i18n';
import { formatCategoryName } from '../../utils/categoryUtils';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';

export default function WorkshopPartsScreen() {
  const { t, language } = useTranslation();
  const { profile, user } = useAuth();
  const { isPhone, contentPadding } = useResponsive();

  const [workshopProducts, setWorkshopProducts] = useState<WorkshopProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [onlyAvailableFilter, setOnlyAvailableFilter] = useState(false);

  // Modals
  const [showStockModal, setShowStockModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWp, setSelectedWp] = useState<WorkshopProduct | null>(null);

  // Stock Adjustment State
  const [stockAction, setStockAction] = useState<'add' | 'remove' | 'set'>('add');
  const [stockQtyInput, setStockQtyInput] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [updatingStock, setUpdatingStock] = useState(false);

  // Price Edit State
  const [newPriceInput, setNewPriceInput] = useState('');
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Add Product State
  const [newProdName, setNewProdName] = useState('');
  const [newProdSpec, setNewProdSpec] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategoryId, setNewProdCategoryId] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('15');
  const [addingProduct, setAddingProduct] = useState(false);

  // Audit Log History State
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // ─── LOAD DATA ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (ws) {
        const [wpList, catList] = await Promise.all([
          getWorkshopProducts(ws.id, { onlyAvailable: false }),
          getProductCategories(true),
        ]);
        setWorkshopProducts(wpList);
        setCategories(catList);
      }
    } catch (err: any) {
      console.error('Error loading workshop parts inventory:', err);
      setError('Failed to load spare parts catalogue. Please pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── KPI COUNTERS ───────────────────────────────────────────
  const totalCount = workshopProducts.length;
  const inStockCount = workshopProducts.filter((p) => p.stock_status === 'IN_STOCK').length;
  const lowStockCount = workshopProducts.filter((p) => p.stock_status === 'LOW_STOCK').length;
  const outOfStockCount = workshopProducts.filter((p) => p.stock_status === 'OUT_OF_STOCK').length;

  // ─── FILTERED PRODUCTS ──────────────────────────────────────
  const filteredProducts = workshopProducts.filter((item) => {
    // Category filter
    if (selectedCategory !== 'All') {
      const catName = item.product?.category?.name || '';
      if (catName.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // Stock status filter
    if (statusFilter === 'in_stock' && item.stock_status !== 'IN_STOCK') return false;
    if (statusFilter === 'low_stock' && item.stock_status !== 'LOW_STOCK') return false;
    if (statusFilter === 'out_of_stock' && item.stock_status !== 'OUT_OF_STOCK') return false;

    // Availability filter
    if (onlyAvailableFilter && !item.is_available) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const n = (item.product?.name || '').toLowerCase();
      const s = (item.product?.specification || '').toLowerCase();
      const k = (item.product?.sku || '').toLowerCase();
      const c = (item.product?.category?.name || '').toLowerCase();
      if (!n.includes(q) && !s.includes(q) && !k.includes(q) && !c.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // ─── STOCK ADJUSTMENT HANDLER ───────────────────────────────
  const handleOpenStockModal = (wp: WorkshopProduct) => {
    setSelectedWp(wp);
    setStockAction('add');
    setStockQtyInput('');
    setStockReason('');
    setShowStockModal(true);
  };

  const handleSaveStockAdjustment = async () => {
    if (!selectedWp || !stockQtyInput.trim()) {
      Alert.alert('Validation', 'Please enter a valid quantity.');
      return;
    }

    const val = parseInt(stockQtyInput.trim(), 10);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Validation', 'Quantity must be a positive integer.');
      return;
    }

    setUpdatingStock(true);
    try {
      const updated = await adjustWorkshopInventory({
        workshopProductId: selectedWp.id,
        action: stockAction,
        quantity: val,
        reason: stockReason.trim() || `Manual inventory ${stockAction}`,
        userId: user?.id || profile?.id,
      });

      setWorkshopProducts((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      );
      setShowStockModal(false);
      Alert.alert('Stock Updated', `Inventory updated for ${selectedWp.product?.name || 'Product'}.`);
    } catch (err: any) {
      Alert.alert('Stock Update Error', err?.message || 'Failed to adjust stock quantity.');
    } finally {
      setUpdatingStock(false);
    }
  };

  // ─── PRICE EDIT HANDLER ─────────────────────────────────────
  const handleOpenPriceModal = (wp: WorkshopProduct) => {
    setSelectedWp(wp);
    setNewPriceInput(Number(wp.price).toFixed(2));
    setShowPriceModal(true);
  };

  const handleSavePrice = async () => {
    if (!selectedWp || !newPriceInput.trim()) {
      Alert.alert('Validation', 'Please enter a valid price.');
      return;
    }

    const val = parseFloat(newPriceInput.trim());
    if (isNaN(val) || val < 0) {
      Alert.alert('Validation', 'Price cannot be negative.');
      return;
    }

    setUpdatingPrice(true);
    try {
      const updated = await updateWorkshopProductPrice(selectedWp.id, val);
      setWorkshopProducts((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, price: val } : item))
      );
      setShowPriceModal(false);
      Alert.alert('Price Updated', `Price set to RM ${val.toFixed(2)}.`);
    } catch (err: any) {
      Alert.alert('Price Update Error', err?.message || 'Failed to update price.');
    } finally {
      setUpdatingPrice(false);
    }
  };

  // ─── TOGGLE AVAILABILITY HANDLER ────────────────────────────
  const handleToggleAvailability = async (wp: WorkshopProduct) => {
    const nextState = !wp.is_available;
    try {
      await updateWorkshopProductAvailability(wp.id, nextState);
      setWorkshopProducts((prev) =>
        prev.map((item) => (item.id === wp.id ? { ...item, is_available: nextState } : item))
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update availability status.');
    }
  };

  // ─── AUDIT HISTORY HANDLER ──────────────────────────────────
  const handleOpenHistoryModal = async (wp: WorkshopProduct) => {
    setSelectedWp(wp);
    setShowHistoryModal(true);
    setLoadingTransactions(true);
    try {
      const logs = await getInventoryHistory({
        workshopId: wp.workshop_id,
        productId: wp.product_id,
      });
      setTransactions(logs);
    } catch (err: any) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // ─── ADD NEW PRODUCT HANDLER ────────────────────────────────
  const handleAddProductSubmit = async () => {
    if (!newProdName.trim() || !newProdCategoryId) {
      Alert.alert('Required', 'Please provide a product name and select a category.');
      return;
    }
    const priceVal = parseFloat(newProdPrice.trim());
    if (isNaN(priceVal) || priceVal < 0) {
      Alert.alert('Required', 'Please provide a valid price (RM).');
      return;
    }

    setAddingProduct(true);
    try {
      const ws = await getMyWorkshop(profile?.id || '');
      if (!ws) throw new Error('Workshop profile not found.');

      // Generate stable SKU if missing
      const generatedSku =
        newProdSku.trim().toUpperCase() ||
        `PART-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // 1. Create in master products catalogue
      const createdProd = await createProduct({
        category_id: newProdCategoryId,
        name: newProdName.trim(),
        specification: newProdSpec.trim() || undefined,
        sku: generatedSku,
      });

      // 2. Adjust/Insert into workshop_products
      await loadData();

      setShowAddModal(false);
      setNewProdName('');
      setNewProdSpec('');
      setNewProdSku('');
      setNewProdPrice('');
      setNewProdStock('15');
      Alert.alert('Product Created', `Added ${createdProd.name} to catalogue and inventory.`);
    } catch (err: any) {
      Alert.alert('Add Product Error', err?.message || 'Failed to create product.');
    } finally {
      setAddingProduct(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <WorkshopAdminHeader
        title={t('workshopAdmin.manageSpareParts')}
        subtitle={`${workshopProducts.length} ${t('workshopAdmin.products')}`}
      />

      {/* KPI Stats Bar */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>{t('common.total').toUpperCase()}</Text>
          <Text style={styles.kpiValue}>{totalCount}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: COLORS.success }]}>{t('workshopAdmin.inStock').toUpperCase()}</Text>
          <Text style={[styles.kpiValue, { color: COLORS.success }]}>{inStockCount}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: COLORS.warning }]}>{t('workshopAdmin.lowStock').toUpperCase()}</Text>
          <Text style={[styles.kpiValue, { color: COLORS.warning }]}>{lowStockCount}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: COLORS.danger }]}>{t('workshopAdmin.outOfStock').toUpperCase()}</Text>
          <Text style={[styles.kpiValue, { color: COLORS.danger }]}>{outOfStockCount}</Text>
        </View>
      </View>

      {/* Top Search & Actions Bar */}
      <View style={styles.topBarContainer}>
        <View style={styles.searchWrapper}>
          <Search color={COLORS.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search')}
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={COLORS.textMuted} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
        >
          <Plus color="#FFFFFF" size={16} />
          <Text style={styles.addBtnText}>+ {t('workshopAdmin.addProduct')}</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Horizontal Scroll */}
      <View style={styles.categoryScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === 'All' && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('All')}
          >
            <Text style={[styles.categoryChipText, selectedCategory === 'All' && styles.categoryChipTextActive]}>
              {t('common.all')}
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.name && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.name)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat.name && styles.categoryChipTextActive]}>
                {formatCategoryName(cat.name, language)}
              </Text>
            </TouchableOpacity>
          ))}

        </ScrollView>
      </View>

      {/* Stock Status Filter Chips */}
      <View style={styles.filterChipRow}>
        {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, statusFilter === st && styles.activeFilterChip]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[styles.filterChipText, statusFilter === st && styles.activeFilterChipText]}>
              {st === 'all'
                ? t('common.all').toUpperCase()
                : st === 'in_stock'
                ? t('workshopAdmin.inStock').toUpperCase()
                : st === 'low_stock'
                ? t('workshopAdmin.lowStock').toUpperCase()
                : t('workshopAdmin.outOfStock').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Product Inventory List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        <ResponsiveContainer>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Package color={COLORS.textMuted} size={48} />
              <Text style={styles.emptyTitle}>{t('empty.noSpareParts')}</Text>
              <Text style={styles.emptyDesc}>{t('empty.noSparePartsSub')}</Text>
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {filteredProducts.map((item) => {
                const isLow = item.stock_status === 'LOW_STOCK';
                const isOut = item.stock_status === 'OUT_OF_STOCK';

                return (
                  <View key={item.id} style={[styles.productCard, !item.is_available && styles.disabledCard]}>
                    {/* Card Top: Title, Category & Price */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.productName} numberOfLines={1}>{item.product?.name || 'Spare Part'}</Text>
                          {!item.is_available && (
                            <View style={styles.disabledBadge}>
                              <Text style={styles.disabledBadgeText}>DISABLED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.productMeta} numberOfLines={1}>
                          {formatCategoryName(item.product?.category?.name || 'General', language)}
                          {item.product?.specification ? ` • Spec: ${item.product.specification}` : ''}
                        </Text>

                        <Text style={styles.skuText} numberOfLines={1}>SKU: {item.product?.sku || 'N/A'}</Text>
                      </View>

                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>PRICE</Text>
                        <Text style={styles.priceValue}>RM {Number(item.price).toFixed(2)}</Text>
                        <TouchableOpacity
                          style={styles.editPriceLink}
                          onPress={() => handleOpenPriceModal(item)}
                        >
                          <Edit3 color={COLORS.primary} size={11} />
                          <Text style={styles.editPriceText}>Edit Price</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Card Bottom: Stock Status & Action Buttons */}
                    <View style={styles.cardFooter}>
                      {/* Stock Status Pill */}
                      <View
                        style={[
                          styles.stockStatusBadge,
                          isOut
                            ? styles.badgeOut
                            : isLow
                            ? styles.badgeLow
                            : styles.badgeIn,
                        ]}
                      >
                        {isOut ? (
                          <AlertTriangle color={COLORS.danger} size={13} />
                        ) : isLow ? (
                          <AlertTriangle color={COLORS.warning} size={13} />
                        ) : (
                          <CheckCircle2 color={COLORS.success} size={13} />
                        )}
                        <Text
                          style={[
                            styles.stockStatusText,
                            { color: isOut ? COLORS.danger : isLow ? COLORS.warning : COLORS.success },
                          ]}
                          numberOfLines={1}
                        >
                          {item.stock_quantity} in stock
                        </Text>
                      </View>

                      {/* Actions Row */}
                      <View style={styles.actionBtnRow}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleOpenHistoryModal(item)}
                          accessibilityLabel="View audit history"
                        >
                          <History color={COLORS.textSecondary} size={15} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.adjustStockBtn}
                          onPress={() => handleOpenStockModal(item)}
                        >
                          <Sliders color="#FFFFFF" size={13} />
                          <Text style={styles.adjustStockBtnText}>Adjust Stock</Text>
                        </TouchableOpacity>

                        {/* Available Toggle Switch */}
                        <Switch
                          value={item.is_available}
                          onValueChange={() => handleToggleAvailability(item)}
                          trackColor={{ false: COLORS.surfaceContainer, true: COLORS.primary }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </ResponsiveGrid>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* ─── MODAL 1: STOCK ADJUSTMENT ───────────────────────── */}
      <Modal visible={showStockModal} transparent animationType="fade" onRequestClose={() => setShowStockModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Product Stock</Text>
              <TouchableOpacity onPress={() => setShowStockModal(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            {selectedWp && (
              <View style={styles.modalProductHeader}>
                <Text style={styles.modalProdName}>{selectedWp.product?.name}</Text>
                <Text style={styles.modalProdMeta}>
                  SKU: {selectedWp.product?.sku} • Current Stock: {selectedWp.stock_quantity}
                </Text>
              </View>
            )}

            {/* Action Segment Switcher */}
            <View style={styles.actionSegmentRow}>
              {(['add', 'remove', 'set'] as const).map((act) => (
                <TouchableOpacity
                  key={act}
                  style={[styles.segmentBtn, stockAction === act && styles.segmentBtnActive]}
                  onPress={() => setStockAction(act)}
                >
                  <Text style={[styles.segmentBtnText, stockAction === act && styles.segmentBtnTextActive]}>
                    {act === 'add' ? '+ Add Stock' : act === 'remove' ? '- Deduct' : '= Set Total'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {stockAction === 'set' ? 'NEW TOTAL QUANTITY *' : 'QUANTITY TO CHANGE *'}
              </Text>
              <TextInput
                style={styles.input}
                value={stockQtyInput}
                onChangeText={setStockQtyInput}
                placeholder="e.g. 10"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>REASON / AUDIT NOTE</Text>
              <TextInput
                style={styles.input}
                value={stockReason}
                onChangeText={setStockReason}
                placeholder="e.g. Weekly Restock / Over-the-counter sales"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <CustomButton
              title={updatingStock ? 'UPDATING...' : 'CONFIRM INVENTORY UPDATE'}
              onPress={handleSaveStockAdjustment}
              disabled={updatingStock}
              style={{ marginTop: 8 }}
            />
            <CustomButton title="Cancel" variant="secondary" onPress={() => setShowStockModal(false)} />
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 2: EDIT PRICE ─────────────────────────────── */}
      <Modal visible={showPriceModal} transparent animationType="fade" onRequestClose={() => setShowPriceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Workshop Price</Text>
              <TouchableOpacity onPress={() => setShowPriceModal(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            {selectedWp && (
              <View style={styles.modalProductHeader}>
                <Text style={styles.modalProdName}>{selectedWp.product?.name}</Text>
                <Text style={styles.modalProdMeta}>
                  Category: {formatCategoryName(selectedWp.product?.category?.name || '', language)} • SKU: {selectedWp.product?.sku}
                </Text>

              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WORKSHOP PRICE (RM) *</Text>
              <TextInput
                style={styles.input}
                value={newPriceInput}
                onChangeText={setNewPriceInput}
                placeholder="e.g. 28.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
            </View>

            <CustomButton
              title={updatingPrice ? 'SAVING...' : 'UPDATE PRICE'}
              onPress={handleSavePrice}
              disabled={updatingPrice}
              style={{ marginTop: 8 }}
            />
            <CustomButton title="Cancel" variant="secondary" onPress={() => setShowPriceModal(false)} />
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 3: INVENTORY AUDIT LOGS ───────────────────── */}
      <Modal visible={showHistoryModal} transparent animationType="fade" onRequestClose={() => setShowHistoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inventory Audit Trail</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            {selectedWp && (
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 12 }}>
                Product: {selectedWp.product?.name} ({selectedWp.product?.sku})
              </Text>
            )}

            <ScrollView style={{ maxHeight: 350 }}>
              {loadingTransactions ? (
                <ActivityIndicator color={COLORS.primary} size="small" style={{ marginVertical: 20 }} />
              ) : transactions.length === 0 ? (
                <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginVertical: 20, fontSize: 13 }}>
                  No previous inventory transactions logged for this item.
                </Text>
              ) : (
                transactions.map((tx) => (
                  <View key={tx.id} style={styles.auditItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.auditType}>
                        {tx.transaction_type?.toUpperCase() || 'ADJUSTMENT'}
                        {tx.quantity_change ? ` (${tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change})` : ''}
                      </Text>
                      <Text style={styles.auditReason}>{tx.reason || 'Inventory update'}</Text>
                      <Text style={styles.auditDate}>{new Date(tx.created_at).toLocaleString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.auditQty}>
                        {tx.previous_quantity} → {tx.new_quantity}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <CustomButton title="Close" variant="secondary" onPress={() => setShowHistoryModal(false)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 4: ADD NEW PRODUCT ────────────────────────── */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product to Catalogue</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CATEGORY *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.smallCatChip, newProdCategoryId === c.id && styles.smallCatChipActive]}
                      onPress={() => setNewProdCategoryId(c.id)}
                    >
                      <Text style={[styles.smallCatChipText, newProdCategoryId === c.id && styles.smallCatChipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PRODUCT NAME *</Text>
                <TextInput
                  style={styles.input}
                  value={newProdName}
                  onChangeText={setNewProdName}
                  placeholder="e.g. Minyak Hitam 10W-40 Synthetic"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SPECIFICATION</Text>
                <TextInput
                  style={styles.input}
                  value={newProdSpec}
                  onChangeText={setNewProdSpec}
                  placeholder="e.g. 10W-40 Semi-Synthetic"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SKU CODE (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  value={newProdSku}
                  onChangeText={setNewProdSku}
                  placeholder="e.g. OIL-10W40-SEMI"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WORKSHOP PRICE (RM) *</Text>
                <TextInput
                  style={styles.input}
                  value={newProdPrice}
                  onChangeText={setNewProdPrice}
                  placeholder="e.g. 40.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <CustomButton
              title={addingProduct ? 'CREATING...' : 'ADD TO CATALOGUE'}
              onPress={handleAddProductSubmit}
              disabled={addingProduct}
              style={{ marginTop: 12 }}
            />
            <CustomButton title="Cancel" variant="secondary" onPress={() => setShowAddModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  topBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  categoryScrollWrapper: {
    paddingBottom: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  activeFilterChipText: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 60,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  disabledCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  productName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  productMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  skuText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  disabledBadge: {
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disabledBadgeText: {
    color: COLORS.danger,
    fontSize: 9,
    fontWeight: '800',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  priceValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  editPriceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  editPriceText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeIn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: COLORS.success,
  },
  badgeLow: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: COLORS.warning,
  },
  badgeOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: COLORS.danger,
  },
  stockStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adjustStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  adjustStockBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  modalProductHeader: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalProdName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  modalProdMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  actionSegmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    color: COLORS.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  auditItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditType: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  auditReason: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  auditDate: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  auditQty: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  smallCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  smallCatChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  smallCatChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  smallCatChipTextActive: {
    color: '#FFFFFF',
  },
});
