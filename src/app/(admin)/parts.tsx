import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';
import { Search, Plus, Package, AlertTriangle } from 'lucide-react-native';
import { getAllParts } from '../../services/adminService';

export default function AdminPartsScreen() {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadParts = async () => {
    try {
      const data = await getAllParts();
      setParts(data);
    } catch (err) {
      console.log('Error loading parts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  const filteredParts = parts.filter(p => {
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q);
  });

  const getStockColor = (qty: number, min: number) => {
    if (qty === 0) return COLORS.danger;
    if (qty <= min) return '#f59e0b';
    return COLORS.success;
  };

  const getStockLabel = (qty: number, min: number) => {
    if (qty === 0) return 'OUT OF STOCK';
    if (qty <= min) return 'LOW STOCK';
    return 'IN STOCK';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Search color={COLORS.textSecondary} size={18} />
          <TextInput 
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search parts catalog..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : filteredParts.length === 0 ? (
          <View style={styles.emptyState}>
            <Package color={COLORS.textMuted} size={40} />
            <Text style={styles.emptyTitle}>No Parts Found</Text>
            <Text style={styles.emptyDesc}>
              {search ? 'No parts match your search.' : 'No parts in inventory yet. Workshop admins can add parts from their dashboard.'}
            </Text>
          </View>
        ) : (
          filteredParts.map((part) => {
            const stockColor = getStockColor(part.stock_quantity ?? 0, part.minimum_stock ?? 0);
            const stockLabel = getStockLabel(part.stock_quantity ?? 0, part.minimum_stock ?? 0);
            return (
              <View key={part.id} style={styles.card}>
                <View style={styles.iconBox}>
                  <Package color={COLORS.textSecondary} size={24} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.partName}>{part.name}</Text>
                  <Text style={styles.partBrand}>{part.brand || 'Generic'}</Text>
                  {part.workshop?.name && (
                    <Text style={styles.workshopName}>📍 {part.workshop.name}</Text>
                  )}
                </View>
                <View style={styles.stockBox}>
                  <Text style={[styles.stockNum, { color: stockColor }]}>{part.stock_quantity ?? 0}</Text>
                  <Text style={[styles.stockLbl, { color: stockColor }]}>{stockLabel}</Text>
                  {part.price > 0 && (
                    <Text style={styles.priceText}>RM {Number(part.price).toFixed(0)}</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceContainer,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  partName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  partBrand: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  workshopName: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  stockBox: {
    alignItems: 'flex-end',
  },
  stockNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  stockLbl: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  priceText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
});
