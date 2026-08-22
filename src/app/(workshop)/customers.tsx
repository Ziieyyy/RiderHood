import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import {
  Users,
  Phone,
  Mail,
  Calendar,
  RefreshCw,
  Search,
  X,
  ChevronRight,
  ShieldCheck,
  Wrench,
  DollarSign,
} from 'lucide-react-native';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop } from '../../services/workshopService';
import { getWorkshopCustomers, WorkshopCustomerSummary } from '../../services/customerService';
import { useTranslation } from '../../i18n';

export default function WorkshopCustomersScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<WorkshopCustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Selected customer for modal
  const [selectedCustomer, setSelectedCustomer] = useState<WorkshopCustomerSummary | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (!ws) {
        setLoading(false);
        return;
      }
      const data = await getWorkshopCustomers(ws.id);
      setCustomers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load customer directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCustomers = customers.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.customer.full_name || '').toLowerCase();
    const phone = (item.customer.phone || '').toLowerCase();
    const email = (item.customer.email || '').toLowerCase();
    const bikesStr = item.motorcycles
      .map((m) => `${m.brand} ${m.model} ${m.plate_number}`)
      .join(' ')
      .toLowerCase();

    return name.includes(q) || phone.includes(q) || email.includes(q) || bikesStr.includes(q);
  });

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
        title={t('workshopAdmin.customerDirectory')}
        subtitle={`${customers.length} ${t('workshopAdmin.customers')}`}
      />

      {/* Top Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search color={COLORS.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search')}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>{t('empty.noCustomers')}</Text>
            <Text style={styles.emptyDesc}>
              {t('empty.noCustomersSub')}
            </Text>
          </View>
        ) : (
          filteredCustomers.map((summary) => {
            const { customer, motorcycles, totalBookings, completedServices, lastVisit, totalSpent } = summary;
            const initials = (customer.full_name || 'Customer').substring(0, 2).toUpperCase();

            return (
              <TouchableOpacity
                key={customer.id}
                style={styles.customerCard}
                onPress={() => {
                  setSelectedCustomer(summary);
                  setShowDetailModal(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.rowTop}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name}>{customer.full_name || 'Customer'}</Text>
                    {motorcycles.length > 0 ? (
                      <Text style={styles.bikeText} numberOfLines={1}>
                        🏍️ {motorcycles.map((m) => `${m.brand} ${m.model} (${m.plate_number})`).join(', ')}
                      </Text>
                    ) : (
                      <Text style={styles.noBikeText}>{t('motorcycle.noBikesRegistered')}</Text>
                    )}
                  </View>

                  <ChevronRight color={COLORS.textMuted} size={18} />
                </View>

                <View style={styles.statsBar}>
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{totalBookings}</Text>
                    <Text style={styles.statLbl}>{t('navigation.bookings').toUpperCase()}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{completedServices}</Text>
                    <Text style={styles.statLbl}>{t('booking.bookingCompleted').toUpperCase()}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: COLORS.primary }]}>
                      RM {totalSpent.toFixed(0)}
                    </Text>
                    <Text style={styles.statLbl}>{t('common.total').toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  {customer.email ? (
                    <View style={styles.infoRow}>
                      <Mail color={COLORS.textMuted} size={13} />
                      <Text style={styles.infoText}>{customer.email}</Text>
                    </View>
                  ) : null}
                  {customer.phone ? (
                    <View style={styles.infoRow}>
                      <Phone color={COLORS.textMuted} size={13} />
                      <Text style={styles.infoText}>{customer.phone}</Text>
                    </View>
                  ) : null}
                  <View style={styles.infoRow}>
                    <Calendar color={COLORS.textMuted} size={13} />
                    <Text style={styles.infoText}>{t('workshopAdmin.lastVisit')}: {lastVisit || 'N/A'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Detailed Customer Profile Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('workshopAdmin.customerInfo').toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X color={COLORS.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
                {/* Profile Box */}
                <View style={styles.detailProfileCard}>
                  <View style={styles.detailAvatarBox}>
                    <Text style={styles.detailAvatarText}>
                      {(selectedCustomer.customer.full_name || 'C').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.detailName}>{selectedCustomer.customer.full_name || 'Customer'}</Text>
                    <Text style={styles.detailSub}>{selectedCustomer.customer.email || '-'}</Text>
                    <Text style={styles.detailSub}>{selectedCustomer.customer.phone || '-'}</Text>
                  </View>
                </View>

                {/* Registered Vehicles */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>{t('motorcycle.garage').toUpperCase()} ({selectedCustomer.motorcycles.length})</Text>
                  {selectedCustomer.motorcycles.length === 0 ? (
                    <Text style={styles.noneText}>{t('motorcycle.noBikesRegistered')}</Text>
                  ) : (
                    selectedCustomer.motorcycles.map((m) => (
                      <View key={m.id} style={styles.bikeDetailRow}>
                        <Text style={styles.bikeDetailTitle}>
                          🏍️ {m.brand} {m.model} ({m.year})
                        </Text>
                        <Text style={styles.bikeDetailSub}>
                          {t('motorcycle.plateNumber')}: <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{m.plate_number}</Text> • {t('motorcycle.currentOdometer')}: {m.current_mileage || 0} km
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Service History at this workshop */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>{t('workshopAdmin.bookingsQueue').toUpperCase()} ({selectedCustomer.bookings.length})</Text>
                  {selectedCustomer.bookings.length === 0 ? (
                    <Text style={styles.noneText}>{t('empty.noBookings')}</Text>
                  ) : (
                    selectedCustomer.bookings.map((bk) => (
                      <View key={bk.id} style={styles.bkHistoryCard}>
                        <View style={styles.bkHistTop}>
                          <Text style={styles.bkRef}>#RH-{bk.id.slice(0, 8).toUpperCase()}</Text>
                          <View style={styles.histStatusBadge}>
                            <Text style={styles.histStatusText}>{bk.status.toUpperCase()}</Text>
                          </View>
                        </View>

                        <Text style={styles.bkDateText}>📅 {t('common.date')}: {bk.booking_date} @ {bk.booking_time}</Text>

                        {(bk.booking_services ?? []).map((s) => (
                          <Text key={s.id} style={styles.bkSvcItem}>
                            • {s.service_name_snapshot} (RM {Number(s.price_snapshot).toFixed(2)})
                          </Text>
                        ))}

                        <View style={styles.bkHistFooter}>
                          <Text style={styles.bkHistAmount}>{t('common.total')}: RM {Number(bk.total_amount).toFixed(2)}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  errorDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  searchBarContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cards, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10, height: 44 },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10, backgroundColor: COLORS.cards, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', maxWidth: 280 },
  customerCard: { backgroundColor: COLORS.cards, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  name: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  bikeText: { color: COLORS.primaryDim, fontSize: 12, fontWeight: '600' },
  noBikeText: { color: COLORS.textMuted, fontSize: 11, fontStyle: 'italic' },
  statsBar: { flexDirection: 'row', backgroundColor: COLORS.secondaryBackground, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statItem: { alignItems: 'center' },
  statVal: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900' },
  statLbl: { color: COLORS.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  infoGrid: { gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: COLORS.textSecondary, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.elevatedCards, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.borderHighlight, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 12 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  detailScroll: { gap: 14 },
  detailProfileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.cards, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  detailAvatarBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  detailAvatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  detailName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  detailSub: { color: COLORS.textSecondary, fontSize: 12 },
  detailSection: { backgroundColor: COLORS.cards, padding: 14, borderRadius: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  detailSectionLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  noneText: { color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic' },
  bikeDetailRow: { backgroundColor: COLORS.secondaryBackground, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, gap: 2 },
  bikeDetailTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  bikeDetailSub: { color: COLORS.textSecondary, fontSize: 11 },
  bkHistoryCard: { backgroundColor: COLORS.secondaryBackground, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  bkHistTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bkRef: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
  histStatusBadge: { backgroundColor: 'rgba(255, 107, 0, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  histStatusText: { color: COLORS.primary, fontSize: 9, fontWeight: '800' },
  bkDateText: { color: COLORS.textSecondary, fontSize: 11 },
  bkSvcItem: { color: COLORS.textMuted, fontSize: 11 },
  bkHistFooter: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6, marginTop: 4 },
  bkHistAmount: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' },
});
