import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { TrendingUp, RefreshCw, Wrench } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop, getWorkshopServices } from '../../services/workshopService';
import { getWorkshopBookings } from '../../services/bookingService';
import type { Booking, Service } from '../../types/database';

export default function WorkshopReportsScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (!ws) { setLoading(false); return; }
      const [bks, svcs] = await Promise.all([
        getWorkshopBookings(ws.id),
        getWorkshopServices(profile.id),
      ]);
      setBookings(bks);
      setServices(svcs);
    } catch {
      setError('Failed to load reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Compute real analytics
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const thisMonthCompleted = completedBookings.filter(b => b.booking_date.startsWith(thisMonth));
  const lastMonthCompleted = completedBookings.filter(b => b.booking_date.startsWith(lastMonth));

  const thisMonthRevenue = thisMonthCompleted.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const lastMonthRevenue = lastMonthCompleted.reduce((sum, b) => sum + Number(b.total_amount), 0);

  const growthPct = lastMonthRevenue > 0
    ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
    : '0.0';

  // Top services by booking count
  const serviceBookingCount: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const bk of completedBookings) {
    for (const bs of (bk.booking_services ?? [])) {
      const key = bs.service_name_snapshot;
      if (!serviceBookingCount[key]) {
        serviceBookingCount[key] = { name: key, count: 0, revenue: 0 };
      }
      serviceBookingCount[key].count += 1;
      serviceBookingCount[key].revenue += Number(bs.price_snapshot);
    }
  }
  const topServices = Object.values(serviceBookingCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading reports...</Text>
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
      <Text style={styles.sectionTitle}>REVENUE & SERVICE ANALYTICS</Text>

      {/* Revenue Card — from real data */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TrendingUp color="#f59e0b" size={20} />
          <Text style={styles.cardLabel}>TOTAL REVENUE ({monthName.toUpperCase()})</Text>
        </View>
        <Text style={styles.mainValue}>RM {thisMonthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.subValue}>
          {Number(growthPct) >= 0 ? '+' : ''}{growthPct}% compared to previous month (RM {lastMonthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })})
        </Text>
      </View>

      {/* Breakdown */}
      <View style={styles.grid}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>COMPLETED JOBS (THIS MONTH)</Text>
          <Text style={styles.miniValue}>{thisMonthCompleted.length}</Text>
          <Text style={styles.miniSub}>{completedBookings.length} total all time</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>TOTAL ALL-TIME REVENUE</Text>
          <Text style={styles.miniValue}>RM {completedBookings.reduce((sum, b) => sum + Number(b.total_amount), 0).toLocaleString()}</Text>
          <Text style={styles.miniSub}>{completedBookings.length} jobs completed</Text>
        </View>
      </View>

      {/* Top Services — from real data */}
      {topServices.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>MOST POPULAR SERVICES</Text>
          <View style={styles.card}>
            {topServices.map((svc, idx) => (
              <React.Fragment key={svc.name}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>{idx + 1}. {svc.name}</Text>
                  <Text style={styles.itemCount}>{svc.count} Jobs (RM {svc.revenue.toLocaleString()})</Text>
                </View>
                {idx < topServices.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </>
      )}

      {topServices.length === 0 && (
        <View style={styles.emptyState}>
          <Wrench color={COLORS.textMuted} size={40} />
          <Text style={styles.emptyTitle}>No completed services yet</Text>
          <Text style={styles.emptyDesc}>Analytics will populate as bookings are completed.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  retryBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  card: { backgroundColor: COLORS.surfaceContainer, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#3b2f10', gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  mainValue: { color: '#f59e0b', fontSize: 32, fontWeight: '900' },
  subValue: { color: COLORS.textSecondary, fontSize: 12 },
  grid: { flexDirection: 'row', gap: 12 },
  miniCard: { flex: 1, backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  miniLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '800' },
  miniValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900' },
  miniSub: { color: COLORS.primaryDim, fontSize: 11 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', flex: 1 },
  itemCount: { color: '#f59e0b', fontSize: 13, fontWeight: '800' },
  divider: { height: 1, backgroundColor: COLORS.border },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
});
