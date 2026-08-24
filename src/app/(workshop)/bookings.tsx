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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../constants/theme';
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
  RefreshCw,
  Package,
  Search,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';
import type { Booking, BookingStatus } from '../../types/database';
import { useTranslation } from '../../i18n';

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending',     color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  confirmed:   { label: 'Confirmed',   color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' },
  in_progress: { label: 'In Progress', color: COLORS.primary, bg: 'rgba(255, 107, 0, 0.15)' },
  completed:   { label: 'Completed',   color: COLORS.success, bg: 'rgba(16, 185, 129, 0.15)' },
  cancelled:   { label: 'Cancelled',   color: COLORS.danger, bg: 'rgba(239, 68, 68, 0.15)' },
  rejected:    { label: 'Rejected',    color: COLORS.danger, bg: 'rgba(239, 68, 68, 0.15)' },
  no_show:     { label: 'No Show',     color: COLORS.textMuted, bg: 'rgba(113, 113, 122, 0.15)' },
};

const NEXT_ACTIONS: Partial<Record<BookingStatus, { to: BookingStatus; label: string; primary?: boolean }[]>> = {
  pending:     [{ to: 'confirmed', label: 'Accept', primary: true }, { to: 'rejected', label: 'Reject' }],
  confirmed:   [{ to: 'in_progress', label: 'Start Service', primary: true }, { to: 'cancelled', label: 'Cancel' }],
  in_progress: [{ to: 'completed', label: 'Complete Service', primary: true }],
};

