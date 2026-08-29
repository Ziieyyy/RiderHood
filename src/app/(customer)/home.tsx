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
import { getMotorcycles } from '../../services/motorcycleService';
import { getCustomerBookings } from '../../services/bookingService';
import { getReminders, calculateHealthScore } from '../../services/maintenanceService';
import { Header } from '../../components/Header';
import { HealthGauge } from '../../components/HealthGauge';
import { PromoCarousel } from '../../components/PromoCarousel';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { useResponsive } from '../../hooks/useResponsive';
import {
  Wrench,
  Calendar,
  Clock,
  CheckCircle2,
  Bike,
  AlertTriangle,
  Plus,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Motorcycle, Booking, MaintenanceReminder } from '../../types/database';

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isPhone, isTablet, isDesktop, contentPadding } = useResponsive();

  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [selectedBike, setSelectedBike] = useState<Motorcycle | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const [bikes, bks] = await Promise.all([
        getMotorcycles(user.id),
        getCustomerBookings(user.id),
      ]);
      setMotorcycles(bikes);
      setBookings(bks);

      if (bikes.length > 0) {
        const first = bikes[0];
        setSelectedBike(first);
        const [rems, score] = await Promise.all([
          getReminders(first.id),
          calculateHealthScore(first.id),
        ]);
        setReminders(rems);
        setHealthScore(score);
      } else {
        setSelectedBike(null);
        setReminders([]);
        setHealthScore(null);
      }
    } catch {
      setError('Failed to load your data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSwitchBike = async () => {
    if (motorcycles.length < 2 || !selectedBike) return;
    const idx = motorcycles.findIndex((b) => b.id === selectedBike.id);
    const next = motorcycles[(idx + 1) % motorcycles.length];
    setSelectedBike(next);
    setHealthScore(null);
    try {
      const [rems, score] = await Promise.all([
        getReminders(next.id),
        calculateHealthScore(next.id),
      ]);
      setReminders(rems);
      setHealthScore(score);
    } catch {
      /* retain previous state */
    }
  };

  const recentBookings = bookings.slice(0, 4);
  const dueReminders = reminders.filter((r) => r.status === 'due' || r.status === 'overdue');
  const upcomingReminders = reminders.filter((r) => r.status === 'upcoming').slice(0, 4);

  // Get the latest upcoming/active booking
  const nextBooking = bookings.find(
    (b) => b.status === 'pending' || b.status === 'confirmed' || b.status === 'in_progress'
  );

  // ─── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="RiderHood" subtitle={`${t('auth.welcomeTitle')}, ${user?.full_name || 'Rider'} 👋`} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="RiderHood" subtitle={`${t('auth.welcomeTitle')}, ${user?.full_name || 'Rider'} 👋`} />
        <View style={styles.centered}>
          <RefreshCw color={COLORS.danger} size={40} />
          <Text style={styles.errorTitle}>{t('errors.genericTitle')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData} accessibilityLabel="Retry loading data">
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render Bike & Health Section ─────────────────────────
  // ─── Render Bike & Health Section (Full-length bottom section) ──
  const renderMotorcycleSection = () => (
    <View style={styles.sectionCol}>
      <Text style={styles.sectionTitle}>
        🏍️ {t('motorcycle.primaryBadge').toUpperCase()} & {t('motorcycle.healthScore').toUpperCase()}
      </Text>

      {selectedBike ? (
        <View style={isPhone ? styles.mobileBikeStack : styles.desktopBikeRow}>
          <View style={[styles.bikeSelectorCard, !isPhone && { flex: 1.1 }]}>
            <View style={styles.bikeHeaderRow}>
              <View style={styles.bikeBadgeRow}>
                <Bike color={COLORS.primary} size={18} />
                <Text style={styles.activeLabel}>{t('motorcycle.primaryBadge').toUpperCase()}</Text>
              </View>
              {motorcycles.length > 1 && (
                <TouchableOpacity
                  style={styles.switchBtn}
                  activeOpacity={0.7}
                  onPress={handleSwitchBike}
                  accessibilityLabel="Switch motorcycle"
                >
                  <Text style={styles.switchBtnText}>{t('common.switch')} 🔄</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.bikeInfoRow}>
              <View style={styles.bikePlaceholderImg}>
                <Bike color={COLORS.textMuted} size={28} />
              </View>
              <View style={styles.bikeDetails}>
                <Text style={styles.bikeName}>
                  {selectedBike.nickname || `${selectedBike.brand} ${selectedBike.model}`}
                </Text>
                <Text style={styles.bikeEngine}>
                  {selectedBike.brand} {selectedBike.model} • {selectedBike.year}
                </Text>
                <Text style={styles.bikeMileage}>📍 {selectedBike.current_mileage.toLocaleString()} km</Text>
                <View style={styles.plateTag}>
                  <Text style={styles.plateText}>{selectedBike.plate_number}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Health Score Component */}
          <View style={!isPhone ? { flex: 0.9 } : undefined}>
            {healthScore !== null ? (
              <HealthGauge
                score={healthScore}
                bikeName={selectedBike.nickname || `${selectedBike.brand} ${selectedBike.model}`}
                status={
                  healthScore >= 85
                    ? t('motorcycle.healthExcellent')
                    : healthScore >= 60
                    ? t('motorcycle.healthGood')
                    : t('motorcycle.healthPoor')
                }
              />
            ) : (
              <View style={styles.healthPlaceholder}>
                <Wrench color={COLORS.textMuted} size={28} />
                <Text style={styles.healthPlaceholderText}>{t('motorcycle.healthScore')}</Text>
                <Text style={styles.healthPlaceholderSub}>{t('motorcycle.healthScoreDesc')}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyBikeCard}>
          <Bike color={COLORS.textMuted} size={44} />
          <Text style={styles.emptyBikeTitle}>{t('motorcycle.noBikesRegistered')}</Text>
          <Text style={styles.emptyBikeDesc}>{t('motorcycle.noBikesDesc')}</Text>
          <TouchableOpacity
            style={styles.addBikeBtn}
            onPress={() => router.push('/(customer)/profile')}
            activeOpacity={0.8}
            accessibilityLabel="Add motorcycle"
          >
            <Plus color="#000" size={16} />
            <Text style={styles.addBikeBtnText}>{t('motorcycle.addFirstBike')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Due Reminders Alert Box */}
      {dueReminders.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionTitle}>⚠️ {t('common.warning').toUpperCase()}</Text>
          <View style={!isPhone ? styles.remindersGridDesktop : undefined}>
            {dueReminders.slice(0, 3).map((r) => (
              <View key={r.id} style={[styles.reminderAlert, !isPhone && { flex: 1, minWidth: 260 }]}>
                <AlertTriangle color={COLORS.danger} size={16} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderAlertTitle}>{r.title}</Text>
                  <Text style={styles.reminderAlertSub}>
                    {r.status === 'overdue' ? t('maintenance.overdue') : t('maintenance.dueSoon').toUpperCase()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { borderColor: r.status === 'overdue' ? COLORS.danger : '#f59e0b' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: r.status === 'overdue' ? COLORS.danger : '#f59e0b' },
                    ]}
                  >
                    {(r.status === 'overdue' ? t('maintenance.overdue') : t('maintenance.dueSoon')).toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // ─── Render Quick Actions & Reminders & Bookings Section ──
  const renderActionsAndActivitySection = () => (
    <View style={styles.sectionCol}>
      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>{t('dashboard.recentActivity').toUpperCase()}</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/(customer)/workshops')}
          accessibilityLabel="Find workshop"
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary }]}>
            <Wrench color={COLORS.primary} size={22} />
          </View>
          <Text style={styles.actionText} numberOfLines={1}>{t('navigation.workshops')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/(customer)/booking')}
          accessibilityLabel="Book service"
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary }]}>
            <Calendar color={COLORS.primary} size={22} />
          </View>
          <Text style={styles.actionText} numberOfLines={1}>{t('common.bookNow')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/(customer)/history')}
          accessibilityLabel="View history"
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.surfaceContainer, borderColor: COLORS.border }]}>
            <Clock color={COLORS.textPrimary} size={22} />
          </View>
          <Text style={styles.actionText} numberOfLines={1}>{t('navigation.history')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/(customer)/garage')}
          accessibilityLabel="My Garage"
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.surfaceContainer, borderColor: COLORS.border }]}>
            <Bike color={COLORS.textPrimary} size={22} />
          </View>
          <Text style={styles.actionText} numberOfLines={1}>{t('navigation.garage')}</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Service Reminders */}
      {reminders.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionTitle}>{t('maintenance.reminder').toUpperCase()}</Text>
          <View style={styles.reminderCardBox}>
            {upcomingReminders.length > 0 ? (
              upcomingReminders.map((r) => (
                <View key={r.id} style={styles.reminderItemRow}>
                  <Text style={styles.reminderIconText}>
                    {r.type === 'oil_change' ? '🛢️' : r.type === 'chain' ? '⚙️' : r.type === 'brake' ? '🛑' : '🔧'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderItemText}>{r.title}</Text>
                    {r.next_service_mileage && (
                      <Text style={styles.reminderSubText}>
                        {t('maintenance.dueInKm')} {r.next_service_mileage.toLocaleString()} km
                      </Text>
                    )}
                    {r.next_service_date && (
                      <Text style={[styles.reminderSubText, !isDark && { color: '#000000' }]}>
                        {t('common.date')}: {formatDate(r.next_service_date)}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.reminderItemRow}>
                <CheckCircle2 color={COLORS.success} size={18} />
                <Text style={styles.reminderItemText}>{t('maintenance.upToDate')}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Book Service Banner */}
      {!nextBooking && selectedBike && (
        <TouchableOpacity
          style={styles.bookingBanner}
          activeOpacity={0.8}
          onPress={() => router.push('/(customer)/booking')}
          accessibilityLabel="Book a service"
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.bookingBannerTitle}>{t('dashboard.serviceReminder')}</Text>
            <Text style={styles.bookingBannerSub}>{t('dashboard.serviceReminderDesc')}</Text>
          </View>
          <View style={styles.bookingBannerBtn}>
            <Text style={styles.bookingBannerBtnText}>{t('common.bookNow').toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Recent Bookings Queue */}
      <View style={{ marginTop: 16 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('navigation.bookings').toUpperCase()}</Text>
          {recentBookings.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(customer)/history')}>
              <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar color={COLORS.textMuted} size={32} />
            <Text style={styles.emptyCardTitle}>{t('empty.noBookings')}</Text>
            <Text style={styles.emptyCardDesc}>{t('empty.noBookingsSub')}</Text>
            <TouchableOpacity
              style={styles.emptyCardBtn}
              onPress={() => router.push('/(customer)/workshops')}
              activeOpacity={0.8}
              accessibilityLabel="Find a workshop"
            >
              <Text style={styles.emptyCardBtnText}>{t('navigation.workshops')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentBookings.map((bk) => (
            <TouchableOpacity
              key={bk.id}
              style={styles.activityCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(customer)/history')}
            >
              <View style={styles.activityBadgeRow}>
                {bk.status === 'completed' ? (
                  <View style={styles.completedBadge}>
                    <CheckCircle2 color={COLORS.success} size={12} />
                    <Text style={styles.completedText}>{t('booking.bookingCompleted').toUpperCase()}</Text>
                  </View>
                ) : (
                  <View style={styles.upcomingBadge}>
                    <Clock color={COLORS.primary} size={12} />
                    <Text style={styles.upcomingText}>{bk.status.toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.activityTime}>{formatDate(bk.booking_date)}</Text>
              </View>
              <Text style={styles.activityTitle}>
                {((bk.workshop as unknown as Record<string, unknown>)?.name as string) ?? t('workshop.directoryTitle')}
              </Text>
              <Text style={styles.activityAmount}>
                {t('common.total')}: RM {Number(bk.total_amount).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="RiderHood" subtitle={`${t('auth.welcomeTitle')}, ${user?.full_name || 'Rider'} 👋`} />

      <ScrollView
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
          {isPhone ? (
            // Mobile: Stacked view (Motorcycle Status & Health Gauge on Top -> Quick Actions & Activity -> Promo Carousel at Bottom)
            <View style={styles.mobileStack}>
              {renderMotorcycleSection()}
              {renderActionsAndActivitySection()}
              <PromoCarousel />
            </View>
          ) : (
            // Tablet & Desktop:
            // Top Row (2 Columns): Left = Recent Activity & Bookings | Right = Promo Carousel
            // Bottom Row (Full Length): Motorcycle Details & Live Health Gauge
            <View style={styles.desktopLayoutWrapper}>
              <View style={styles.desktopGrid}>
                <View style={styles.desktopLeftCol}>
                  {renderActionsAndActivitySection()}
                </View>
                <View style={styles.desktopRightCol}>
                  <PromoCarousel />
                </View>
              </View>

              <View style={styles.desktopBottomFull}>
                {renderMotorcycleSection()}
              </View>
            </View>
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
    errorTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 12 },
    errorText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
    retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    retryText: { color: isDark ? '#000' : '#FFF', fontWeight: '800', fontSize: 13 },

    mobileStack: { gap: 16, width: '100%' },
    desktopLayoutWrapper: { width: '100%', gap: 24 },
    desktopGrid: { flexDirection: 'row', gap: 24, width: '100%', alignItems: 'flex-start' },
    desktopLeftCol: { flex: 1.2, minWidth: 340, gap: 16 },
    desktopRightCol: { flex: 1, minWidth: 320, gap: 16 },
    desktopBottomFull: { width: '100%', marginTop: 8 },
    desktopBikeRow: { flexDirection: 'row', gap: 16, width: '100%', alignItems: 'stretch' },
    mobileBikeStack: { flexDirection: 'column', gap: 12, width: '100%' },
    remindersGridDesktop: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    sectionCol: { width: '100%', gap: 12 },

    // Bike card
    bikeSelectorCard: { backgroundColor: colors.surfaceContainer, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
    bikeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bikeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    activeLabel: { color: colors.primaryDim, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    switchBtn: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    switchBtnText: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
    bikeInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    bikePlaceholderImg: { width: 80, height: 60, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    bikeDetails: { flex: 1, gap: 2 },
    bikeName: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
    bikeEngine: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
    bikeMileage: { color: colors.primaryDim, fontSize: 12, fontWeight: '600' },
    plateTag: { alignSelf: 'flex-start', backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
    plateText: { color: colors.textPrimary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    // Empty bike
    emptyBikeCard: { backgroundColor: colors.surfaceContainer, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8 },
    emptyBikeTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
    emptyBikeDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
    addBikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    addBikeBtnText: { color: isDark ? '#000' : '#FFF', fontSize: 13, fontWeight: '800' },

    // Health placeholder
    healthPlaceholder: { backgroundColor: colors.surfaceContainer, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8 },
    healthPlaceholderText: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    healthPlaceholderSub: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },

    // Sections
    sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    viewAllText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    actionBtn: { flex: 1, minWidth: 70, backgroundColor: colors.surfaceContainer, borderRadius: 16, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
    actionIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    actionText: { color: colors.textPrimary, fontSize: 11, fontWeight: '700', textAlign: 'center' },

    // Reminders
    reminderCardBox: { backgroundColor: colors.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10 },
    reminderItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reminderIconText: { fontSize: 18 },
    reminderItemText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
    reminderSubText: { color: colors.textMuted, fontSize: 11 },

    // Banner
    bookingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: isDark ? 'rgba(255, 107, 0, 0.3)' : 'rgba(255, 107, 0, 0.2)', marginTop: 8 },
    bookingBannerTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
    bookingBannerSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
    bookingBannerBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    bookingBannerBtnText: { color: isDark ? '#000' : '#FFF', fontSize: 11, fontWeight: '800' },

    // Warning Alerts
    reminderAlert: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)', marginBottom: 8 },
    reminderAlertTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
    reminderAlertSub: { color: colors.danger, fontSize: 10, fontWeight: '800' },
    statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusBadgeText: { fontSize: 9, fontWeight: '800' },

    // Activity Bookings
    emptyCard: { backgroundColor: colors.surfaceContainer, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8 },
    emptyCardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
    emptyCardDesc: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
    emptyCardBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginTop: 6 },
    emptyCardBtnText: { color: isDark ? '#000' : '#FFF', fontSize: 12, fontWeight: '800' },
    activityCard: { backgroundColor: colors.surfaceContainer, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10, gap: 4 },
    activityBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    completedText: { color: colors.success, fontSize: 9, fontWeight: '800' },
    upcomingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    upcomingText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
    activityTime: { color: colors.textMuted, fontSize: 11 },
    activityTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 2 },
    activityAmount: { color: colors.primaryDim, fontSize: 12, fontWeight: '800' },
  });
