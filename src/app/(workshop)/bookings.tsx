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
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { COLORS, DARK_COLORS } from '../../constants/theme';
import {
  getWorkshopBookings,
  updateBookingStatus,
  rescheduleBooking,
} from '../../services/bookingService';
import { getMyWorkshop } from '../../services/workshopService';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import {
  Calendar,
  Clock,
  User,
  Search,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
  Copy,
  Check,
  Phone,
  CalendarDays,
  Wrench,
  ChevronRight,
  XCircle,
  Clock3,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';
import type { Booking, BookingStatus } from '../../types/database';
import { useTranslation } from '../../i18n';

// Past Git Dark Theme Status Palette
const getStatusConfig = (colors: typeof DARK_COLORS, isDark: boolean): Record<BookingStatus, { label: string; color: string; bg: string }> => ({
  pending:     { label: 'Pending',     color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  confirmed:   { label: 'Confirmed',   color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' },
  in_progress: { label: 'In Progress', color: colors.primary, bg: 'rgba(255, 107, 0, 0.15)' },
  completed:   { label: 'Completed',   color: colors.success, bg: 'rgba(16, 185, 129, 0.15)' },
  cancelled:   { label: 'Cancelled',   color: colors.danger, bg: 'rgba(239, 68, 68, 0.15)' },
  rejected:    { label: 'Rejected',    color: colors.danger, bg: 'rgba(239, 68, 68, 0.15)' },
  no_show:     { label: 'No Show',     color: colors.textMuted, bg: 'rgba(113, 113, 122, 0.15)' },
});

export default function WorkshopBookingsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; status?: string; filter?: string }>();
  const { profile } = useAuth();
  const { isPhone, contentPadding } = useResponsive();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const STATUS_CONFIG = getStatusConfig(colors, isDark);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'all'>(
    params.filter === 'today' ? 'today' : 'all'
  );
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>(
    (params.status as BookingStatus) || 'all'
  );

  // Modals
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // Reschedule Form
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (!ws) {
        setWorkshopId(null);
        return;
      }
      setWorkshopId(ws.id);
      const data = await getWorkshopBookings(ws.id);
      setBookings(data);

      if (params.id) {
        const found = data.find((b) => b.id === params.id);
        if (found) {
          setSelectedBooking(found);
          setShowDetailModal(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id, params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyRef = (refCode: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(refCode);
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleAction = async (bookingId: string, toStatus: BookingStatus) => {
    if (!profile?.id) return;
    setActionLoading(bookingId + toStatus);
    try {
      await updateBookingStatus(bookingId, toStatus, profile.id);
      await loadData();
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking((prev) => (prev ? { ...prev, status: toStatus } : null));
      }
    } catch (err: any) {
      Alert.alert('Action Failed', err.message ?? 'Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenReschedule = (bk: Booking) => {
    setSelectedBooking(bk);
    setRescheduleDate(bk.booking_date);
    setRescheduleTime(bk.booking_time);
    setRescheduleReason('');
    setShowRescheduleModal(true);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedBooking) return;
    if (!rescheduleDate || !rescheduleTime) {
      Alert.alert('Validation Error', 'Please select both date and time.');
      return;
    }
    setRescheduling(true);
    try {
      await rescheduleBooking(selectedBooking.id, rescheduleDate, rescheduleTime, rescheduleReason);
      Alert.alert('Success', 'Booking rescheduled successfully!');
      setShowRescheduleModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Reschedule Failed', err.message ?? 'Please try again.');
    } finally {
      setRescheduling(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredBookings = bookings.filter((bk) => {
    if (statusFilter !== 'all' && bk.status !== statusFilter) return false;
    if (dateFilter === 'today' && bk.booking_date !== todayStr) return false;
    if (dateFilter === 'upcoming' && bk.booking_date < todayStr) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const ref = `#RH-${bk.id.slice(0, 8)}`.toLowerCase();
      const cust = (bk.customer as any)?.full_name?.toLowerCase() || '';
      const phone = (bk.customer as any)?.phone?.toLowerCase() || '';
      const plate = (bk.motorcycle as any)?.plate_number?.toLowerCase() || '';
      if (!ref.includes(q) && !cust.includes(q) && !phone.includes(q) && !plate.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const tabCounts = (['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'] as BookingStatus[]).reduce(
    (acc, s) => {
      acc[s] = bookings.filter((b) => b.status === s).length;
      return acc;
    },
    {} as Record<string, number>
  );

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
        <Text style={styles.loadingText}>Loading Bookings Queue...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WorkshopAdminHeader
        title="Bookings Queue"
        subtitle={`${bookings.length} Total Appointments`}
      />

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search color={colors.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, phone, plate number, or ref..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color={colors.textMuted} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Timeframe Filter (Today | Upcoming | All) */}
      <View style={styles.timeframeRow}>
        {(['today', 'upcoming', 'all'] as const).map((tf) => {
          const isActive = dateFilter === tf;
          return (
            <TouchableOpacity
              key={tf}
              style={[styles.timeframeBtn, isActive && styles.activeTimeframeBtn]}
              onPress={() => setDateFilter(tf)}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeframeText, isActive && styles.activeTimeframeText]}>
                {tf === 'today' ? 'Today' : tf === 'upcoming' ? 'Upcoming' : 'All Appointments'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Status Filter Tabs (Safe Horizontal Scroll with Exact Git Theme Styling) */}
      <View style={styles.statusTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
          style={styles.statusTabsScroll}
        >
          {(['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'] as const).map((tab) => {
            const isActive = statusFilter === tab;
            const count = tab === 'all' ? bookings.length : tabCounts[tab] ?? bookings.filter((b) => b.status === tab).length;
            const cfg = tab !== 'all' ? STATUS_CONFIG[tab] : null;
            const label = tab === 'all' ? t('common.all').toUpperCase() : STATUS_CONFIG[tab].label.toUpperCase();

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  isActive && styles.activeTab,
                  isActive && cfg && { borderColor: cfg.color, backgroundColor: cfg.bg },
                ]}
                onPress={() => setStatusFilter(tab)}
                activeOpacity={0.8}
              >
                {cfg && (
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: cfg.color },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.tabText,
                    isActive && { color: cfg?.color ?? colors.primary, fontWeight: '900' },
                  ]}
                >
                  {label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Bookings Feed */}
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
            tintColor={colors.primary}
          />
        }
      >
        <ResponsiveContainer>
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar color={colors.textMuted} size={48} />
              <Text style={styles.emptyTitle}>{t('empty.noBookings')}</Text>
              <Text style={styles.emptyDesc}>{t('empty.noBookingsSub')}</Text>
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {filteredBookings.map((bk) => {
                const cfg = STATUS_CONFIG[bk.status];
                const customer = bk.customer as any;
                const motorcycle = bk.motorcycle as any;
                const refCode = `#RH-${bk.id.slice(0, 8).toUpperCase()}`;
                const isCopied = copiedId === bk.id;

                return (
                  <View key={bk.id} style={styles.bookingCard}>
                    {/* Header Row: Ref Code + Status Badge */}
                    <View style={styles.cardHeader}>
                      <TouchableOpacity
                        style={styles.refCodeBadge}
                        onPress={() => handleCopyRef(refCode, bk.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.refCode}>{refCode}</Text>
                        {isCopied ? (
                          <Check size={12} color={colors.success} />
                        ) : (
                          <Copy size={12} color={colors.textMuted} />
                        )}
                      </TouchableOpacity>

                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                        <Text style={[styles.statusText, { color: cfg.color }]}>
                          {cfg.label.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Customer Row */}
                    <View style={styles.customerRow}>
                      <View style={styles.avatar}>
                        <User color={colors.textMuted} size={18} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.customerName} numberOfLines={1}>
                          {customer?.full_name ?? 'Customer'}
                        </Text>
                        <Text style={styles.customerPhone} numberOfLines={1}>
                          {customer?.phone ?? customer?.email ?? 'No contact info'}
                        </Text>
                      </View>
                    </View>

                    {/* Motorcycle Box */}
                    {motorcycle && (
                      <View style={styles.bikeBox}>
                        <Text style={styles.bikeTag} numberOfLines={1}>
                          🏍️ {motorcycle.brand} {motorcycle.model} • {motorcycle.plate_number}
                        </Text>
                      </View>
                    )}

                    {/* Date & Time Row */}
                    <View style={styles.dateRow}>
                      <View style={styles.metaRow}>
                        <Calendar color={colors.textMuted} size={13} />
                        <Text style={styles.metaText}>{bk.booking_date}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Clock color={colors.textMuted} size={13} />
                        <Text style={styles.metaText}>{bk.booking_time}</Text>
                      </View>
                    </View>

                    {/* Services List */}
                    {(bk.booking_services ?? []).length > 0 && (
                      <View style={styles.servicesList}>
                        {(bk.booking_services ?? []).map((s) => (
                          <Text key={s.id} style={styles.serviceItem} numberOfLines={1}>
                            • {s.service_name_snapshot} — RM {s.price_snapshot.toFixed(2)}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Card Price & Details Row */}
                    <View style={styles.priceRow}>
                      <Text style={styles.totalText}>RM {Number(bk.total_amount).toFixed(2)}</Text>
                      <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => {
                          setSelectedBooking(bk);
                          setShowDetailModal(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.viewBtnText}>{t('dashboard.viewDetails').toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Card Actions Container — Non-overflowing, Structured Layout */}
                    <View style={styles.cardActionsContainer}>
                      {bk.status === 'pending' && (
                        <View style={styles.buttonSplitRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.primaryBtn]}
                            onPress={() => handleAction(bk.id, 'confirmed')}
                            disabled={actionLoading !== null}
                            activeOpacity={0.8}
                          >
                            {actionLoading === bk.id + 'confirmed' ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>ACCEPT</Text>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.dangerBtn]}
                            onPress={() => handleAction(bk.id, 'rejected')}
                            disabled={actionLoading !== null}
                            activeOpacity={0.8}
                          >
                            {actionLoading === bk.id + 'rejected' ? (
                              <ActivityIndicator size="small" color={colors.danger} />
                            ) : (
                              <Text style={[styles.actionBtnText, { color: colors.danger }]}>REJECT</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      {bk.status === 'confirmed' && (
                        <View style={styles.actionBlock}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.primaryBtn, { width: '100%' }]}
                            onPress={() => handleAction(bk.id, 'in_progress')}
                            disabled={actionLoading !== null}
                            activeOpacity={0.8}
                          >
                            {actionLoading === bk.id + 'in_progress' ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>START SERVICE</Text>
                            )}
                          </TouchableOpacity>

                          <View style={styles.buttonSplitRow}>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.reschedBtn]}
                              onPress={() => handleOpenReschedule(bk)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.reschedBtnText}>{t('booking.reschedule').toUpperCase()}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.dangerBtn]}
                              onPress={() => handleAction(bk.id, 'cancelled')}
                              disabled={actionLoading !== null}
                              activeOpacity={0.8}
                            >
                              {actionLoading === bk.id + 'cancelled' ? (
                                <ActivityIndicator size="small" color={colors.danger} />
                              ) : (
                                <Text style={[styles.actionBtnText, { color: colors.danger }]}>CANCEL</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {bk.status === 'in_progress' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.primaryBtn, { width: '100%' }]}
                          onPress={() => handleAction(bk.id, 'completed')}
                          disabled={actionLoading !== null}
                          activeOpacity={0.8}
                        >
                          {actionLoading === bk.id + 'completed' ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>COMPLETE SERVICE</Text>
                          )}
                        </TouchableOpacity>
                      )}

                      {bk.status === 'completed' && (
                        <View style={styles.completedBadgeBox}>
                          <Text style={styles.completedBadgeText}>✓ SERVICE COMPLETED</Text>
                        </View>
                      )}

                      {(bk.status === 'cancelled' || bk.status === 'rejected') && (
                        <View style={styles.cancelledBadgeBox}>
                          <Text style={styles.cancelledBadgeText}>
                            {bk.status === 'cancelled' ? '✕ BOOKING CANCELLED' : '✕ BOOKING REJECTED'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ResponsiveGrid>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* Booking Details Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                BOOKING DETAILS #{selectedBooking?.id.slice(0, 8).toUpperCase()}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X color={colors.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
                {/* Customer Section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>{t('workshopAdmin.customerInfo').toUpperCase()}</Text>
                  <Text style={styles.detailValueBold}>{(selectedBooking.customer as any)?.full_name ?? 'N/A'}</Text>
                  <Text style={styles.detailValue}>{(selectedBooking.customer as any)?.phone ?? (selectedBooking.customer as any)?.email ?? 'N/A'}</Text>
                </View>

                {/* Motorcycle Section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>{t('motorcycle.details').toUpperCase()}</Text>
                  <Text style={styles.detailValueBold}>
                    {(selectedBooking.motorcycle as any)?.brand} {(selectedBooking.motorcycle as any)?.model}
                  </Text>
                  <Text style={styles.detailValue}>{t('motorcycle.plateNumber')}: {(selectedBooking.motorcycle as any)?.plate_number ?? 'N/A'}</Text>
                  <Text style={styles.detailValue}>{t('motorcycle.currentOdometer')}: {(selectedBooking.motorcycle as any)?.current_mileage ?? 0} km</Text>
                </View>

                {/* Services Section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>{t('workshopAdmin.manageServices').toUpperCase()}</Text>
                  {(selectedBooking.booking_services ?? []).map((s) => (
                    <View key={s.id} style={styles.detailSvcRow}>
                      <Text style={styles.detailSvcName}>{s.service_name_snapshot}</Text>
                      <Text style={styles.detailSvcPrice}>RM {s.price_snapshot.toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={styles.detailTotalRow}>
                    <Text style={styles.detailTotalLabel}>{t('common.total').toUpperCase()}</Text>
                    <Text style={styles.detailTotalVal}>RM {Number(selectedBooking.total_amount).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Appointment Section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>{t('booking.appointmentTime').toUpperCase()}</Text>
                  <Text style={styles.detailValue}>{t('common.date').toUpperCase()}: {selectedBooking.booking_date}</Text>
                  <Text style={styles.detailValue}>{t('common.time').toUpperCase()}: {selectedBooking.booking_time}</Text>
                  {selectedBooking.notes ? (
                    <Text style={styles.detailValue}>{t('common.info').toUpperCase()}: {selectedBooking.notes}</Text>
                  ) : null}
                </View>

                {/* Booking Status Controls */}
                <View style={styles.detailActionContainer}>
                  {selectedBooking.status === 'pending' && (
                    <View style={styles.modalActionRow}>
                      <TouchableOpacity style={[styles.modalActionBtn, styles.primaryBtn]} onPress={() => handleAction(selectedBooking.id, 'confirmed')}>
                        <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>ACCEPT BOOKING</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalActionBtn, styles.dangerBtn]} onPress={() => handleAction(selectedBooking.id, 'rejected')}>
                        <Text style={[styles.actionBtnText, { color: colors.danger }]}>REJECT</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedBooking.status === 'confirmed' && (
                    <View style={styles.modalActionRow}>
                      <TouchableOpacity style={[styles.modalActionBtn, styles.primaryBtn]} onPress={() => handleAction(selectedBooking.id, 'in_progress')}>
                        <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>START SERVICE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalActionBtn, styles.reschedBtn]} onPress={() => { setShowDetailModal(false); handleOpenReschedule(selectedBooking); }}>
                        <Text style={styles.reschedBtnText}>RESCHEDULE</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedBooking.status === 'in_progress' && (
                    <TouchableOpacity style={[styles.modalActionBtn, styles.primaryBtn]} onPress={() => handleAction(selectedBooking.id, 'completed')}>
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>COMPLETE SERVICE</Text>
                    </TouchableOpacity>
                  )}

                  {selectedBooking.status === 'completed' && (
                    <View style={styles.completedBadgeBox}>
                      <Text style={styles.completedBadgeText}>✓ SERVICE COMPLETED</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Reschedule Booking Modal */}
      <Modal visible={showRescheduleModal} transparent animationType="fade" onRequestClose={() => setShowRescheduleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>RESCHEDULE BOOKING</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <X color={colors.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.rescheduleForm}>
              <Text style={styles.currentScheduleText}>
                Current: {selectedBooking?.booking_date} @ {selectedBooking?.booking_time}
              </Text>

              <Text style={styles.formLabel}>NEW DATE (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2026-09-20"
                placeholderTextColor={colors.textMuted}
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
              />

              <Text style={styles.formLabel}>NEW TIME (e.g. 10:30 AM)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 10:30 AM"
                placeholderTextColor={colors.textMuted}
                value={rescheduleTime}
                onChangeText={setRescheduleTime}
              />

              <Text style={styles.formLabel}>REASON FOR RESCHEDULING</Text>
              <TextInput
                style={[styles.formInput, { height: 70 }]}
                placeholder="e.g. Parts arrived late / Customer requested shift"
                placeholderTextColor={colors.textMuted}
                multiline
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity style={[styles.modalActionBtn, styles.cancelModalBtn]} onPress={() => setShowRescheduleModal(false)}>
                  <Text style={styles.cancelModalText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalActionBtn, styles.primaryBtn]} onPress={handleConfirmReschedule} disabled={rescheduling}>
                  {rescheduling ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>CONFIRM RESCHEDULE</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: colors.background },
    loadingText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

    // Top Search Bar
    searchBarContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
    searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cards, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 10, height: 44 },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13 },

    // Timeframe Filter (Today | Upcoming | All)
    timeframeRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 6, gap: 8 },
    timeframeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.cards, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    activeTimeframeBtn: { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)', borderColor: colors.primary },
    timeframeText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    activeTimeframeText: { color: colors.primary, fontWeight: '800' },

    // Status Filter Tabs
    statusTabsWrapper: { height: 48, justifyContent: 'center' },
    statusTabsScroll: { flexGrow: 0 },
    tabScroll: { paddingHorizontal: 20, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.cards, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexShrink: 0 },
    activeTab: { backgroundColor: colors.elevatedCards },
    tabText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
    statusDot: { width: 6, height: 6, borderRadius: 3 },

    // Booking Feed & Cards
    scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 },
    emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10, backgroundColor: colors.cards, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
    emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    emptyDesc: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', maxWidth: 280 },
    
    bookingCard: { backgroundColor: colors.cards, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    refCodeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    refCode: { color: colors.primary, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
    statusText: { fontSize: 10, fontWeight: '900' },

    // Customer & Bike
    customerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondaryBackground, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    customerName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    customerPhone: { color: colors.textSecondary, fontSize: 11, fontWeight: '500' },
    bikeBox: { backgroundColor: colors.secondaryBackground, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    bikeTag: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },

    // Date & Services
    dateRow: { flexDirection: 'row', gap: 16 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { color: colors.textSecondary, fontSize: 12 },
    servicesList: { gap: 3 },
    serviceItem: { color: colors.textSecondary, fontSize: 12 },

    // Price & View Details
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
    totalText: { color: colors.primary, fontSize: 16, fontWeight: '900' },
    viewBtn: { backgroundColor: colors.elevatedCards, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    viewBtnText: { color: colors.textPrimary, fontSize: 11, fontWeight: '800' },

    // Structured Action Buttons Layout (Guaranteed No Overflow)
    cardActionsContainer: { gap: 8 },
    buttonSplitRow: { flexDirection: 'row', gap: 8 },
    actionBlock: { gap: 8 },
    actionBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    primaryBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
    secondaryBtn: { backgroundColor: colors.elevatedCards, borderColor: colors.borderHighlight },
    reschedBtn: { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: colors.warning },
    reschedBtnText: { color: colors.warning, fontSize: 11, fontWeight: '800' },
    dangerBtn: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
    actionBtnText: { fontSize: 11, fontWeight: '900' },
    completedBadgeBox: { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', paddingVertical: 9, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.success },
    completedBadgeText: { color: colors.success, fontSize: 11, fontWeight: '900' },
    cancelledBadgeBox: { backgroundColor: colors.dangerBg, paddingVertical: 9, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.danger },
    cancelledBadgeText: { color: colors.danger, fontSize: 11, fontWeight: '900' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.elevatedCards, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.borderHighlight, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 },
    modalTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    detailScroll: { gap: 14 },
    detailSection: { backgroundColor: colors.cards, padding: 14, borderRadius: 14, gap: 4, borderWidth: 1, borderColor: colors.border },
    detailSectionLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
    detailValueBold: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
    detailValue: { color: colors.textSecondary, fontSize: 12 },
    detailSvcRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
    detailSvcName: { color: colors.textSecondary, fontSize: 12 },
    detailSvcPrice: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
    detailTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 6 },
    detailTotalLabel: { color: colors.primary, fontSize: 12, fontWeight: '900' },
    detailTotalVal: { color: colors.primary, fontSize: 14, fontWeight: '900' },
    detailActionContainer: { marginTop: 10 },
    modalActionRow: { flexDirection: 'row', gap: 10 },
    modalActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rescheduleForm: { gap: 12 },
    currentScheduleText: { color: colors.primary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
    formLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    formInput: { backgroundColor: colors.cards, color: colors.textPrimary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: colors.border },
    cancelModalBtn: { backgroundColor: colors.cards, borderWidth: 1, borderColor: colors.border },
    cancelModalText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  });