export default function WorkshopBookingsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; status?: string; filter?: string }>();
  const { profile } = useAuth();
  const { isPhone, contentPadding } = useResponsive();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const tabCounts = (['pending', 'confirmed', 'in_progress', 'completed'] as BookingStatus[]).reduce(
    (acc, s) => {
      acc[s] = bookings.filter((b) => b.status === s).length;
      return acc;
    },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Booking Queue...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WorkshopAdminHeader
        title="Bookings Queue"
        subtitle={`${bookings.length} Total Appointments`}
      />

      {/* Top Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search color={COLORS.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, phone, plate number, or ref..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={COLORS.textMuted} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Timeframe Filter (Today | Upcoming | All) */}
      <View style={styles.timeframeRow}>
        {(['today', 'upcoming', 'all'] as const).map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[styles.timeframeBtn, dateFilter === tf && styles.activeTimeframeBtn]}
            onPress={() => setDateFilter(tf)}
          >
            <Text style={[styles.timeframeText, dateFilter === tf && styles.activeTimeframeText]}>
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
        {(['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'] as const).map((tab) => {
          const isActive = statusFilter === tab;
          const count = tab === 'all' ? bookings.length : tabCounts[tab] ?? bookings.filter((b) => b.status === tab).length;
          const cfg = tab !== 'all' ? STATUS_CONFIG[tab] : null;
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
              <Text style={[styles.tabText, isActive && { color: cfg?.color ?? COLORS.primary, fontWeight: '900' }]}>
                {tab === 'all' ? t('common.all').toUpperCase() : STATUS_CONFIG[tab].label.toUpperCase()} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Booking List */}
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
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar color={COLORS.textMuted} size={48} />
              <Text style={styles.emptyTitle}>{t('empty.noBookings')}</Text>
              <Text style={styles.emptyDesc}>{t('empty.noBookingsSub')}</Text>
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {filteredBookings.map((bk) => {
                const cfg = STATUS_CONFIG[bk.status];
                const actions = NEXT_ACTIONS[bk.status] ?? [];
                const customer = bk.customer as any;
                const motorcycle = bk.motorcycle as any;
                const refCode = `#RH-${bk.id.slice(0, 8).toUpperCase()}`;

                return (
                  <View key={bk.id} style={styles.bookingCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.refCode}>{refCode}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.customerRow}>
                      <View style={styles.avatar}>
                        <User color={COLORS.textMuted} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.customerName} numberOfLines={1}>{customer?.full_name ?? 'Customer'}</Text>
                        <Text style={styles.customerPhone} numberOfLines={1}>{customer?.phone ?? customer?.email ?? 'No contact info'}</Text>
                      </View>
                    </View>

                    {motorcycle && (
                      <View style={styles.bikeBox}>
                        <Text style={styles.bikeTag} numberOfLines={1}>
                          🏍️ {motorcycle.brand} {motorcycle.model} • {motorcycle.plate_number}
                        </Text>
                      </View>
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
                        {(bk.booking_services ?? []).map((s) => (
                          <Text key={s.id} style={styles.serviceItem} numberOfLines={1}>
                            • {s.service_name_snapshot} — RM {s.price_snapshot.toFixed(2)}
                          </Text>
                        ))}
                      </View>
                    )}

                    <View style={styles.cardFooter}>
                      <Text style={styles.totalText}>RM {Number(bk.total_amount).toFixed(2)}</Text>
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={styles.viewBtn}
                          onPress={() => {
                            setSelectedBooking(bk);
                            setShowDetailModal(true);
                          }}
                        >
                          <Text style={styles.viewBtnText}>{t('dashboard.viewDetails').toUpperCase()}</Text>
                        </TouchableOpacity>

                        {bk.status === 'confirmed' && (
                          <TouchableOpacity style={styles.reschedBtn} onPress={() => handleOpenReschedule(bk)}>
                            <Text style={styles.reschedBtnText}>{t('booking.reschedule').toUpperCase()}</Text>
                          </TouchableOpacity>
                        )}

                        {actions.map((a) => (
                          <TouchableOpacity
                            key={a.to}
                            style={[
                              styles.actionBtn,
                              a.primary ? styles.primaryBtn : (a.to === 'rejected' || a.to === 'cancelled' ? styles.dangerBtn : styles.secondaryBtn),
                            ]}
                            onPress={() => handleAction(bk.id, a.to)}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === bk.id + a.to ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  a.primary ? { color: '#FFFFFF' } : (a.to === 'rejected' || a.to === 'cancelled' ? { color: COLORS.danger } : { color: COLORS.textPrimary }),
                                ]}
                              >
                                {a.label.toUpperCase()}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
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
                <X color={COLORS.textMuted} size={22} />
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
                        <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>REJECT</Text>
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
                <X color={COLORS.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.rescheduleForm}>
              <Text style={styles.currentScheduleText}>
                Current: {selectedBooking?.booking_date} @ {selectedBooking?.booking_time}
              </Text>

              <Text style={styles.formLabel}>NEW DATE (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2026-08-20"
                placeholderTextColor={COLORS.textMuted}
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
              />

              <Text style={styles.formLabel}>NEW TIME (e.g. 10:30 AM)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 10:30 AM"
                placeholderTextColor={COLORS.textMuted}
                value={rescheduleTime}
                onChangeText={setRescheduleTime}
              />

              <Text style={styles.formLabel}>REASON FOR RESCHEDULING</Text>
              <TextInput
                style={[styles.formInput, { height: 70 }]}
                placeholder="e.g. Parts arrived late / Customer requested shift"
                placeholderTextColor={COLORS.textMuted}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  searchBarContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cards, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10, height: 44 },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  timeframeRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 6, gap: 8 },
  timeframeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.cards, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  activeTimeframeBtn: { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: COLORS.primary },
  timeframeText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  activeTimeframeText: { color: COLORS.primary, fontWeight: '800' },
  tabScroll: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  tab: { backgroundColor: COLORS.cards, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  activeTab: { backgroundColor: COLORS.elevatedCards },
  tabText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10, backgroundColor: COLORS.cards, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', maxWidth: 280 },
  bookingCard: { backgroundColor: COLORS.cards, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refCode: { color: COLORS.primary, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.secondaryBackground, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  customerName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  customerPhone: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '900' },
  bikeBox: { backgroundColor: COLORS.secondaryBackground, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  bikeTag: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: COLORS.textSecondary, fontSize: 12 },
  servicesList: { gap: 3 },
  serviceItem: { color: COLORS.textSecondary, fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  totalText: { color: COLORS.primary, fontSize: 16, fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  viewBtn: { backgroundColor: COLORS.elevatedCards, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  viewBtnText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '800' },
  reschedBtn: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.warning },
  reschedBtnText: { color: COLORS.warning, fontSize: 11, fontWeight: '800' },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  primaryBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  secondaryBtn: { backgroundColor: COLORS.elevatedCards, borderColor: COLORS.borderHighlight },
  dangerBtn: { backgroundColor: COLORS.dangerBg, borderColor: COLORS.danger },
  actionBtnText: { fontSize: 11, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.elevatedCards, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.borderHighlight, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 12 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  detailScroll: { gap: 14 },
  detailSection: { backgroundColor: COLORS.cards, padding: 14, borderRadius: 14, gap: 4, borderWidth: 1, borderColor: COLORS.border },
  detailSectionLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  detailValueBold: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  detailValue: { color: COLORS.textSecondary, fontSize: 12 },
  detailSvcRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  detailSvcName: { color: COLORS.textSecondary, fontSize: 12 },
  detailSvcPrice: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  detailTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 6 },
  detailTotalLabel: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
  detailTotalVal: { color: COLORS.primary, fontSize: 14, fontWeight: '900' },
  detailActionContainer: { marginTop: 10 },
  modalActionRow: { flexDirection: 'row', gap: 10 },
  modalActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  completedBadgeBox: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.success },
  completedBadgeText: { color: COLORS.success, fontSize: 13, fontWeight: '900' },
  rescheduleForm: { gap: 12 },
  currentScheduleText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  formLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  formInput: { backgroundColor: COLORS.cards, color: COLORS.textPrimary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: COLORS.border },
  cancelModalBtn: { backgroundColor: COLORS.cards, borderWidth: 1, borderColor: COLORS.border },
  cancelModalText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '800' },
});
