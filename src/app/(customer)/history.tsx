import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, DARK_COLORS } from '../../constants/theme';
import { getCustomerBookings } from '../../services/bookingService';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';
import { useResponsive } from '../../hooks/useResponsive';
import { Calendar, Clock, Search, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Booking, BookingStatus } from '../../types/database';

export default function CustomerHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, formatDate, formatCurrency } = useTranslation();
  const { contentPadding } = useResponsive();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter] = useState<BookingStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusLabel = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return t('booking.bookingPending');
      case 'confirmed':
        return t('booking.bookingConfirmed');
      case 'in_progress':
        return t('workshopAdmin.inProgressBookings');
      case 'completed':
        return t('booking.bookingCompleted');
      case 'cancelled':
        return t('booking.bookingCancelled');
      default:
        return status;
    }
  };

  const STATUS_CONFIG: Record<BookingStatus, { color: string; bg: string }> = {
    pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    confirmed: { color: colors.primary, bg: colors.primaryDark },
    in_progress: { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    completed: { color: colors.success, bg: colors.successBg },
    cancelled: { color: colors.danger, bg: colors.dangerBg },
    rejected: { color: colors.danger, bg: colors.dangerBg },
    no_show: { color: colors.textMuted, bg: colors.surface },
  };

  const FILTERS: Array<BookingStatus | 'all'> = [
    'all',
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ];

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

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filtered =
    activeFilter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === activeFilter);

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

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadBookings();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        <ResponsiveContainer>
          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FILTERS.map((f) => {
              const isActive = activeFilter === f;
              const cfg = f !== 'all' ? STATUS_CONFIG[f] : null;
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    isActive && styles.activePill,
                    isActive && cfg && { borderColor: cfg.color },
                  ]}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterText,
                      isActive && { color: cfg?.color ?? COLORS.primary, fontWeight: '800' },
                    ]}
                  >
                    {f === 'all' ? t('common.all') : getStatusLabel(f)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar color={COLORS.textMuted} size={48} />
              <Text style={styles.emptyTitle}>{t('empty.noBookings')}</Text>
              <Text style={styles.emptyDesc}>{t('empty.noBookingsSub')}</Text>
              {activeFilter === 'all' && (
                <TouchableOpacity
                  style={styles.findBtn}
                  onPress={() => router.push('/(customer)/workshops')}
                  activeOpacity={0.8}
                >
                  <Search color="#000" size={14} />
                  <Text style={styles.findBtnText}>{t('navigation.workshops')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {filtered.map((bk) => {
                const cfg = STATUS_CONFIG[bk.status] || {
                  color: COLORS.textMuted,
                  bg: COLORS.surface,
                };
                const workshopName = (bk.workshop as any)?.name ?? 'Workshop';
                const bikeName = (bk.motorcycle as any)
                  ? `${(bk.motorcycle as any).brand} ${(bk.motorcycle as any).model}`
                  : 'Motorcycle';

                return (
                  <View key={bk.id} style={styles.bookingCard}>
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.workshopName} numberOfLines={1}>
                          {workshopName}
                        </Text>
                        <Text style={styles.bikeName} numberOfLines={1}>
                          {bikeName}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: cfg.bg, borderColor: cfg.color },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: cfg.color }]}>
                          {getStatusLabel(bk.status)}
                        </Text>
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
                            <Text style={styles.serviceChipText} numberOfLines={1}>
                              {s.service_name_snapshot}
                            </Text>
                          </View>
                        ))}
                        {(bk.booking_services ?? []).length > 2 && (
                          <View style={styles.serviceChip}>
                            <Text style={styles.serviceChipText}>
                              +{(bk.booking_services ?? []).length - 2} more
                            </Text>
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
              })}
            </ResponsiveGrid>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingVertical: 16, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
    loadingText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    errorTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
    errorDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
    retryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    retryText: { color: isDark ? '#000' : '#FFF', fontWeight: '800', fontSize: 13 },
    filterScroll: { gap: 8, marginBottom: 16 },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activePill: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)',
      borderColor: colors.primary,
    },
    filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    emptyState: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 32,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 8,
      marginTop: 20,
    },
    emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    emptyDesc: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
    findBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 8,
    },
    findBtnText: { color: isDark ? '#000' : '#FFF', fontSize: 12, fontWeight: '800' },
    bookingCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
      width: '100%',
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    workshopName: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
    bikeName: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    statusText: { fontSize: 10, fontWeight: '800' },
    cardMeta: { flexDirection: 'row', gap: 16 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: colors.textMuted, fontSize: 12 },
    servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    serviceChip: {
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    serviceChipText: { color: colors.textSecondary, fontSize: 11 },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    totalLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    totalAmount: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  });
