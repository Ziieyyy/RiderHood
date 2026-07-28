import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { Users, Phone, Mail, Calendar, RefreshCw, Bike } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop } from '../../services/workshopService';
import { getWorkshopBookings } from '../../services/bookingService';
import type { Booking } from '../../types/database';

interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  bike: string;
  totalBookings: number;
  lastVisit: string;
}

export default function WorkshopCustomersScreen() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (!ws) { setLoading(false); return; }

      const bookings = await getWorkshopBookings(ws.id);

      // Aggregate unique customers from bookings
      const customerMap = new Map<string, CustomerSummary>();
      for (const bk of bookings) {
        const cust = bk.customer as Record<string, unknown> | undefined;
        const bike = bk.motorcycle as Record<string, unknown> | undefined;
        if (!cust?.id) continue;

        const custId = cust.id as string;
        const existing = customerMap.get(custId);

        if (existing) {
          existing.totalBookings += 1;
          // Update last visit to most recent booking date
          if (bk.booking_date > existing.lastVisit) {
            existing.lastVisit = bk.booking_date;
          }
          // If bike info exists and not already captured, update
          if (bike && !existing.bike) {
            existing.bike = `${bike.brand} ${bike.model}`;
          }
        } else {
          customerMap.set(custId, {
            id: custId,
            name: (cust.full_name as string) || 'Customer',
            email: (cust.email as string) || '',
            phone: (cust.phone as string) || '',
            bike: bike ? `${bike.brand} ${bike.model}` : '',
            totalBookings: 1,
            lastVisit: bk.booking_date,
          });
        }
      }

      const sorted = Array.from(customerMap.values())
        .sort((a, b) => b.totalBookings - a.totalBookings);
      setCustomers(sorted);
    } catch {
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={COLORS.danger} size={40} />
        <Text style={styles.errorTitle}>Failed to load</Text>
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
      <Text style={styles.headerTitle}>CUSTOMER DIRECTORY ({customers.length})</Text>

      {customers.length === 0 ? (
        <View style={styles.emptyState}>
          <Users color={COLORS.textMuted} size={48} />
          <Text style={styles.emptyTitle}>No customers yet</Text>
          <Text style={styles.emptyDesc}>Customers who book services at your workshop will appear here.</Text>
        </View>
      ) : (
        customers.map(cust => (
          <View key={cust.id} style={styles.card}>
            <View style={styles.rowTop}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>{cust.name.substring(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{cust.name}</Text>
                {cust.bike ? <Text style={styles.bike}>🏍️ {cust.bike}</Text> : null}
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{cust.totalBookings} Service{cust.totalBookings !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoGrid}>
              {cust.email ? (
                <View style={styles.infoRow}>
                  <Mail color={COLORS.textMuted} size={14} />
                  <Text style={styles.infoText}>{cust.email}</Text>
                </View>
              ) : null}
              {cust.phone ? (
                <View style={styles.infoRow}>
                  <Phone color={COLORS.textMuted} size={14} />
                  <Text style={styles.infoText}>{cust.phone}</Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Calendar color={COLORS.textMuted} size={14} />
                <Text style={styles.infoText}>Last Visit: {cust.lastVisit}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// Need TouchableOpacity for retry button
import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  retryBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 12 },
  headerTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: COLORS.surfaceContainer, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#3b2f10', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f59e0b' },
  avatarText: { color: '#f59e0b', fontSize: 15, fontWeight: '900' },
  name: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  bike: { color: COLORS.primaryDim, fontSize: 12, fontWeight: '600', marginTop: 2 },
  countBadge: { backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  countText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.border },
  infoGrid: { gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: COLORS.textSecondary, fontSize: 12 },
});
