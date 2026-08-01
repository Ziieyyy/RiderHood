import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { Package, Plus, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop } from '../../services/workshopService';
import { getWorkshopParts, createPart } from '../../services/partsService';
import type { Part } from '../../types/database';

export default function WorkshopPartsScreen() {
  const { profile } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (ws) {
        const data = await getWorkshopParts(ws.id);
        setParts(data);
      }
    } catch {
      setError('Failed to load parts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

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
        stock_quantity: parseInt(stock) || 0,
        unit_price: parseFloat(price) || 0,
      });
      setParts([created, ...parts]);
      setName('');
      setSku('');
      setStock('');
      setPrice('');
      setShowAddModal(false);
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert('Error', error?.message || 'Failed to add part.');
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={COLORS.danger} size={40} />
        <Text style={styles.errorTitle}>Failed to load</Text>
        <Text style={styles.errorDesc}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#f59e0b" />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>PARTS & INVENTORY ({parts.length})</Text>
          <Text style={styles.headerSub}>Track component stock, SKU & pricing</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
          accessibilityLabel="Add new part"
        >
          <Plus color="#000" size={16} />
          <Text style={styles.addBtnText}>Add Part</Text>
        </TouchableOpacity>
      </View>

      {parts.length === 0 ? (
        <View style={styles.emptyState}>
          <Package color={COLORS.textMuted} size={48} />
          <Text style={styles.emptyTitle}>No parts in inventory</Text>
          <Text style={styles.emptyDesc}>Add your first part to start tracking stock levels.</Text>
        </View>
      ) : (
        parts.map(part => (
          <View key={part.id} style={styles.partCard}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.partName}>{part.name}</Text>
                <Text style={styles.partSku}>
                  {part.sku ? `SKU: ${part.sku}` : 'No SKU'}
                  {part.category ? ` • ${part.category}` : ''}
                </Text>
              </View>
              <Text style={styles.partPrice}>RM {Number(part.unit_price).toFixed(0)}</Text>
            </View>

            <View style={styles.stockRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {(part.stock_quantity ?? 0) > 0 ? (
                  <View style={[
                    styles.stockBadge,
                    part.stock_status === 'LOW_STOCK'
                      ? { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b' }
                      : { backgroundColor: COLORS.successBg, borderColor: COLORS.success }
                  ]}>
                    {part.stock_status === 'LOW_STOCK' ? (
                      <AlertTriangle color="#f59e0b" size={12} />
                    ) : (
                      <CheckCircle2 color={COLORS.success} size={12} />
                    )}
                    <Text style={[
                      styles.stockText,
                      { color: part.stock_status === 'LOW_STOCK' ? '#f59e0b' : COLORS.success }
                    ]}>
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
            </View>
          </View>
        ))
      )}

      {/* Add Part Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Inventory Part</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PART NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Brake Pad Set"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SKU CODE</Text>
              <TextInput
                style={styles.input}
                value={sku}
                onChangeText={setSku}
                placeholder="e.g. BRK-001"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>INITIAL STOCK QUANTITY</Text>
              <TextInput
                style={styles.input}
                value={stock}
                onChangeText={setStock}
                placeholder="e.g. 5"
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
                placeholder="e.g. 150"
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
            <CustomButton
              title="CANCEL"
              variant="secondary"
              onPress={() => setShowAddModal(false)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  errorDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#000', fontSize: 12, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  partCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  partName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  partSku: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  partPrice: { color: '#f59e0b', fontSize: 20, fontWeight: '900' },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  stockText: { fontSize: 10, fontWeight: '800' },
  outStockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.dangerBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.danger },
  outStockText: { color: COLORS.danger, fontSize: 10, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.surfaceContainer, borderRadius: 24, padding: 20, width: '100%', borderWidth: 1, borderColor: '#f59e0b', gap: 12 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  inputGroup: { gap: 6 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 14, height: 46, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, fontSize: 14 },
});
