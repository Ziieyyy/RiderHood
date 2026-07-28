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
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  DollarSign,
  Star,
  Wrench,
  Package,
  Users,
  AlertTriangle,
  RefreshCw,
  XCircle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop, getWorkshopServices } from '../../services/workshopService';
import { getWorkshopBookings, updateBookingStatus } from '../../services/bookingService';
import { getWorkshopReviews } from '../../services/reviewService';
import { getWorkshopParts } from '../../services/partsService';
import type { Workshop, Booking, Review, Part } from '../../types/database';

export default function WorkshopDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      setWorkshop(ws);

      if (ws) {
        const [bks, revs, pts] = await Promise.all([
          getWorkshopBookings(ws.id),
          getWorkshopReviews(ws.id),
          getWorkshopParts(ws.id),
        ]);
        setBookings(bks);
        setReviews(revs);
        setParts(pts);
      }
    } catch {
      setError('Failed to load workshop data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Compute real KPIs
  const today = new Date().toISOString().split('T')[0];
  const todaysBookings = bookings.filter(b => b.booking_date === today);
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const inProgressBookings = bookings.filter(b => b.status === 'in_progress');
  const completedBookings = bookings.filter(b => b.status === 'completed');

  // Monthly revenue: sum of completed bookings this month
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyRevenue = bookings
    .filter(b => b.status === 'completed' && b.booking_date.startsWith(thisMonth))
    .reduce((sum, b) => sum + Number(b.total_amount), 0);

  // Low stock parts
  const lowStockParts = parts.filter(p => p.stock_status === 'LOW_STOCK' || p.stock_status === 'OUT_OF_STOCK');

  const handleAcceptBooking = async (bookingId: string) => {
    if (!profile?.id) return;
    setActionLoading(bookingId + '_accept');
    try {
      await updateBookingStatus(bookingId, 'confirmed', profile.id);
      await loadData();
    } catch { /* error handled silently, data reloaded */ } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    if (!profile?.id) return;
    setActionLoading(bookingId + '_reject');
    try {
      await updateBookingStatus(bookingId, 'rejected', profile.id);
      await loadData();
    } catch { /* error handled silently, data reloaded */ } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading workshop data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={COLORS.danger} size={40} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorDesc}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData} accessibilityLabel="Retry loading data">
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!workshop) {
    return (
      <View style={styles.centered}>
        <Wrench color={COLORS.textMuted} size={44} />
        <Text style={styles.errorTitle}>No Workshop Found</Text>
        <Text style={styles.errorDesc}>Your workshop profile could not be found. Please contact support.</Text>
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
      {/* Header Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerHeader}>
          <Text style={styles.bannerTitle}>{workshop.name}</Text>
          <View style={styles.statusChip}>
            <View style={[styles.greenPulse, { backgroundColor: workshop.is_open ? COLORS.success : COLORS.danger }]} />
            <Text style={styles.statusText}>{workshop.is_open ? 'OPEN' : 'CLOSED'}</Text>
          </View>
        </View>
        <Text style={styles.bannerSub}>
          {workshop.verification_status === 'approved' ? 'Certified RiderHood Service Partner' : `Status: ${workshop.verification_status}`}
          {workshop.district ? ` • ${workshop.district}` : ''}
        </Text>
      </View>

      {/* Real KPI Metric Cards */}
      <Text style={styles.sectionTitle}>WORKSHOP PERFORMANCE METRICS</Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <CalendarDays color="#f59e0b" size={18} />
            <Text style={styles.kpiLabel}>TODAY'S BOOKINGS</Text>
          </View>
          <Text style={styles.kpiValue}>{todaysBookings.length}</Text>
          <Text style={styles.kpiSub}>
            {todaysBookings.filter(b => b.status === 'confirmed').length} Confirmed • {todaysBookings.filter(b => b.status === 'in_progress').length} In Progress
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Clock color={COLORS.primary} size={18} />
            <Text style={styles.kpiLabel}>PENDING</Text>
          </View>
          <Text style={styles.kpiValue}>{pendingBookings.length}</Text>
          <Text style={styles.kpiSub}>{pendingBookings.length > 0 ? 'Action Required' : 'All clear'}</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <CheckCircle2 color={COLORS.success} size={18} />
            <Text style={styles.kpiLabel}>COMPLETED</Text>
          </View>
          <Text style={styles.kpiValue}>{completedBookings.length}</Text>
          <Text style={styles.kpiSub}>All Time</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <DollarSign color={COLORS.success} size={18} />
            <Text style={styles.kpiLabel}>MONTHLY REVENUE</Text>
          </View>
          <Text style={styles.kpiValue}>RM {monthlyRevenue.toFixed(0)}</Text>
          <Text style={styles.kpiSub}>This Month</Text>
        </View>

        <View style={[styles.kpiCard, { width: '100%' }]}>
          <View style={styles.kpiHeader}>
            <Star color="#f59e0b" size={18} />
            <Text style={styles.kpiLabel}>AVERAGE RATING</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.kpiValue}>{Number(workshop.rating).toFixed(1)}</Text>
            <Text style={{ color: '#f59e0b', fontSize: 18 }}>
              {'★'.repeat(Math.round(Number(workshop.rating)))}{'☆'.repeat(5 - Math.round(Number(workshop.rating)))}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>({workshop.review_count} Reviews)</Text>
          </View>
        </View>
      </View>

      {/* Low Stock Alert */}
      {lowStockParts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⚠️ LOW STOCK ALERTS</Text>
          <View style={styles.alertCard}>
            <AlertTriangle color="#f59e0b" size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{lowStockParts.length} parts need restocking</Text>
              <Text style={styles.alertSub}>
                {lowStockParts.slice(0, 2).map(p => p.name).join(', ')}
                {lowStockParts.length > 2 ? ` and ${lowStockParts.length - 2} more` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(workshop)/parts')} accessibilityLabel="View low stock parts">
              <Text style={styles.viewAllText}>View</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Pending Booking Requests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>PENDING BOOKING REQUESTS ({pendingBookings.length})</Text>
        <TouchableOpacity onPress={() => router.push('/(workshop)/bookings')} accessibilityLabel="Manage all bookings">
          <Text style={styles.viewAllText}>Manage All</Text>
        </TouchableOpacity>
      </View>

      {pendingBookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <CheckCircle2 color={COLORS.success} size={28} />
          <Text style={styles.emptyTitle}>No pending bookings</Text>
          <Text style={styles.emptyDesc}>All booking requests have been processed.</Text>
        </View>
      ) : (
        pendingBookings.slice(0, 3).map(bk => (
          <View key={bk.id} style={styles.bookingActionCard}>
            <View style={styles.bookingRow}>
              <View style={styles.customerAvatar}>
                <Text style={styles.avatarInitials}>
                  {((bk.customer as unknown as Record<string, unknown>)?.full_name as string || 'C')
                    .split(' ')
                    .map((w: string) => w[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName}>
                  {(bk.customer as unknown as Record<string, unknown>)?.full_name as string || 'Customer'}
                  {bk.motorcycle ? ` (${(bk.motorcycle as unknown as Record<string, unknown>)?.brand} ${(bk.motorcycle as unknown as Record<string, unknown>)?.model})` : ''}
                </Text>
                <Text style={styles.serviceRequested}>
                  {bk.booking_services?.map(s => s.service_name_snapshot).join(', ') || 'Service Booking'}
                </Text>
                <Text style={styles.bookingTime}>{bk.booking_date} @ {bk.booking_time} • RM {Number(bk.total_amount).toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleAcceptBooking(bk.id)}
                disabled={actionLoading !== null}
                activeOpacity={0.8}
                accessibilityLabel="Accept booking"
              >
                {actionLoading === bk.id + '_accept'
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.acceptText}>Accept Booking</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleRejectBooking(bk.id)}
                disabled={actionLoading !== null}
                activeOpacity={0.8}
                accessibilityLabel="Reject booking"
              >
                {actionLoading === bk.id + '_reject'
                  ? <ActivityIndicator size="small" color={COLORS.danger} />
                  : <><XCircle color={COLORS.danger} size={14} /><Text style={styles.rejectText}>Reject</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Quick Navigation Cards */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>QUICK WORKSHOP MANAGEMENT</Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(workshop)/services')} accessibilityLabel="Manage services">
          <Wrench color="#f59e0b" size={24} />
          <Text style={styles.quickTitle}>Manage Services</Text>
          <Text style={styles.quickDesc}>Add or edit prices & packages</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(workshop)/parts')} accessibilityLabel="Parts inventory">
          <Package color="#f59e0b" size={24} />
          <Text style={styles.quickTitle}>Parts Inventory</Text>
          <Text style={styles.quickDesc}>Update stock & prices</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(workshop)/customers')} accessibilityLabel="View customers">
          <Users color="#f59e0b" size={24} />
          <Text style={styles.quickTitle}>Customers</Text>
          <Text style={styles.quickDesc}>View history & contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(workshop)/reviews')} accessibilityLabel="Customer reviews">
          <Star color="#f59e0b" size={24} />
          <Text style={styles.quickTitle}>Customer Reviews</Text>
          <Text style={styles.quickDesc}>Reply to customer feedback</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: COLORS.background,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  errorDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  bannerCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#3b2f10',
    gap: 6,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b2f10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  viewAllText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  kpiSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.warningBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  alertTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  alertSub: { color: COLORS.textSecondary, fontSize: 11 },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  bookingActionCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3b2f10',
    gap: 14,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#3b2f10',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  avatarInitials: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '800',
  },
  custName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  serviceRequested: {
    color: COLORS.primaryDim,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  bookingTime: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#f59e0b',
  },
  acceptText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  rejectBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rejectText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '48%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  quickTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  quickDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});
