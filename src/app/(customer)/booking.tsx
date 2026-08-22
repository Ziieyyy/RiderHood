import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { getWorkshops, getWorkshopServices } from '../../services/workshopService';
import { createBooking } from '../../services/bookingService';
import { getMotorcycles } from '../../services/motorcycleService';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  Calendar as CalendarIcon, Clock, CheckCircle2,
  Wrench, ChevronDown, ShieldCheck, Zap, Bike, X, MapPin, Check
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import type { Workshop, Service, Motorcycle } from '../../types/database';

export default function CustomerBookingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, formatDate, formatCurrency } = useTranslation();
  const params = useLocalSearchParams();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('All');
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Generate next 7 available dates
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split('T')[0];
  });
  const availableTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const preselectedId = params.workshopId as string | undefined;
      const preselectedName = params.workshopName as string | undefined;
      const preselectedService = params.serviceName as string | undefined;

      const [wsList, bikesList] = await Promise.all([
        getWorkshops().catch(() => []),
        user?.id ? getMotorcycles(user.id).catch(() => []) : Promise.resolve([]),
      ]);

      let allWs = [...wsList];

      // If route param contains a workshop not yet in the list, insert it
      if (preselectedId && !allWs.some(w => w.id === preselectedId)) {
        const paramWorkshop: Workshop = {
          id: preselectedId,
          owner_id: user?.id || 'a0000000-0000-0000-0000-000000000002',
          name: preselectedName ? decodeURIComponent(preselectedName) : 'Bengkel Motor Cemerlang Terbilang',
          description: 'Specialized in superbike tuning, general servicing, tire replacements & performance parts.',
          email: null,
          phone: '+60123456789',
          address: 'No 15, Jalan Industri PBU 1, Taman Perindustrian, 50480 Kuala Lumpur',
          district: 'Kuala Lumpur',
          state: 'Wilayah Persekutuan',
          latitude: null,
          longitude: null,
          cover_image_url: null,
          rating: 4.9,
          review_count: 12,
          opening_time: null,
          closing_time: null,
          is_open: true,
          is_partner: true,
          booking_enabled: true,
          status: 'active',
          verification_status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        allWs = [paramWorkshop, ...allWs];
      }

      // Only allow booking for workshops with booking_enabled !== false
      const bookableWorkshops = allWs.filter(w => w.booking_enabled !== false);
      setWorkshops(bookableWorkshops.length > 0 ? bookableWorkshops : allWs);
      setMotorcycles(bikesList);
      if (bikesList.length > 0) setSelectedMotorcycle(bikesList[0]);

      let targetWorkshop = (preselectedId ? allWs.find(w => w.id === preselectedId) : null);

      if (targetWorkshop && targetWorkshop.booking_enabled === false) {
        Alert.alert('Booking Unavailable', `${targetWorkshop.name} is a directory listing and is not currently taking RiderHood online bookings.`);
        router.replace('/(customer)/workshops');
        return;
      }

      if (!targetWorkshop) {
        targetWorkshop = bookableWorkshops[0] || allWs[0] || null;
      }

      setSelectedWorkshop(targetWorkshop);

      const svcs = await getWorkshopServices(targetWorkshop?.id);
      setServices(svcs);

      // Pre-select service if passed in route params
      if (preselectedService && svcs.length > 0) {
        const match = svcs.find(s => s.name.toLowerCase() === preselectedService.toLowerCase());
        if (match) {
          setSelectedServices([match.id]);
        }
      }
    } catch (err) {
      console.error('Error loading booking data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, params.workshopId, params.workshopName, params.serviceName, router]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const handleSelectWorkshop = async (ws: Workshop) => {
    setSelectedWorkshop(ws);
    setShowWorkshopModal(false);
    setLoadingServices(true);
    try {
      const svcs = await getWorkshopServices(ws.id);
      setServices(svcs);
      setSelectedServices([]);
    } catch (err) {
      console.error('Error fetching workshop services:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectedServiceItems = services.filter(s => selectedServices.includes(s.id));
  const totalPrice = selectedServiceItems.reduce((acc, curr) => acc + (curr.price || 0), 0);

  const handleConfirmBooking = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to submit a booking.');
      return;
    }
    if (!selectedWorkshop) {
      Alert.alert('No Workshop Selected', 'Please select a workshop.');
      return;
    }
    if (!selectedMotorcycle) {
      Alert.alert('No Motorcycle Selected', 'Please select a motorcycle from your garage.');
      return;
    }
    if (selectedServices.length === 0) {
      Alert.alert('No Services Selected', 'Please select at least one service package.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('No Date Selected', 'Please select a booking date.');
      return;
    }
    if (!selectedTime) {
      Alert.alert('No Time Selected', 'Please select a time slot.');
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({
        customer_id: user.id,
        workshop_id: selectedWorkshop.id,
        motorcycle_id: selectedMotorcycle.id,
        booking_date: selectedDate,
        booking_time: selectedTime,
        services: selectedServices.map(id => ({ service_id: id, quantity: 1 })),
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      Alert.alert('Booking Failed', err.message ?? 'Unable to complete booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('booking.title')} subtitle={t('booking.subtitle')} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('booking.title')} subtitle={t('booking.subtitle')} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 0: Motorcycle Selection */}
        {motorcycles.length > 0 && (
          <>
            <Text style={styles.stepTitle}>{t('booking.step0')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.dateRow}>
                {motorcycles.map(bike => {
                  const isSelected = selectedMotorcycle?.id === bike.id;
                  return (
                    <TouchableOpacity
                      key={bike.id}
                      style={[styles.dateChip, isSelected && styles.activeDateChip]}
                      onPress={() => setSelectedMotorcycle(bike)}
                      activeOpacity={0.8}
                    >
                      <Bike color={isSelected ? COLORS.primary : COLORS.textSecondary} size={14} />
                      <Text style={[styles.dateChipText, isSelected && styles.activeDateText]}>
                        {bike.nickname || `${bike.brand} ${bike.model}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        {/* Step 1: Workshop Selection */}
        <Text style={styles.stepTitle}>{t('booking.step1')}</Text>
        <TouchableOpacity
          style={styles.dropdownBox}
          onPress={() => setShowWorkshopModal(true)}
          activeOpacity={0.8}
        >
          <Wrench color={COLORS.primary} size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dropdownLabel}>{t('booking.selectWorkshop').toUpperCase()}</Text>
            <Text style={styles.dropdownValue}>{selectedWorkshop?.name ?? t('booking.selectWorkshop')}</Text>
          </View>
          <ChevronDown color={COLORS.textSecondary} size={18} />
        </TouchableOpacity>

        {/* Step 2: Date & Time Slot */}
        <Text style={styles.stepTitle}>{t('booking.step2')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={styles.dateRow}>
            {availableDates.map(date => {
              const isSelected = selectedDate === date;
              return (
                <TouchableOpacity
                  key={date}
                  style={[styles.dateChip, isSelected && styles.activeDateChip]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.8}
                >
                  <CalendarIcon color={isSelected ? COLORS.primary : COLORS.textSecondary} size={14} />
                  <Text style={[styles.dateChipText, isSelected && styles.activeDateText]}>{date}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.timeGrid}>
          {availableTimes.map(time => {
            const isSelected = selectedTime === time;
            return (
              <TouchableOpacity
                key={time}
                style={[styles.timeChip, isSelected && styles.activeTimeChip]}
                onPress={() => setSelectedTime(time)}
                activeOpacity={0.8}
              >
                <Clock color={isSelected ? COLORS.primaryDark : COLORS.textSecondary} size={14} />
                <Text style={[styles.timeChipText, isSelected && styles.activeTimeText]}>{time}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Step 3: Services Selection */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.stepTitle}>{t('booking.step3')}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
            {services.length} {t('booking.servicesAvailable')}
          </Text>
        </View>

        {/* Category Horizontal Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['All', 'Full Service', 'Minyak Hitam', 'Gear Oil', 'CVT', 'Throttle Body', 'Brake Pad', 'Chain & Sprocket', 'Tayar Depan', 'Tayar Belakang', 'Spark Plug', 'Bateri', 'Coolant', 'Brake Fluid', 'Fork Oil', '2T'].map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                serviceCategoryFilter === cat && styles.activeCategoryChip,
              ]}
              onPress={() => setServiceCategoryFilter(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  serviceCategoryFilter === cat && styles.activeCategoryChipText,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loadingServices ? (
          <View style={styles.noServicesCard}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.noServicesText}>{t('common.loading')}</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.noServicesCard}>
            <Text style={styles.noServicesText}>{t('services.noServicesConfigured')}</Text>
          </View>
        ) : (
          services
            .filter(srv => {
              if (serviceCategoryFilter !== 'All') {
                const sCat = (srv.category || '').toLowerCase();
                const fCat = serviceCategoryFilter.toLowerCase();
                if (!sCat.includes(fCat) && !fCat.includes(sCat)) return false;
              }
              if (serviceSearch.trim()) {
                const q = serviceSearch.toLowerCase();
                const n = (srv.name || '').toLowerCase();
                const d = (srv.description || '').toLowerCase();
                if (!n.includes(q) && !d.includes(q)) return false;
              }
              return true;
            })
            .map(srv => {
              const isChecked = selectedServices.includes(srv.id);
              return (
                <TouchableOpacity
                  key={srv.id}
                  style={[styles.serviceCard, isChecked && styles.activeServiceCard]}
                  onPress={() => toggleService(srv.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.checkboxRow}>
                    <View style={[styles.checkbox, isChecked && styles.checkedBox]}>
                      {isChecked && <CheckCircle2 color={COLORS.primaryDark} size={16} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceTitle}>{srv.name}</Text>
                      <Text style={styles.serviceMeta}>
                        {srv.category || 'General'}{srv.estimated_duration_minutes ? ` • ~${srv.estimated_duration_minutes} min` : ''}
                      </Text>
                    </View>
                    <Text style={styles.servicePrice}>{formatCurrency(srv.price || 0)}</Text>
                  </View>
                  {srv.description ? <Text style={styles.serviceDesc}>{srv.description}</Text> : null}
                </TouchableOpacity>
              );
            })
        )}

        {/* Summary Card */}
        {selectedServices.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t('booking.bookingSummary').toUpperCase()}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('motorcycle.details')}:</Text>
              <Text style={styles.summaryValue}>{selectedMotorcycle ? `${selectedMotorcycle.brand} ${selectedMotorcycle.model}` : '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('dashboard.workshop')}:</Text>
              <Text style={styles.summaryValue}>{selectedWorkshop?.name ?? '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('common.date')} & {t('common.time')}:</Text>
              <Text style={styles.summaryValue}>{selectedDate || '-'} at {selectedTime || '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('booking.totalServices')}:</Text>
              <Text style={styles.summaryValue}>{selectedServices.length} {t('common.selected')}</Text>
            </View>
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4 }]}>
              <Text style={[styles.summaryLabel, { fontWeight: '900', color: COLORS.textPrimary }]}>{t('common.total')}:</Text>
              <Text style={[styles.summaryValue, { color: COLORS.primary, fontSize: 16, fontWeight: '900' }]}>
                {formatCurrency(totalPrice)}
              </Text>
            </View>
            <CustomButton
              title={submitting ? t('booking.submittingBooking') : t('booking.confirmBooking')}
              onPress={handleConfirmBooking}
              icon={submitting ? <ActivityIndicator size="small" color={COLORS.primaryDark} /> : <Zap color={COLORS.primaryDark} size={18} />}
              disabled={submitting || !selectedDate || !selectedTime || !selectedWorkshop || selectedServices.length === 0}
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </ScrollView>

      {/* Workshop Selector Modal */}
      <Modal visible={showWorkshopModal} transparent animationType="fade" onRequestClose={() => setShowWorkshopModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('booking.selectWorkshop')}</Text>
              <TouchableOpacity onPress={() => setShowWorkshopModal(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {workshops.map(ws => {
                const isSelected = selectedWorkshop?.id === ws.id;
                return (
                  <TouchableOpacity
                    key={ws.id}
                    style={[styles.workshopItem, isSelected && styles.selectedWorkshopItem]}
                    onPress={() => handleSelectWorkshop(ws)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.workshopItemName, isSelected && styles.selectedWorkshopItemText]}>{ws.name}</Text>
                      {ws.address ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MapPin color={COLORS.textMuted} size={12} />
                          <Text style={styles.workshopItemAddress} numberOfLines={1}>{ws.address}</Text>
                        </View>
                      ) : null}
                    </View>
                    {isSelected && <Check color={COLORS.primary} size={18} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <ShieldCheck color={COLORS.success} size={42} />
            </View>
            <Text style={styles.modalTitle}>{t('booking.bookingSubmittedTitle')}</Text>
            <Text style={styles.modalSub}>
              {t('booking.bookingSubmittedSub')}
            </Text>
            <View style={styles.ticketBox}>
              <Text style={styles.ticketDetail}>{t('common.date')}: {selectedDate} at {selectedTime}</Text>
              <Text style={styles.ticketDetail}>{t('common.total')}: {formatCurrency(totalPrice)}</Text>
            </View>
            <CustomButton title={t('booking.viewMyBookings')} onPress={() => { setShowSuccessModal(false); router.replace('/(customer)/history'); }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  stepTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 14, marginBottom: 10 },
  dropdownBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  dropdownLabel: { color: COLORS.primaryDim, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  dropdownValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 2 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceContainer, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  activeDateChip: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.primary },
  dateChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  activeDateText: { color: COLORS.textPrimary },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  timeChip: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.surfaceContainer, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  activeTimeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  activeTimeText: { color: COLORS.primaryDark, fontWeight: '800' },
  categoryChip: { backgroundColor: COLORS.surfaceContainer, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  activeCategoryChip: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: COLORS.primary },
  categoryChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  activeCategoryChipText: { color: COLORS.primary, fontWeight: '800' },
  noServicesCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 8 },
  noServicesText: { color: COLORS.textSecondary, fontSize: 13 },
  serviceCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, gap: 8 },
  activeServiceCard: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceElevated },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.borderHighlight, justifyContent: 'center', alignItems: 'center' },
  checkedBox: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  serviceTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  serviceMeta: { color: COLORS.primaryDim, fontSize: 11, fontWeight: '600', marginTop: 2 },
  servicePrice: { color: COLORS.primary, fontSize: 16, fontWeight: '900' },
  serviceDesc: { color: COLORS.textSecondary, fontSize: 12, paddingLeft: 34 },
  summaryCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.primary, marginTop: 16, gap: 8 },
  summaryTitle: { color: COLORS.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  summaryValue: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  totalPriceText: { color: COLORS.primary, fontSize: 22, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.surfaceContainer, borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: COLORS.primary, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.successBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.success, alignSelf: 'center' },
  modalSub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  ticketBox: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 12, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: COLORS.border },
  ticketDetail: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  workshopItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  selectedWorkshopItem: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.primary },
  workshopItemName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  selectedWorkshopItemText: { color: COLORS.primary, fontWeight: '800' },
  workshopItemAddress: { color: COLORS.textMuted, fontSize: 11 },
});
