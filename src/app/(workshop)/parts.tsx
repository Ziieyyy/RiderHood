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
} from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop } from '../../services/workshopService';
import {
  getWorkshopParts,
  createPart,
  updateStockQuantity,
  softDeletePart,
  getInventoryTransactions,
  InventoryTransaction,
} from '../../services/partsService';
import type { Part } from '../../types/database';

export default function WorkshopPartsScreen() {
  const { profile } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  // Add Part Form
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Update Stock Form
  const [changeType, setChangeType] = useState<'add' | 'remove' | 'set'>('add');
  const [qtyValue, setQtyValue] = useState('');
  const [reason, setReason] = useState('');
  const [updatingStock, setUpdatingStock] = useState(false);

  // Audit Log Transactions
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (ws) {
        const data = await getWorkshopParts(ws.id, { onlyAvailable: false });
        setParts(data);
      }
    } catch {
      setError('Failed to load parts inventory. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPart = async () => {
    if (!name.trim() || !profile?.id) return;
    setAddLoading(true);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (!ws) throw new Error('No workshop found');

      const created = await createPart({
        workshop_id: ws.id,
        name: name.trim(),
        sku: sku.trim() || undefined,
        category: category.trim() || undefined,
        stock_quantity: parseInt(stock) || 0,
        price: parseFloat(price) || 0,
      });
      setParts([created, ...parts]);
      setName('');
      setSku('');
      setCategory('');
      setStock('');
      setPrice('');
      setShowAddModal(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add part.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenStockModal = (part: Part) => {
    setSelectedPart(part);
    setChangeType('add');
    setQtyValue('');
    setReason('');
    setShowStockModal(true);
  };

  const handleSaveStockUpdate = async () => {
    if (!selectedPart || !qtyValue || !profile?.id) {
      Alert.alert('Validation Error', 'Please enter a valid quantity value.');
      return;
    }
    const val = parseInt(qtyValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Validation Error', 'Quantity must be a positive integer.');
      return;
    }

    setUpdatingStock(true);
    try {
      const updated = await updateStockQuantity(
        selectedPart,
        changeType,
        val,
        reason || undefined,
        profile.id
      );

      setParts(parts.map((p) => (p.id === updated.id ? updated : p)));
      setShowStockModal(false);
      Alert.alert('Stock Updated', `Successfully updated stock for ${selectedPart.name}.`);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Failed to update stock quantity.');
    } finally {
      setUpdatingStock(false);
    }
  };

  const handleDeletePart = (part: Part) => {
    Alert.alert('Delete Part', `Are you sure you want to remove ${part.name} from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await softDeletePart(part.id);
            setParts(parts.filter((p) => p.id !== part.id));
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete part.');
          }
        },
      },
    ]);
  };

  const handleViewHistory = async (part: Part) => {
    setSelectedPart(part);
    setShowHistoryModal(true);
    setLoadingTransactions(true);
    try {
      const data = await getInventoryTransactions(part.id);
      setTransactions(data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch inventory transaction logs.');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const filteredParts = parts.filter((part) => {
    if (statusFilter === 'low_stock') {
      if (part.stock_status !== 'LOW_STOCK') return false;
    } else if (statusFilter === 'out_of_stock') {
      if ((part.stock_quantity ?? 0) > 0) return false;
    } else if (statusFilter === 'in_stock') {
      if ((part.stock_quantity ?? 0) <= 0) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const n = (part.name || '').toLowerCase();
      const s = (part.sku || '').toLowerCase();
      const c = (part.category || '').toLowerCase();
      if (!n.includes(q) && !s.includes(q) && !c.includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Parts Inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <WorkshopAdminHeader
        title="Parts Inventory"
        subtitle={`${parts.length} Total Inventory Items`}
      />

      {/* Top Search & Actions Bar */}
      <View style={styles.topBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search color={COLORS.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search part name, SKU code, or category..."
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
          activeOpacity={0.8}
        >
          <Plus color="#FFFFFF" size={16} />
          <Text style={styles.addBtnText}>Add Part</Text>
        </TouchableOpacity>
      </View>

      {/* Stock Filter Chips */}
      <View style={styles.filterChipRow}>
        {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, statusFilter === st && styles.activeFilterChip]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[styles.filterChipText, statusFilter === st && styles.activeFilterChipText]}>
              {st.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Parts List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {filteredParts.length === 0 ? (
          <View style={styles.emptyState}>
            <Package color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>No inventory parts match filter</Text>
            <Text style={styles.emptyDesc}>Try adjusting search criteria or add new parts to your inventory.</Text>
          </View>
        ) : (
          filteredParts.map((part) => (
            <View key={part.id} style={styles.partCard}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partName}>{part.name}</Text>
                  <Text style={styles.partSku}>
                    {part.sku ? `SKU: ${part.sku}` : 'No SKU'}
                    {part.category ? ` • ${part.category}` : ''}
                  </Text>
                </View>
                <Text style={styles.partPrice}>RM {Number(part.price ?? part.unit_price ?? 0).toFixed(2)}</Text>
              </View>

              <View style={styles.stockRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {(part.stock_quantity ?? 0) > 0 ? (
                    <View
                      style={[
                        styles.stockBadge,
                        part.stock_status === 'LOW_STOCK'
                          ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: COLORS.warning }
                          : { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: COLORS.success },
                      ]}
                    >
                      {part.stock_status === 'LOW_STOCK' ? (
                        <AlertTriangle color={COLORS.warning} size={12} />
                      ) : (
                        <CheckCircle2 color={COLORS.success} size={12} />
                      )}
                      <Text
                        style={[
                          styles.stockText,
                          { color: part.stock_status === 'LOW_STOCK' ? COLORS.warning : COLORS.success },
                        ]}
                      >
                        {part.stock_quantity} {part.stock_status === 'LOW_STOCK' ? 'LOW STOCK' : 'IN STOCK'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.outStockBadge}>
                      <AlertTriangle color={COLORS.danger} size={12} />
                      <Text style={styles.outStockText}>OUT OF STOCK</Text>
                    </View>
                  )}
                </View>

                <View style={styles.partActionRow}>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => handleViewHistory(part)}>
                    <History color={COLORS.textSecondary} size={16} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.updateStockBtn} onPress={() => handleOpenStockModal(part)}>
                    <Edit3 color="#FFFFFF" size={12} />
                    <Text style={styles.updateStockText}>STOCK</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => handleDeletePart(part)}>
                    <Trash2 color={COLORS.danger} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Part Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Inventory Part</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PART NAME *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Brembo Front Brake Pad Set"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SKU CODE</Text>
              <TextInput
                style={styles.input}
                value={sku}
                onChangeText={setSku}
                placeholder="e.g. BRK-BM-001"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CATEGORY</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="e.g. Brakes / Engine Oils / Filters"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>INITIAL STOCK QUANTITY</Text>
              <TextInput
                style={styles.input}
                value={stock}
                onChangeText={setStock}
                placeholder="e.g. 10"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>UNIT PRICE (RM)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="e.g. 120"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
            </View>

            <CustomButton
              title={addLoading ? 'ADDING...' : 'ADD TO INVENTORY'}
              onPress={handleAddPart}
              disabled={addLoading}
              style={{ marginTop: 8 }}
            />
            <CustomButton title="CANCEL" variant="secondary" onPress={() => setShowAddModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Stock Update Modal */}
      <Modal visible={showStockModal} transparent animationType="fade" onRequestClose={() => setShowStockModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>UPDATE STOCK QUANTITY</Text>
              <TouchableOpacity onPress={() => setShowStockModal(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            {selectedPart && (
              <View style={styles.stockUpdateForm}>
                <Text style={styles.partTitleBold}>{selectedPart.name}</Text>
                <Text style={styles.partCurrentStock}>Current Stock: {selectedPart.stock_quantity ?? 0} units</Text>

                <Text style={styles.inputLabel}>ACTION TYPE</Text>
                <View style={styles.actionTypeRow}>
                  {(['add', 'remove', 'set'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeBtn, changeType === type && styles.activeTypeBtn]}
                      onPress={() => setChangeType(type)}
                    >
                      <Text style={[styles.typeBtnText, changeType === type && styles.activeTypeBtnText]}>
                        {type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>QUANTITY VALUE</Text>
                <TextInput
                  style={styles.input}
                  value={qtyValue}
                  onChangeText={setQtyValue}
                  placeholder="e.g. 5"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                />

                <Text style={styles.inputLabel}>REASON / REMARKS (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="e.g. Restock shipment #2041"
                  placeholderTextColor={COLORS.textMuted}
                />

                <CustomButton
                  title={updatingStock ? 'SAVING...' : 'SAVE STOCK CHANGE'}
                  onPress={handleSaveStockUpdate}
                  disabled={updatingStock}
                  style={{ marginTop: 10 }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Audit Log / History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="slide" onRequestClose={() => setShowHistoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>STOCK MOVEMENT LOGS</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.partTitleBold}>{selectedPart?.name}</Text>
            <Text style={styles.partSku}>SKU: {selectedPart?.sku || 'N/A'}</Text>

            {loadingTransactions ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : transactions.length === 0 ? (
              <Text style={styles.noHistoryText}>No inventory transactions recorded yet.</Text>
            ) : (
              <ScrollView contentContainerStyle={styles.historyList}>
                {transactions.map((tx) => (
                  <View key={tx.id} style={styles.txCard}>
                    <View style={styles.txRow}>
                      <Text style={styles.txType}>{tx.type.toUpperCase()}</Text>
                      <Text style={[styles.txDelta, tx.type === 'add' ? { color: COLORS.success } : { color: COLORS.danger }]}>
                        {tx.type === 'add' ? `+${tx.quantity}` : tx.type === 'remove' ? `-${tx.quantity}` : tx.quantity}
                      </Text>
                    </View>
                    <Text style={styles.txDetails}>
                      Before: {tx.previous_quantity} → After: {tx.new_quantity}
                    </Text>
                    {tx.reason ? <Text style={styles.txReason}>Note: {tx.reason}</Text> : null}
                    <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  topBarContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', gap: 10 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cards, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10, height: 44 },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 14, height: 44, borderRadius: 12 },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  filterChipRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingVertical: 8 },
  filterChip: { backgroundColor: COLORS.cards, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  activeFilterChip: { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: COLORS.primary },
  filterChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800' },
  activeFilterChipText: { color: COLORS.primary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10, backgroundColor: COLORS.cards, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', maxWidth: 280 },
  partCard: { backgroundColor: COLORS.cards, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  partName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  partSku: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  partPrice: { color: COLORS.primary, fontSize: 18, fontWeight: '900' },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  stockText: { fontSize: 10, fontWeight: '800' },
  outStockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.dangerBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.danger },
  outStockText: { color: COLORS.danger, fontSize: 10, fontWeight: '800' },
  partActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconActionBtn: { padding: 6, borderRadius: 8, backgroundColor: COLORS.elevatedCards, borderWidth: 1, borderColor: COLORS.borderHighlight },
  updateStockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  updateStockText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.elevatedCards, borderRadius: 20, padding: 18, width: '100%', borderWidth: 1, borderColor: COLORS.borderHighlight, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  inputGroup: { gap: 6 },
  inputLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  input: { backgroundColor: COLORS.cards, borderRadius: 10, paddingHorizontal: 12, height: 42, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, fontSize: 13 },
  stockUpdateForm: { gap: 10 },
  partTitleBold: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  partCurrentStock: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  actionTypeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.cards, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  activeTypeBtn: { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: COLORS.primary },
  typeBtnText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800' },
  activeTypeBtnText: { color: COLORS.primary },
  noHistoryText: { color: COLORS.textMuted, fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  historyList: { gap: 8, paddingTop: 10 },
  txCard: { backgroundColor: COLORS.cards, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 2 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txType: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' },
  txDelta: { fontSize: 13, fontWeight: '900' },
  txDetails: { color: COLORS.textSecondary, fontSize: 11 },
  txReason: { color: COLORS.textMuted, fontSize: 11, fontStyle: 'italic' },
  txDate: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
});
