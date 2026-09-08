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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, DARK_COLORS } from '../../constants/theme';
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
  ShieldCheck,
  Calendar,
  Phone,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
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
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

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
  const thisMonthCompletedBookings = bookings.filter(
    (b) => b.status === 'completed' && b.booking_date.startsWith(thisMonthStr)
  );
  const monthlyRevenue = thisMonthCompletedBookings.reduce(
    (sum, b) => sum + Number(b.total_amount || 0),
    0
  );

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

  const getInitials = (name?: string) => {
    if (!name) return 'CU';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={colors.danger} size={40} />
        <Text style={styles.errorTitle}>{t('errors.genericTitle')}</Text>
        <Text style={styles.errorDesc}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const kpis = [
    {
      id: 'today',
      title: "Today's Bookings",
      value: String(todaysBookings.length),
      subtext: `${todaysBookings.filter((b) => b.status === 'confirmed').length} confirmed today`,
      icon: CalendarDays,
      color: colors.primary,
      bg: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)',
      route: '/(workshop)/bookings?filter=today',
    },
    {
      id: 'pending',
      title: 'Pending Bookings',
      value: String(pendingBookings.length),
      subtext: 'Awaiting your confirmation',
      icon: Clock,
      color: '#F59E0B',
      bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
      route: '/(workshop)/bookings?status=pending',
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      value: String(inProgressBookings.length),
      subtext: 'Currently servicing',
      icon: Wrench,
      color: '#38BDF8',
      bg: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.12)',
      route: '/(workshop)/bookings?status=in_progress',
    },
    {
      id: 'completed',
      title: 'Completed Today',
      value: String(completedTodayBookings.length),
      subtext: 'Successfully serviced',
      icon: CheckCircle2,
      color: colors.success,
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
      route: '/(workshop)/bookings?status=completed',
    },
    {
      id: 'revenue',
      title: 'Monthly Revenue',
      value: formatCurrency(monthlyRevenue),
      subtext: `${thisMonthCompletedBookings.length} completed this month`,
      icon: DollarSign,
      color: colors.success,
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
      route: '/(workshop)/reports?period=month',
    },
    {
      id: 'rating',
      title: 'Workshop Rating',
      value: `${workshop ? Number(workshop.rating).toFixed(1) : '0.0'} ★`,
      subtext: `Based on ${workshop?.review_count || reviews.length} customer reviews`,
      icon: Star,
      color: '#F59E0B',
      bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
      route: '/(workshop)/reviews',
    },
  ];

  const quickActions = [
    { label: t('workshopAdmin.viewBookings'), icon: CalendarDays, route: '/(workshop)/bookings' },
    { label: t('workshopAdmin.addService'), icon: Plus, route: '/(workshop)/services' },
    { label: t('workshopAdmin.customerDirectory'), icon: Users, route: '/(workshop)/customers' },
    { label: t('workshopAdmin.reports'), icon: TrendingUp, route: '/(workshop)/reports' },
  ];

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
            tintColor={colors.primary}
          />
        }
      >
        <ResponsiveContainer>
          {/* Welcome Greeting Banner */}
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
                activeOpacity={0.8}
              >
                <Eye color={colors.textPrimary} size={14} />
                <Text style={styles.welcomeSecBtnText}>{t('workshop.viewWorkshop')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.welcomePrimaryBtn}
                onPress={() => router.push('/(workshop)/profile')}
                activeOpacity={0.8}
              >
                <Wrench color="#FFFFFF" size={14} />
                <Text style={styles.welcomePriBtnText}>{t('workshopAdmin.editWorkshopProfile')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* KPI Summary Grid (3 Columns on Desktop, 2 on Tablet/Mobile) */}
          <ResponsiveGrid columns={{ phone: 2, tablet: 3, desktop: 3 }} gap={14}>
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <TouchableOpacity
                  key={kpi.id}
                  style={styles.kpiCard}
                  onPress={() => router.push(kpi.route as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconBadge, { backgroundColor: kpi.bg }]}>
                      <Icon color={kpi.color} size={18} />
                    </View>
                    <ChevronRight color={colors.textMuted} size={16} />
                  </View>
                  <Text style={styles.kpiValue} numberOfLines={1}>{kpi.value}</Text>
                  <Text style={styles.kpiTitle} numberOfLines={1}>{kpi.title}</Text>
                  <Text style={styles.kpiSubtext} numberOfLines={1}>{kpi.subtext}</Text>
                </TouchableOpacity>
              );
            })}
          </ResponsiveGrid>

          {/* Low Stock Warning Banner if any */}
          {lowStockParts.length > 0 && (
            <TouchableOpacity
              style={styles.alertBannerCard}
              onPress={() => router.push('/(workshop)/parts')}
              activeOpacity={0.8}
            >
              <View style={styles.alertIconBadge}>
                <AlertTriangle color={colors.warning} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertBannerTitle}>
                  {lowStockParts.length} {t('workshopAdmin.lowStockItems')}
                </Text>
                <Text style={styles.alertBannerSub} numberOfLines={1}>
                  {lowStockParts.slice(0, 3).map((p: Part) => p.name).join(', ')}
                </Text>
              </View>
              <ChevronRight color={colors.warning} size={16} />
            </TouchableOpacity>
          )}

          {/* Quick Actions Bar */}
          <View style={styles.sectionHeaderWrapper}>
            <Text style={styles.sectionHeaderTitle}>QUICK ACTIONS</Text>
          </View>
          <ResponsiveGrid columns={{ phone: 2, tablet: 4, desktop: 4 }} gap={12}>
            {quickActions.map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickActionCard}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.quickActionIconCircle}>
                    <ActionIcon color={colors.primary} size={18} />
                  </View>
                  <Text style={styles.quickActionLabel} numberOfLines={1}>
                    {action.label}
                  </Text>
                  <ChevronRight color={colors.textMuted} size={14} />
                </TouchableOpacity>
              );
            })}
          </ResponsiveGrid>

          {/* Today's Bookings Queue Section */}
          <View style={styles.queueHeaderRow}>
            <View style={styles.queueHeaderLeft}>
              <Text style={styles.sectionHeaderTitle}>
                {t('workshopAdmin.todaysBookings').toUpperCase()} ({todaysBookings.length})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllQueueBtn}
              onPress={() => router.push('/(workshop)/bookings')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllQueueText}>{t('workshopAdmin.viewBookings')}</Text>
              <ChevronRight color={colors.primary} size={14} />
            </TouchableOpacity>
          </View>

          {todaysBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <CalendarDays color={colors.textMuted} size={40} />
              <Text style={styles.emptyTitle}>{t('empty.noBookings')}</Text>
              <Text style={styles.emptyDesc}>
                {t('empty.noBookingsSub')}
              </Text>
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {todaysBookings.map((bk) => {
                const cust = bk.customer as any;
                const bike = bk.motorcycle as any;
                const refCode = `#RH-${bk.id.slice(0, 8).toUpperCase()}`;

                return (
                  <View key={bk.id} style={styles.bookingCard}>
                    {/* Header */}
                    <View style={styles.bookingCardHeader}>
                      <Text style={styles.refCodeText}>{refCode}</Text>
                      <View style={[styles.statusBadge, getStatusBadgeStyle(bk.status, colors, isDark)]}>
                        <Text style={[styles.statusBadgeText, getStatusTextStyle(bk.status, colors)]}>
                          {bk.status.toUpperCase().replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    {/* Customer */}
                    <View style={styles.customerRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarInitials}>{getInitials(cust?.full_name)}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.customerName} numberOfLines={1}>
                          {cust?.full_name || 'Customer'}
                        </Text>
                        <Text style={styles.customerPhone} numberOfLines={1}>
                          {cust?.phone || cust?.email || 'No contact info'}
                        </Text>
                      </View>
                    </View>

                    {/* Bike Box */}
                    {bike && (
                      <View style={styles.bikeBox}>
                        <Text style={styles.bikeTag} numberOfLines={1}>
                          🏍️ {bike.brand} {bike.model} • {bike.plate_number}
                        </Text>
                      </View>
                    )}

                    {/* Schedule Time & Total */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Clock size={13} color={colors.textMuted} />
                        <Text style={styles.metaText}>{bk.booking_time}</Text>
                      </View>
                      <Text style={styles.totalAmountText}>
                        RM {Number(bk.total_amount || 0).toFixed(2)}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                      {bk.status === 'pending' && (
                        <View style={styles.splitBtnRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.primaryBtn]}
                            onPress={() => handleStatusChange(bk.id, 'confirmed')}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === bk.id + '_confirmed' ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>ACCEPT</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.dangerBtn]}
                            onPress={() => handleStatusChange(bk.id, 'rejected')}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === bk.id + '_rejected' ? (
                              <ActivityIndicator size="small" color={colors.danger} />
                            ) : (
                              <Text style={[styles.actionBtnText, { color: colors.danger }]}>REJECT</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      {bk.status === 'confirmed' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.primaryBtn, { width: '100%' }]}
                          onPress={() => handleStatusChange(bk.id, 'in_progress')}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === bk.id + '_in_progress' ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>START SERVICE</Text>
                          )}
                        </TouchableOpacity>
                      )}

                      {bk.status === 'in_progress' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.completeBtn, { width: '100%' }]}
                          onPress={() => handleStatusChange(bk.id, 'completed')}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === bk.id + '_completed' ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>COMPLETE SERVICE</Text>
                          )}
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.viewDetailsFullBtn}
                        onPress={() => router.push(`/(workshop)/bookings?id=${bk.id}`)}
                      >
                        <Text style={styles.viewDetailsText}>{t('dashboard.viewDetails').toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ResponsiveGrid>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

function getStatusBadgeStyle(status: BookingStatus, colors: typeof DARK_COLORS, isDark: boolean) {
  switch (status) {
    case 'pending':
      return { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' };
    case 'confirmed':
      return { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38BDF8' };
    case 'in_progress':
      return { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: colors.primary };
    case 'completed':
      return { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: colors.success };
    case 'cancelled':
    case 'rejected':
      return { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.danger };
    default:
      return { backgroundColor: colors.cards, borderColor: colors.border };
  }
}

function getStatusTextStyle(status: BookingStatus, colors: typeof DARK_COLORS) {
  switch (status) {
    case 'pending':
      return { color: '#F59E0B' };
    case 'confirmed':
      return { color: '#38BDF8' };
    case 'in_progress':
      return { color: colors.primary };
    case 'completed':
      return { color: colors.success };
    case 'cancelled':
    case 'rejected':
      return { color: colors.danger };
    default:
      return { color: colors.textSecondary };
  }
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 12,
      backgroundColor: colors.background,
    },
    loadingText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    errorTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
    errorDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
    retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    retryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    scrollView: { flex: 1 },
    scrollContent: {
      paddingVertical: 16,
      gap: 16,
      paddingBottom: 40,
    },

    // Welcome Banner Card
    welcomeCard: {
      backgroundColor: colors.cards,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
    },
    greetingSub: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
    },
    welcomeActions: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    welcomeSecondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.elevatedCards,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    welcomeSecBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    welcomePrimaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 10,
    },
    welcomePriBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    // KPI Cards
    kpiCard: {
      backgroundColor: colors.cards,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    kpiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    kpiIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    kpiValue: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '900',
    },
    kpiTitle: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    kpiSubtext: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '500',
    },

    // Alert Banner
    alertBannerCard: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.warning,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    alertIconBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertBannerTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    alertBannerSub: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },

    // Quick Actions
    sectionHeaderWrapper: {
      marginTop: 4,
    },
    sectionHeaderTitle: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    quickActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cards,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    quickActionIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickActionLabel: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
    },

    // Queue Header
    queueHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    queueHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    viewAllQueueBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewAllQueueText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },

    // Empty State
    emptyCard: {
      backgroundColor: colors.cards,
      borderRadius: 16,
      padding: 36,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      gap: 10,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    emptyDesc: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      maxWidth: 300,
    },

    // Booking Card
    bookingCard: {
      backgroundColor: colors.cards,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    bookingCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    refCodeText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.5,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
    customerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.secondaryBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarInitials: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    customerName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    customerPhone: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '500',
    },
    bikeBox: {
      backgroundColor: colors.secondaryBackground,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bikeTag: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    totalAmountText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '900',
    },
    actionsContainer: {
      gap: 6,
    },
    splitBtnRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    completeBtn: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    dangerBtn: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.danger,
    },
    actionBtnText: {
      fontSize: 11,
      fontWeight: '900',
    },
    viewDetailsFullBtn: {
      backgroundColor: colors.elevatedCards,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    viewDetailsText: {
      color: colors.textPrimary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
  });
