import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { getWorkshopBookings, updateBookingStatus } from '../../services/bookingService';
import { getMyWorkshop } from '../../services/workshopService';
import { Header } from '../../components/Header';
import { Calendar, Clock, User, RefreshCw, Package } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import type { Booking, BookingStatus } from '../../types/database';

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: '#f59e0b' },
  confirmed:   { label: 'Confirmed',   color: COLORS.primary },
  in_progress: { label: 'In Progress', color: '#38bdf8' },
  completed:   { label: 'Completed',   color: COLORS.success },
  cancelled:   { label: 'Cancelled',   color: COLORS.danger },
  rejected:    { label: 'Rejected',    color: COLORS.danger },
  no_show:     { label: 'No Show',     color: COLORS.textMuted },
};

const NEXT_ACTIONS: Partial<Record<BookingStatus, { to: BookingStatus; label: string }[]>> = {
  pending:     [{ to: 'confirmed', label: 'Confirm' }, { to: 'rejected', label: 'Reject' }],
  confirmed:   [{ to: 'in_progress', label: 'Start Service' }, { to: 'cancelled', label: 'Cancel' }],
  in_progress: [{ to: 'completed', label: 'Mark Complete' }],
};

export default function WorkshopBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BookingStatus | 'all'>('all');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(user.id);
      if (!ws) { setWorkshopId(null); return; }
      setWorkshopId(ws.id);
      const data = await getWorkshopBookings(ws.id);
      setBookings(data);
    } catch {
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (bookingId: string, toStatus: BookingStatus) => {
    if (!user?.id) return;
    setActionLoading(bookingId + toStatus);
    try {
      await updateBookingStatus(bookingId, toStatus, user.id);
      await loadData();
    } catch (err: any) {
      Alert.alert('Action Failed', err.message ?? 'Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = activeTab === 'all' ? bookings : bookings.filter(b => b.status === activeTab);

  const tabCounts = (['pending', 'confirmed', 'in_progress', 'completed'] as BookingStatus[]).reduce(
    (acc, s) => { acc[s] = bookings.filter(b => b.status === s).length; return acc; },
    {} as Record<string, number>,
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Bookings" subtitle="Manage your appointment queue" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Bookings" subtitle="Manage your appointment queue" />
        <View style={styles.centered}>
          <RefreshCw color={COLORS.danger} size={40} />
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!workshopId) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Bookings" subtitle="Manage your appointment queue" />
        <View style={styles.centered}>
          <Package color={COLORS.textMuted} size={48} />
          <Text style={styles.errorTitle}>No workshop linked</Text>
          <Text style={styles.errorDesc}>Your account is not linked to a workshop yet. Contact your administrator.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Bookings" subtitle={`${bookings.length} total appointments`} />

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
        {(['all', 'pending', 'confirmed', 'in_progress', 'completed'] as const).map(tab => {
          const isActive = activeTab === tab;
          const count = tab === 'all' ? bookings.length : tabCounts[tab] ?? 0;
          const cfg = tab !== 'all' ? STATUS_CONFIG[tab] : null;
          return (
            <TouchableOpacity key={tab} style={[styles.tab, isActive && styles.activeTab, isActive && cfg && { borderColor: cfg.color }]} onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
              <Text style={[styles.tabText, isActive && { color: cfg?.color ?? COLORS.primary }]}>
                {tab === 'all' ? 'All' : STATUS_CONFIG[tab].label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>Your booking queue is empty</Text>
            <Text style={styles.emptyDesc}>New bookings from customers will appear here.</Text>
          </View>
        ) : (
          filtered.map(bk => {
            const cfg = STATUS_CONFIG[bk.status];
            const actions = NEXT_ACTIONS[bk.status] ?? [];
            const customer = bk.customer as any;
            const motorcycle = bk.motorcycle as any;
            return (
              <View key={bk.id} style={styles.bookingCard}>
                <View style={styles.cardTop}>
                  <View style={styles.customerRow}>
                    <View style={styles.avatar}>
                      <User color={COLORS.textMuted} size={18} />
                    </View>
                    <View>
                      <Text style={styles.customerName}>{customer?.full_name ?? 'Customer'}</Text>
                      <Text style={styles.customerEmail}>{customer?.phone ?? customer?.email ?? ''}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                {motorcycle && (
                  <Text style={styles.bikeTag}>🏍️ {motorcycle.brand} {motorcycle.model} • {motorcycle.plate_number}</Text>
                )}

                <View style={styles.dateRow}>
                  <View style={styles.metaRow}>
                    <Calendar color={COLORS.textMuted} size={13} />
                    <Text style={styles.metaText}>{bk.booking_date}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Clock color={COLORS.textMuted} size={13} />
                    <Text style={styles.metaText}>{bk.booking_time}</Text>
                  </View>
                </View>

                {(bk.booking_services ?? []).length > 0 && (
                  <View style={styles.servicesList}>
                    {(bk.booking_services ?? []).map(s => (
                      <Text key={s.id} style={styles.serviceItem}>• {s.service_name_snapshot} — RM {s.price_snapshot.toFixed(2)}</Text>
                    ))}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.totalText}>RM {bk.total_amount.toFixed(2)}</Text>
                  {actions.length > 0 && (
                    <View style={styles.actionsRow}>
                      {actions.map(a => (
                        <TouchableOpacity
                          key={a.to}
                          style={[styles.actionBtn, a.to === 'rejected' || a.to === 'cancelled' ? styles.dangerBtn : styles.primaryBtn]}
                          onPress={() => handleAction(bk.id, a.to)}
                          disabled={actionLoading !== null}
                          activeOpacity={0.8}
                        >
                          {actionLoading === bk.id + a.to
                            ? <ActivityIndicator size="small" color="#000" />
                            : <Text style={[styles.actionBtnText, (a.to === 'rejected' || a.to === 'cancelled') && { color: COLORS.danger }]}>{a.label}</Text>
                          }
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  errorDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  tabScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { backgroundColor: COLORS.surfaceContainer, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  activeTab: { backgroundColor: COLORS.primaryDark },
  tabText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 280 },
  bookingCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  customerName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  customerEmail: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '800' },
  bikeTag: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: COLORS.textSecondary, fontSize: 12 },
  servicesList: { gap: 3 },
  serviceItem: { color: COLORS.textSecondary, fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  totalText: { color: COLORS.primary, fontSize: 15, fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  primaryBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dangerBtn: { backgroundColor: COLORS.dangerBg, borderColor: COLORS.danger },
  actionBtnText: { color: '#000', fontSize: 12, fontWeight: '800' },
});
