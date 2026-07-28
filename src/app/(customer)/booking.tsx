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
  Wrench, ChevronDown, ShieldCheck, Zap, Bike,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import type { Workshop, Service, Motorcycle } from '../../types/database';

export default function CustomerBookingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate next 7 available dates
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split('T')[0];
  });
  const availableTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

  const loadInitialData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [ws, bikes] = await Promise.all([
        getWorkshops(),
        getMotorcycles(user.id),
      ]);
      setWorkshops(ws);
      setMotorcycles(bikes);
      if (bikes.length > 0) setSelectedMotorcycle(bikes[0]);

      // Pre-select workshop from route params
      const preselectedId = params.workshopId as string | undefined;
      if (preselectedId) {
        const ws2 = ws.find(w => w.id === preselectedId) ?? ws[0] ?? null;
        setSelectedWorkshop(ws2);
        if (ws2) {
          const svcs = await getWorkshopServices(ws2.id);
          setServices(svcs);
        }
      } else if (ws.length > 0) {
        setSelectedWorkshop(ws[0]);
        const svcs = await getWorkshopServices(ws[0].id);
        setServices(svcs);
      }
    } catch {
      setError('Failed to load booking data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, params.workshopId]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const toggleService = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectedServiceItems = services.filter(s => selectedServices.includes(s.id));
  const totalPrice = selectedServiceItems.reduce((acc, curr) => acc + curr.price, 0);

  const handleConfirmBooking = async () => {
    if (!user?.id || !selectedWorkshop || !selectedMotorcycle) return;
    if (selectedServices.length === 0) {
      Alert.alert('No Services Selected', 'Please select at least one service.');
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
      Alert.alert('Booking Failed', err.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Service Booking" subtitle="Schedule Maintenance & Diagnostics" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading available workshops...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (workshops.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Service Booking" subtitle="Schedule Maintenance & Diagnostics" />
        <View style={styles.centered}>
          <Wrench color={COLORS.textMuted} size={48} />
          <Text style={styles.emptyTitle}>No Workshops Available</Text>
          <Text style={styles.emptyDesc}>No approved workshops are available yet. Please check back later.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Service Booking" subtitle="Schedule Maintenance & Diagnostics" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 0: Motorcycle */}
        {motorcycles.length > 0 && (
          <>
            <Text style={styles.stepTitle}>0. SELECT MOTORCYCLE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.dateRow}>
                {motorcycles.map(bike => {
                  const isSelected = selectedMotorcycle?.id === bike.id;
                  return (
                    <TouchableOpacity key={bike.id} style={[styles.dateChip, isSelected && styles.activeDateChip]} onPress={() => setSelectedMotorcycle(bike)} activeOpacity={0.8}>
                      <Bike color={isSelected ? COLORS.primary : COLORS.textSecondary} size={14} />
                      <Text style={[styles.dateChipText, isSelected && styles.activeDateText]}>{bike.nickname || `${bike.brand} ${bike.model}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        {/* Step 1: Workshop */}
        <Text style={styles.stepTitle}>1. CHOOSE WORKSHOP LAB</Text>
        <View style={styles.dropdownBox}>
          <Wrench color={COLORS.primary} size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dropdownLabel}>TARGET WORKSHOP</Text>
            <Text style={styles.dropdownValue}>{selectedWorkshop?.name ?? 'Select a workshop'}</Text>
          </View>
          <ChevronDown color={COLORS.textSecondary} size={18} />
        </View>

        {/* Step 2: Date & Time */}
        <Text style={styles.stepTitle}>2. SELECT DATE & TIME SLOT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={styles.dateRow}>
            {availableDates.map(date => {
              const isSelected = selectedDate === date;
              return (
                <TouchableOpacity key={date} style={[styles.dateChip, isSelected && styles.activeDateChip]} onPress={() => setSelectedDate(date)} activeOpacity={0.8}>
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
              <TouchableOpacity key={time} style={[styles.timeChip, isSelected && styles.activeTimeChip]} onPress={() => setSelectedTime(time)} activeOpacity={0.8}>
                <Clock color={isSelected ? COLORS.primaryDark : COLORS.textSecondary} size={14} />
                <Text style={[styles.timeChipText, isSelected && styles.activeTimeText]}>{time}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Step 3: Services */}
        <Text style={styles.stepTitle}>3. SELECT SERVICES</Text>
        {services.length === 0 ? (
          <View style={styles.noServicesCard}>
            <Text style={styles.noServicesText}>This workshop has no services configured yet.</Text>
          </View>
        ) : (
          services.map(srv => {
            const isChecked = selectedServices.includes(srv.id);
            return (
              <TouchableOpacity key={srv.id} style={[styles.serviceCard, isChecked && styles.activeServiceCard]} onPress={() => toggleService(srv.id)} activeOpacity={0.8}>
                <View style={styles.checkboxRow}>
                  <View style={[styles.checkbox, isChecked && styles.checkedBox]}>
                    {isChecked && <CheckCircle2 color={COLORS.primaryDark} size={16} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>{srv.name}</Text>
                    <Text style={styles.serviceMeta}>{srv.category ?? ''}{srv.estimated_duration_minutes ? ` • ~${srv.estimated_duration_minutes} min` : ''}</Text>
                  </View>
                  <Text style={styles.servicePrice}>RM {srv.price.toFixed(2)}</Text>
                </View>
                {srv.description ? <Text style={styles.serviceDesc}>{srv.description}</Text> : null}
              </TouchableOpacity>
            );
          })
        )}

        {/* Summary */}
        {selectedServices.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total ({selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''})</Text>
              <Text style={styles.totalPriceText}>RM {totalPrice.toFixed(2)}</Text>
            </View>
            <CustomButton
              title={submitting ? 'SUBMITTING...' : 'CONFIRM & BOOK SLOT'}
              onPress={handleConfirmBooking}
              icon={submitting ? <ActivityIndicator size="small" color={COLORS.primaryDark} /> : <Zap color={COLORS.primaryDark} size={18} />}
              disabled={submitting}
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <ShieldCheck color={COLORS.success} size={42} />
            </View>
            <Text style={styles.modalTitle}>BOOKING SUBMITTED!</Text>
            <Text style={styles.modalSub}>
              Your booking at <Text style={{ color: COLORS.primary }}>{selectedWorkshop?.name}</Text> is pending confirmation from the workshop.
            </Text>
            <View style={styles.ticketBox}>
              <Text style={styles.ticketDetail}>Date: {selectedDate} at {selectedTime}</Text>
              <Text style={styles.ticketDetail}>Total: RM {totalPrice.toFixed(2)}</Text>
            </View>
            <CustomButton title="VIEW MY BOOKINGS" onPress={() => { setShowSuccessModal(false); router.replace('/(customer)/history'); }} />
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
  noServicesCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
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
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  totalPriceText: { color: COLORS.primary, fontSize: 22, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.surfaceContainer, borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: COLORS.primary, gap: 12 },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.successBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.success },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900' },
  modalSub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  ticketBox: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 12, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: COLORS.border },
  ticketDetail: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
});
