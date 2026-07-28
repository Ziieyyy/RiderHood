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
import { COLORS } from '../../constants/theme';
import { getMotorcycles } from '../../services/motorcycleService';
import { getCustomerBookings } from '../../services/bookingService';
import { getReminders, calculateHealthScore } from '../../services/maintenanceService';
import { Header } from '../../components/Header';
import { HealthGauge } from '../../components/HealthGauge';
import {
  Wrench,
  Calendar,
  Clock,
  CheckCircle2,
  Bike,
  AlertTriangle,
  FileText,
  Plus,
  LogOut,
  RefreshCw,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import type { Motorcycle, Booking, MaintenanceReminder } from '../../types/database';

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

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

  useEffect(() => { loadData(); }, [loadData]);

  const handleSwitchBike = async () => {
    if (motorcycles.length < 2 || !selectedBike) return;
    const idx = motorcycles.findIndex(b => b.id === selectedBike.id);
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
    } catch { /* retain previous state */ }
  };

  const recentBookings = bookings.slice(0, 3);
  const dueReminders = reminders.filter(r => r.status === 'due' || r.status === 'overdue');
  const upcomingReminders = reminders.filter(r => r.status === 'upcoming').slice(0, 3);

  // Get the latest upcoming/active booking
  const nextBooking = bookings.find(
    b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'in_progress'
  );

  // ─── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="RiderHood" subtitle={`Welcome, ${user?.full_name || 'Rider'} 👋`} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your garage...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="RiderHood" subtitle={`Welcome, ${user?.full_name || 'Rider'} 👋`} />
        <View style={styles.centered}>
          <RefreshCw color={COLORS.danger} size={40} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData} accessibilityLabel="Retry loading data">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="RiderHood" subtitle={`Welcome, ${user?.full_name || 'Rider'} 👋`} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        {/* ─── Motorcycle Card ──────────────────────────────── */}
        {selectedBike ? (
          <View style={styles.bikeSelectorCard}>
            <View style={styles.bikeHeaderRow}>
              <View style={styles.bikeBadgeRow}>
                <Bike color={COLORS.primary} size={18} />
                <Text style={styles.activeLabel}>ACTIVE MOTORCYCLE</Text>
              </View>
              {motorcycles.length > 1 && (
                <TouchableOpacity style={styles.switchBtn} activeOpacity={0.7} onPress={handleSwitchBike} accessibilityLabel="Switch motorcycle">
                  <Text style={styles.switchBtnText}>Switch 🔄</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.bikeInfoRow}>
              <View style={styles.bikePlaceholderImg}>
                <Bike color={COLORS.textMuted} size={28} />
              </View>
              <View style={styles.bikeDetails}>
                <Text style={styles.bikeName}>{selectedBike.nickname || `${selectedBike.brand} ${selectedBike.model}`}</Text>
                <Text style={styles.bikeEngine}>{selectedBike.brand} {selectedBike.model} • {selectedBike.year}</Text>
                <Text style={styles.bikeMileage}>📍 {selectedBike.current_mileage.toLocaleString()} km</Text>
                <View style={styles.plateTag}>
                  <Text style={styles.plateText}>{selectedBike.plate_number}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyBikeCard}>
            <Bike color={COLORS.textMuted} size={44} />
            <Text style={styles.emptyBikeTitle}>No Motorcycle Added</Text>
            <Text style={styles.emptyBikeDesc}>Add your motorcycle to start tracking health, maintenance & bookings.</Text>
            <TouchableOpacity style={styles.addBikeBtn} onPress={() => router.push('/(customer)/profile')} activeOpacity={0.8} accessibilityLabel="Add motorcycle">
              <Plus color="#000" size={16} />
              <Text style={styles.addBikeBtnText}>Add Motorcycle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Health Score ─────────────────────────────────── */}
        {selectedBike && (
          <>
            {healthScore !== null ? (
              <HealthGauge
                score={healthScore}
                bikeName={selectedBike.nickname || `${selectedBike.brand} ${selectedBike.model}`}
                status={
                  healthScore >= 85 ? 'Optimal Condition' :
                  healthScore >= 60 ? 'Service Recommended' : 'Attention Required'
                }
              />
            ) : (
              <View style={styles.healthPlaceholder}>
                <Wrench color={COLORS.textMuted} size={28} />
                <Text style={styles.healthPlaceholderText}>Health Score</Text>
                <Text style={styles.healthPlaceholderSub}>Not enough data — record your first service to begin tracking.</Text>
              </View>
            )}
          </>
        )}

        {/* ─── Quick Actions ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => router.push('/(customer)/workshops')} accessibilityLabel="Find workshop">
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary }]}>
              <Wrench color={COLORS.primary} size={22} />
            </View>
            <Text style={styles.actionText}>Find Workshop</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => router.push('/(customer)/booking')} accessibilityLabel="Book service">
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary }]}>
              <Calendar color={COLORS.primary} size={22} />
            </View>
            <Text style={styles.actionText}>Book Service</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => router.push('/(customer)/history')} accessibilityLabel="View history">
            <View style={[styles.actionIcon, { backgroundColor: COLORS.surfaceContainer, borderColor: COLORS.border }]}>
              <Clock color={COLORS.textPrimary} size={22} />
            </View>
            <Text style={styles.actionText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => router.push('/(customer)/profile')} accessibilityLabel="Add motorcycle">
            <View style={[styles.actionIcon, { backgroundColor: COLORS.surfaceContainer, borderColor: COLORS.border }]}>
              <Plus color={COLORS.textPrimary} size={22} />
            </View>
            <Text style={styles.actionText}>Add Motorcycle</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Service Reminders from DB ────────────────────── */}
        {reminders.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>SERVICE REMINDERS</Text>
            <View style={styles.reminderCardBox}>
              {upcomingReminders.length > 0 ? (
                upcomingReminders.map(r => (
                  <View key={r.id} style={styles.reminderItemRow}>
                    <Text style={styles.reminderIconText}>
                      {r.type === 'oil_change' ? '🛢️' : r.type === 'chain' ? '⚙️' : r.type === 'brake' ? '🛑' : '🔧'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reminderItemText}>{r.title}</Text>
                      {r.next_service_mileage && (
                        <Text style={styles.reminderSubText}>Due at {r.next_service_mileage.toLocaleString()} km</Text>
                      )}
                      {r.next_service_date && (
                        <Text style={styles.reminderSubText}>Due: {new Date(r.next_service_date).toLocaleDateString()}</Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.reminderItemRow}>
                  <CheckCircle2 color={COLORS.success} size={18} />
                  <Text style={styles.reminderItemText}>All reminders are up to date!</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ─── Book Service Banner ────────────────────────── */}
        {!nextBooking && selectedBike && (
          <TouchableOpacity
            style={styles.bookingBanner}
            activeOpacity={0.8}
            onPress={() => router.push('/(customer)/booking')}
            accessibilityLabel="Book a service"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingBannerTitle}>Need a Service?</Text>
              <Text style={styles.bookingBannerSub}>Book a service slot at a nearby certified workshop.</Text>
            </View>
            <View style={styles.bookingBannerBtn}>
              <Text style={styles.bookingBannerBtnText}>BOOK NOW</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ─── Due Reminders ────────────────────────────────── */}
        {dueReminders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>⚠️ ATTENTION REQUIRED</Text>
            {dueReminders.slice(0, 3).map(r => (
              <View key={r.id} style={styles.reminderAlert}>
                <AlertTriangle color={COLORS.danger} size={16} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderAlertTitle}>{r.title}</Text>
                  <Text style={styles.reminderAlertSub}>{r.status === 'overdue' ? 'OVERDUE' : 'DUE NOW'}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: r.status === 'overdue' ? COLORS.danger : '#f59e0b' }]}>
                  <Text style={[styles.statusBadgeText, { color: r.status === 'overdue' ? COLORS.danger : '#f59e0b' }]}>
                    {r.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ─── Recent Bookings ──────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>RECENT BOOKINGS</Text>
        {recentBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar color={COLORS.textMuted} size={32} />
            <Text style={styles.emptyCardTitle}>No bookings yet</Text>
            <Text style={styles.emptyCardDesc}>Find a certified workshop and book your first service.</Text>
            <TouchableOpacity style={styles.emptyCardBtn} onPress={() => router.push('/(customer)/workshops')} activeOpacity={0.8} accessibilityLabel="Find a workshop">
              <Text style={styles.emptyCardBtnText}>Find a Workshop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentBookings.map(bk => (
            <TouchableOpacity key={bk.id} style={styles.activityCard} activeOpacity={0.8} onPress={() => router.push('/(customer)/history')}>
              <View style={styles.activityBadgeRow}>
                {bk.status === 'completed' ? (
                  <View style={styles.completedBadge}>
                    <CheckCircle2 color={COLORS.success} size={12} />
                    <Text style={styles.completedText}>COMPLETED</Text>
                  </View>
                ) : (
                  <View style={styles.upcomingBadge}>
                    <Clock color={COLORS.primary} size={12} />
                    <Text style={styles.upcomingText}>{bk.status.toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.activityTime}>{bk.booking_date}</Text>
              </View>
              <Text style={styles.activityTitle}>
                {((bk.workshop as unknown as Record<string, unknown>)?.name as string) ?? 'Workshop Service'}
              </Text>
              <Text style={styles.activityAmount}>
                Total: RM {Number(bk.total_amount).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} accessibilityLabel="Logout">
          <LogOut color={COLORS.danger} size={18} />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 12 },
  errorText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  // Bike card
  bikeSelectorCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, gap: 12 },
  bikeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bikeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeLabel: { color: COLORS.primaryDim, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  switchBtn: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  switchBtnText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '700' },
  bikeInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bikePlaceholderImg: { width: 80, height: 60, borderRadius: 12, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  bikeDetails: { flex: 1, gap: 2 },
  bikeName: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
  bikeEngine: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  bikeMileage: { color: COLORS.primaryDim, fontSize: 12, fontWeight: '600' },
  plateTag: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  plateText: { color: COLORS.textPrimary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  // Empty bike
  emptyBikeCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, alignItems: 'center', gap: 8 },
  emptyBikeTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyBikeDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  addBikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  addBikeBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
  // Health placeholder
  healthPlaceholder: { backgroundColor: COLORS.surfaceContainer, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, alignItems: 'center', gap: 8 },
  healthPlaceholderText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  healthPlaceholderSub: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center' },
  // Sections
  sectionTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionBtn: { width: '30%', backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  actionText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  // Reminder alert
  reminderAlert: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.dangerBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.danger, marginBottom: 8 },
  reminderAlertTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  reminderAlertSub: { color: COLORS.danger, fontSize: 11, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  // Activity
  activityCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, gap: 4 },
  activityBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  upcomingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryDark, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  upcomingText: { color: COLORS.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.successBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.success },
  completedText: { color: COLORS.success, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  activityTime: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  activityTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  activityAmount: { color: COLORS.primaryDim, fontSize: 12, fontWeight: '600' },
  // Empty card
  emptyCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 8, marginBottom: 12 },
  emptyCardTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyCardDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  emptyCardBtn: { backgroundColor: COLORS.primaryDark, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, marginTop: 4 },
  emptyCardBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.surfaceContainer, borderRadius: 14, paddingVertical: 14, marginTop: 24, borderWidth: 1, borderColor: COLORS.dangerBg },
  logoutBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },
  // Reminder Card Box (real data)
  reminderCardBox: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    marginBottom: 20,
    gap: 12,
  },
  reminderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderIconText: {
    fontSize: 18,
  },
  reminderItemText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  reminderSubText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  // Booking Banner
  bookingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryDark,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 20,
    gap: 12,
  },
  bookingBannerTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  bookingBannerSub: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  bookingBannerBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bookingBannerBtnText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
