import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { getCustomerBookings } from '../../services/bookingService';
import { Header } from '../../components/Header';
import { Calendar, Clock, CheckCircle2, XCircle, RefreshCw, Search } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import type { Booking, BookingStatus } from '../../types/database';

export default function CustomerHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, formatDate, formatCurrency } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter] = useState<BookingStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusLabel = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return t('booking.bookingPending');
      case 'confirmed': return t('booking.bookingConfirmed');
      case 'in_progress': return t('workshopAdmin.inProgressBookings');
      case 'completed': return t('booking.bookingCompleted');
      case 'cancelled': return t('booking.bookingCancelled');
      default: return status;
    }
  };

  const STATUS_CONFIG: Record<BookingStatus, { color: string; bg: string }> = {
    pending:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    confirmed:   { color: COLORS.primary, bg: COLORS.primaryDark },
    in_progress: { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    completed:   { color: COLORS.success, bg: COLORS.successBg },
    cancelled:   { color: COLORS.danger, bg: COLORS.dangerBg },
    rejected:    { color: COLORS.danger, bg: COLORS.dangerBg },
    no_show:     { color: COLORS.textMuted, bg: COLORS.surface },
  };

  const FILTERS: Array<BookingStatus | 'all'> = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const data = await getCustomerBookings(user.id);
      setBookings(data);
    } catch {
      setError(t('errors.genericMessage'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, t]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const filtered = activeFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === activeFilter);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('navigation.history')} subtitle={t('booking.subtitle')} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('navigation.history')} subtitle={t('booking.subtitle')} />
        <View style={styles.centered}>
          <RefreshCw color={COLORS.danger} size={40} />
          <Text style={styles.errorTitle}>{t('errors.genericTitle')}</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadBookings}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('navigation.history')} subtitle={t('booking.subtitle')} />

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f;
          const cfg = f !== 'all' ? STATUS_CONFIG[f] : null;
          return (
            <TouchableOpacity key={f} style={[styles.filterPill, isActive && styles.activePill, isActive && cfg && { borderColor: cfg.color }]} onPress={() => setActiveFilter(f)} activeOpacity={0.8}>
              <Text style={[styles.filterText, isActive && { color: cfg?.color ?? COLORS.primary }]}>
                {f === 'all' ? t('common.all') : getStatusLabel(f)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBookings(); }} tintColor={COLORS.primary} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>{t('empty.noBookings')}</Text>
            <Text style={styles.emptyDesc}>{t('empty.noBookingsSub')}</Text>
            {activeFilter === 'all' && (
              <TouchableOpacity style={styles.findBtn} onPress={() => router.push('/(customer)/workshops')} activeOpacity={0.8}>
                <Search color="#000" size={14} />
                <Text style={styles.findBtnText}>{t('navigation.workshops')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map(bk => {
            const cfg = STATUS_CONFIG[bk.status] || { color: COLORS.textMuted, bg: COLORS.surface };
            const workshopName = (bk.workshop as any)?.name ?? 'Workshop';
            const bikeName = (bk.motorcycle as any)
              ? `${(bk.motorcycle as any).brand} ${(bk.motorcycle as any).model}`
              : 'Motorcycle';
            return (
              <View key={bk.id} style={styles.bookingCard}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.workshopName}>{workshopName}</Text>
                    <Text style={styles.bikeName}>{bikeName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{getStatusLabel(bk.status)}</Text>
                  </View>
                </View>

                <View style={styles.cardMeta}>
                  <View style={styles.metaRow}>
                    <Calendar color={COLORS.textMuted} size={14} />
                    <Text style={styles.metaText}>{formatDate(bk.booking_date)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Clock color={COLORS.textMuted} size={14} />
                    <Text style={styles.metaText}>{bk.booking_time}</Text>
                  </View>
                </View>

                {(bk.booking_services ?? []).length > 0 && (
                  <View style={styles.servicesRow}>
                    {(bk.booking_services ?? []).slice(0, 2).map((s) => (
                      <View key={s.id} style={styles.serviceChip}>
                        <Text style={styles.serviceChipText}>{s.service_name_snapshot}</Text>
                      </View>
                    ))}
                    {(bk.booking_services ?? []).length > 2 && (
                      <View style={styles.serviceChip}>
                        <Text style={styles.serviceChipText}>+{(bk.booking_services ?? []).length - 2} more</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.totalLabel}>{t('common.total')}</Text>
                  <Text style={styles.totalAmount}>{formatCurrency(bk.total_amount || 0)}</Text>
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
  filterScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterPill: { backgroundColor: COLORS.surfaceContainer, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  activePill: { backgroundColor: COLORS.primaryDark },
  filterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 280 },
  findBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  findBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
  bookingCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  workshopName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  bikeName: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '800' },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceChip: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  serviceChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  totalLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  totalAmount: { color: COLORS.primary, fontSize: 15, fontWeight: '900' },
});
