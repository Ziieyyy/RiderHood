import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
  Play,
  ArrowRight,
  Eye,
  Plus,
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import { getMyWorkshop } from '../../services/workshopService';
import { getWorkshopBookings, updateBookingStatus } from '../../services/bookingService';
import { getWorkshopReviews } from '../../services/reviewService';
import { getWorkshopParts } from '../../services/partsService';
import type { Workshop, Booking, Review, Part, BookingStatus } from '../../types/database';

export default function WorkshopDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t, formatCurrency, formatDate } = useTranslation();
  const { isPhone, isTablet, isDesktop, contentPadding } = useResponsive();


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
        const [bksRes, revsRes, partsRes] = await Promise.allSettled([
          getWorkshopBookings(ws.id),
          getWorkshopReviews(ws.id),
          getWorkshopParts(ws.id),
        ]);

        if (bksRes.status === 'fulfilled') {
          setBookings(bksRes.value);
        } else {
          console.error('Failed to load bookings:', bksRes.reason);
        }

        if (revsRes.status === 'fulfilled') {
          setReviews(revsRes.value);
        } else {
          console.error('Failed to load reviews:', revsRes.reason);
          setReviews([]);
        }

        if (partsRes.status === 'fulfilled') {
          setParts(partsRes.value);
        } else {
          setParts([]);
        }

        if (bksRes.status === 'rejected') {
          throw bksRes.reason;
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load workshop dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute real KPIs
  const todayIso = new Date().toISOString().split('T')[0];
  const todaysBookings = bookings.filter((b) => b.booking_date === todayIso);
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const inProgressBookings = bookings.filter((b) => b.status === 'in_progress');
  const completedTodayBookings = bookings.filter(
    (b) => b.status === 'completed' && b.booking_date === todayIso
  );

  // Monthly revenue: sum of completed bookings this month
  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyRevenue = bookings
    .filter((b) => b.status === 'completed' && b.booking_date.startsWith(thisMonthStr))
    .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  // Low stock parts
  const lowStockParts = parts.filter(
    (p) => p.stock_status === 'LOW_STOCK' || p.stock_status === 'OUT_OF_STOCK'
  );

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    if (!profile?.id) return;
    setActionLoading(bookingId + '_' + newStatus);
    try {
      await updateBookingStatus(bookingId, newStatus, profile.id);
      await loadData();
    } catch (err: any) {
      Alert.alert('Status Update Error', err?.message || 'Failed to update booking status.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={COLORS.danger} size={40} />
        <Text style={styles.errorTitle}>{t('errors.genericTitle')}</Text>
        <Text style={styles.errorDesc}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <WorkshopAdminHeader
        title={t('workshopAdmin.dashboard')}
        subtitle={workshop ? workshop.name : 'Workshop Operations'}
      />

      <ScrollView
        style={styles.scrollView}
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
          {/* Welcome Greeting Header */}
          <View style={styles.welcomeCard}>
          <View style={styles.welcomeTextGroup}>
            <Text style={styles.greetingTitle}>
              {t('common.welcome')}, {profile?.full_name?.split(' ')[0] || 'Admin'} 👋
            </Text>
            <Text style={styles.greetingSub}>
              {workshop?.name || 'RiderHood Workshop'} • {workshop?.district || 'Main Hub'}
            </Text>
          </View>
          <View style={styles.welcomeActions}>
            <TouchableOpacity
              style={styles.welcomeSecondaryBtn}
              onPress={() => router.push('/(workshop)/profile')}
            >
              <Eye color={COLORS.textPrimary} size={14} />
              <Text style={styles.welcomeSecBtnText}>{t('workshop.viewWorkshop')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.welcomePrimaryBtn}
              onPress={() => router.push('/(workshop)/profile')}
            >
              <Wrench color="#FFFFFF" size={14} />
              <Text style={styles.welcomePriBtnText}>{t('workshopAdmin.editWorkshopProfile')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KPI Summary Grid */}
        <View style={styles.kpiGrid}>
          {/* Today Bookings */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => router.push('/(workshop)/bookings?filter=today')}
            activeOpacity={0.8}
          >
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBadge, { backgroundColor: 'rgba(255, 107, 0, 0.15)' }]}>
                <CalendarDays color={COLORS.primary} size={18} />
              </View>
              <ChevronRight color={COLORS.textMuted} size={16} />
            </View>
            <Text style={styles.kpiValue}>{todaysBookings.length}</Text>
            <Text style={styles.kpiLabel}>{t('workshopAdmin.todaysBookings').toUpperCase()}</Text>
            <Text style={styles.kpiSubText}>{t('workshopAdmin.todaysBookings')}</Text>
          </TouchableOpacity>

          {/* Pending Confirmations */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => router.push('/(workshop)/bookings?status=pending')}
            activeOpacity={0.8}
          >
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Clock color={COLORS.warning} size={18} />
              </View>
              <ChevronRight color={COLORS.textMuted} size={16} />
            </View>
            <Text style={styles.kpiValue}>{pendingBookings.length}</Text>
            <Text style={styles.kpiLabel}>{t('workshopAdmin.pendingBookings').toUpperCase()}</Text>
            <Text style={styles.kpiSubText}>{t('booking.pendingApproval')}</Text>
          </TouchableOpacity>

          {/* In Progress */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => router.push('/(workshop)/bookings?status=in_progress')}
            activeOpacity={0.8}
          >
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Wrench color="#38bdf8" size={18} />
              </View>
              <ChevronRight color={COLORS.textMuted} size={16} />
            </View>
            <Text style={styles.kpiValue}>{inProgressBookings.length}</Text>
            <Text style={styles.kpiLabel}>{t('booking.inProgress').toUpperCase()}</Text>
            <Text style={styles.kpiSubText}>{t('booking.inProgress')}</Text>
          </TouchableOpacity>

          {/* Completed Today */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => router.push('/(workshop)/bookings?status=completed')}
            activeOpacity={0.8}
          >
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <CheckCircle2 color={COLORS.success} size={18} />
              </View>
              <ChevronRight color={COLORS.textMuted} size={16} />
            </View>
            <Text style={styles.kpiValue}>{completedTodayBookings.length}</Text>
            <Text style={styles.kpiLabel}>{t('workshopAdmin.completedServices').toUpperCase()}</Text>
            <Text style={styles.kpiSubText}>{t('booking.bookingCompleted')}</Text>
          </TouchableOpacity>

          {/* Monthly Revenue */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => router.push('/(workshop)/reports?period=month')}
            activeOpacity={0.8}
          >
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <DollarSign color={COLORS.success} size={18} />
              </View>
              <ChevronRight color={COLORS.textMuted} size={16} />
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(monthlyRevenue)}</Text>
            <Text style={styles.kpiLabel}>{t('workshopAdmin.monthlyRevenue').toUpperCase()}</Text>
            <Text style={styles.kpiSubText}>
              {bookings.filter((b) => b.status === 'completed' && b.booking_date.startsWith(thisMonthStr)).length} {t('navigation.bookings')}
            </Text>
          </TouchableOpacity>

          {/* Workshop Rating */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => router.push('/(workshop)/reviews')}
            activeOpacity={0.8}
          >
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Star color={COLORS.secondaryOrange} size={18} />
              </View>
              <ChevronRight color={COLORS.textMuted} size={16} />
            </View>
            <Text style={styles.kpiValue}>
              {workshop ? Number(workshop.rating).toFixed(1) : '0.0'} ★
            </Text>
            <Text style={styles.kpiLabel}>{t('workshopAdmin.workshopRating').toUpperCase()}</Text>
            <Text style={styles.kpiSubText}>
              {workshop?.review_count || reviews.length} {t('workshopAdmin.reviews')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Bar */}
        <Text style={styles.sectionHeaderTitle}>{t('dashboard.recentActivity').toUpperCase()}</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(workshop)/bookings')}
          >
            <CalendarDays color={COLORS.primary} size={18} />
            <Text style={styles.quickBtnText}>{t('workshopAdmin.viewBookings')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(workshop)/services')}
          >
            <Plus color={COLORS.primary} size={18} />
            <Text style={styles.quickBtnText}>{t('workshopAdmin.addService')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(workshop)/services')}
          >
            <Wrench color={COLORS.primary} size={18} />
            <Text style={styles.quickBtnText}>{t('workshopAdmin.serviceCatalog')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(workshop)/customers')}
          >
            <Users color={COLORS.primary} size={18} />
            <Text style={styles.quickBtnText}>{t('workshopAdmin.customerDirectory')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(workshop)/reports')}
          >
            <TrendingUp color={COLORS.primary} size={18} />
            <Text style={styles.quickBtnText}>{t('workshopAdmin.reports')}</Text>
          </TouchableOpacity>
        </View>

        {/* Low Stock Alert Header if applicable */}
        {lowStockParts.length > 0 && (
          <TouchableOpacity
            style={styles.alertBannerCard}
            onPress={() => router.push('/(workshop)/parts')}
          >
            <AlertTriangle color={COLORS.warning} size={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertBannerTitle}>
                {lowStockParts.length} {t('workshopAdmin.lowStockItems')}
              </Text>
              <Text style={styles.alertBannerSub}>
                {lowStockParts.slice(0, 3).map((p: Part) => p.name).join(', ')}
              </Text>
            </View>
            <Text style={styles.alertActionText}>{t('navigation.spareParts')} &gt;</Text>
          </TouchableOpacity>
        )}

        {/* Today's Booking Queue Section */}
        <View style={styles.queueHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>{t('workshopAdmin.todaysBookings').toUpperCase()} ({todaysBookings.length})</Text>
          <TouchableOpacity onPress={() => router.push('/(workshop)/bookings')}>
            <Text style={styles.viewAllQueueText}>{t('workshopAdmin.viewBookings')} &gt;</Text>
          </TouchableOpacity>
        </View>

        {todaysBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <CalendarDays color={COLORS.textMuted} size={32} />
            <Text style={styles.emptyTitle}>{t('empty.noBookings')}</Text>
            <Text style={styles.emptyDesc}>
              {t('empty.noBookingsSub')}
            </Text>
          </View>
        ) : (
          todaysBookings.map((bk) => {
            const cust = bk.customer as any;
            const bike = bk.motorcycle as any;
            const servicesList = bk.booking_services
              ?.map((s) => s.service_name_snapshot)
              .join(', ') || 'General Servicing';

            return (
              <View key={bk.id} style={styles.bookingCard}>
                <View style={styles.bookingMainRow}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarLetters}>
                      {(cust?.full_name || 'Customer').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.bookingTopLine}>
                      <Text style={styles.customerNameText}>{cust?.full_name || 'Customer'}</Text>
                      <View style={[styles.statusBadge, getStatusStyle(bk.status)]}>
                        <Text style={[styles.statusBadgeText, getStatusTextStyle(bk.status)]}>
                          {bk.status.toUpperCase().replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.bikeText}>
                      🏍️ {bike ? `${bike.brand} ${bike.model} (${bike.plate_number})` : 'Motorcycle'}
                    </Text>
                    <Text style={styles.serviceText}>🛠️ {servicesList}</Text>
                    <Text style={styles.metaText}>
                      ⏰ {bk.booking_time} • {t('common.total')}: <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{formatCurrency(bk.total_amount || 0)}</Text>
                    </Text>
                  </View>
                </View>

                {/* Workflow Actions */}
                <View style={styles.bookingActionsRow}>
                  {bk.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleStatusChange(bk.id, 'confirmed')}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === bk.id + '_confirmed' ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.acceptBtnText}>{t('workshopAdmin.confirmBooking')}</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleStatusChange(bk.id, 'rejected')}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === bk.id + '_rejected' ? (
                          <ActivityIndicator size="small" color={COLORS.danger} />
                        ) : (
                          <Text style={styles.rejectBtnText}>{t('workshopAdmin.rejectBooking')}</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {bk.status === 'confirmed' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.startBtn]}
                        onPress={() => handleStatusChange(bk.id, 'in_progress')}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === bk.id + '_in_progress' ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <><Play color="#FFFFFF" size={12} /><Text style={styles.startBtnText}>{t('workshopAdmin.startService')}</Text></>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.secondaryActionBtn]}
                        onPress={() => router.push(`/(workshop)/bookings?id=${bk.id}`)}
                      >
                        <Text style={styles.secondaryActionText}>{t('booking.rescheduleBooking')}</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {bk.status === 'in_progress' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.completeBtn]}
                      onPress={() => handleStatusChange(bk.id, 'completed')}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === bk.id + '_completed' ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <><CheckCircle2 color="#FFFFFF" size={12} /><Text style={styles.completeBtnText}>{t('workshopAdmin.completeService')}</Text></>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.viewBtn]}
                    onPress={() => router.push(`/(workshop)/bookings?id=${bk.id}`)}
                  >
                    <Eye color={COLORS.textSecondary} size={14} />
                    <Text style={styles.viewBtnText}>{t('common.view')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

function getStatusStyle(status: BookingStatus) {
  switch (status) {
    case 'pending':
      return { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: COLORS.warning };
    case 'confirmed':
      return { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' };
    case 'in_progress':
      return { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: COLORS.primary };
    case 'completed':
      return { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: COLORS.success };
    case 'cancelled':
    case 'rejected':
      return { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: COLORS.danger };
    default:
      return { backgroundColor: COLORS.cards, borderColor: COLORS.border };
  }
}

function getStatusTextStyle(status: BookingStatus) {
  switch (status) {
    case 'pending':
      return { color: COLORS.warning };
    case 'confirmed':
      return { color: '#38bdf8' };
    case 'in_progress':
      return { color: COLORS.primary };
    case 'completed':
      return { color: COLORS.success };
    case 'cancelled':
    case 'rejected':
      return { color: COLORS.danger };
    default:
      return { color: COLORS.textSecondary };
  }
}

const styles = StyleSheet.create({
  screenContainer: {
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
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 20,
    gap: 18,
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: COLORS.cards,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  welcomeTextGroup: {
    gap: 4,
  },
  greetingTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  greetingSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  welcomeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  welcomeSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.elevatedCards,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  welcomeSecBtnText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  welcomePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  welcomePriBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.cards,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  kpiLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiSubText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cards,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  alertBannerCard: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.warning,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertBannerTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  alertBannerSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  alertActionText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllQueueText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.cards,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: COLORS.cards,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  bookingMainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetters: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  bookingTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerNameText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bikeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  serviceText: {
    color: COLORS.primaryDim,
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  bookingActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rejectBtn: {
    backgroundColor: COLORS.elevatedCards,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  rejectBtnText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: '#38bdf8',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  completeBtn: {
    backgroundColor: COLORS.success,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    backgroundColor: COLORS.elevatedCards,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  secondaryActionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  viewBtn: {
    backgroundColor: COLORS.elevatedCards,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 'auto',
  },
  viewBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
