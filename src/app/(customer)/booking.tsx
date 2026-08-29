import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DARK_COLORS } from '../../constants/theme';
import { getWorkshops, getWorkshopServices } from '../../services/workshopService';
import { createBooking } from '../../services/bookingService';
import { getMotorcycles, createMotorcycle } from '../../services/motorcycleService';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveModal } from '../../components/responsive/ResponsiveModal';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Wrench,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Bike,
  Plus,
  MapPin,
  Check,
  CalendarDays,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { getCategoryFilterList, formatCategoryName, matchesCategoryFilter } from '../../utils/categoryUtils';
import type { Workshop, Service, Motorcycle } from '../../types/database';

export default function CustomerBookingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, formatDate, formatCurrency, language } = useTranslation();
  const { isPhone, isDesktop, contentPadding } = useResponsive();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showMobileSummaryExpanded, setShowMobileSummaryExpanded] = useState(false);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('All');
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quick Add Motorcycle State
  const [showAddBikeModal, setShowAddBikeModal] = useState(false);
  const [newBikeBrand, setNewBikeBrand] = useState('');
  const [newBikeModel, setNewBikeModel] = useState('');
  const [newBikePlate, setNewBikePlate] = useState('');
  const [savingBike, setSavingBike] = useState(false);

  // Category Filter Navigation
  const categoryScrollRef = useRef<ScrollView>(null);
  const categoryList = getCategoryFilterList(language);

  const handlePrevCategory = () => {
    const currentIndex = categoryList.findIndex((c) => c.key === serviceCategoryFilter);
    if (currentIndex > 0) {
      const prevCat = categoryList[currentIndex - 1];
      setServiceCategoryFilter(prevCat.key);
      categoryScrollRef.current?.scrollTo({
        x: Math.max(0, (currentIndex - 1) * 110 - 40),
        animated: true,
      });
    }
  };

  const handleNextCategory = () => {
    const currentIndex = categoryList.findIndex((c) => c.key === serviceCategoryFilter);
    if (currentIndex < categoryList.length - 1) {
      const nextCat = categoryList[currentIndex + 1];
      setServiceCategoryFilter(nextCat.key);
      categoryScrollRef.current?.scrollTo({
        x: (currentIndex + 1) * 110 - 40,
        animated: true,
      });
    }
  };

  // Calendar State & Helpers
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const MONTH_NAMES: Record<string, string[]> = {
    'en-GB': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    'ms-MY': ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
  };

  const DAY_NAMES: Record<string, string[]> = {
    'en-GB': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    'ms-MY': ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
  };

  const handlePrevMonth = () => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prev = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    if (prev >= currentMonthStart) {
      setCalendarMonth(prev);
    }
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const getDaysInMonthGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: Array<{
      dayNumber: number;
      dateString: string;
      isPast: boolean;
      isToday: boolean;
    } | null> = [];

    // Blank padding before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(year, month, d);
      current.setHours(0, 0, 0, 0);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateString,
        isPast: current < today,
        isToday: current.getTime() === today.getTime(),
      });
    }

    return days;
  };

  const availableTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

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
      if (preselectedId && !allWs.some((w) => w.id === preselectedId)) {
        const paramWorkshop: Workshop = {
          id: preselectedId,
          owner_id: user?.id || 'a0000000-0000-0000-0000-000000000002',
          name: preselectedName ? decodeURIComponent(preselectedName) : 'Wan Legacy Motor',
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
      const bookableWorkshops = allWs.filter((w) => w.booking_enabled !== false);
      setWorkshops(bookableWorkshops.length > 0 ? bookableWorkshops : allWs);
      setMotorcycles(bikesList);
      if (bikesList.length > 0) setSelectedMotorcycle(bikesList[0]);

      let targetWorkshop = preselectedId ? allWs.find((w) => w.id === preselectedId) : null;

      if (targetWorkshop && targetWorkshop.booking_enabled === false) {
        Alert.alert(
          'Booking Unavailable',
          `${targetWorkshop.name} is a directory listing and is not currently taking RiderHood online bookings.`
        );
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
        const match = svcs.find((s) => s.name.toLowerCase() === preselectedService.toLowerCase());
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

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectedServiceItems = services.filter((s) => selectedServices.includes(s.id));
  const totalPrice = selectedServiceItems.reduce((acc, curr) => acc + (curr.price || 0), 0);

  const handleQuickAddBike = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to add a motorcycle.');
      return;
    }
    if (!newBikeBrand.trim() || !newBikeModel.trim() || !newBikePlate.trim()) {
      Alert.alert('Incomplete Form', 'Please provide motorcycle brand, model, and plate number.');
      return;
    }
    setSavingBike(true);
    try {
      const bike = await createMotorcycle({
        owner_id: user.id,
        brand: newBikeBrand.trim(),
        model: newBikeModel.trim(),
        plate_number: newBikePlate.trim().toUpperCase(),
        nickname: `${newBikeBrand.trim()} ${newBikeModel.trim()}`,
      });
      setMotorcycles((prev) => [bike, ...prev]);
      setSelectedMotorcycle(bike);
      setShowAddBikeModal(false);
      setNewBikeBrand('');
      setNewBikeModel('');
      setNewBikePlate('');
      Alert.alert('Motorcycle Added', `${bike.brand} ${bike.model} (${bike.plate_number}) has been registered and selected.`);
    } catch (err: any) {
      Alert.alert('Failed to Add Motorcycle', err.message || 'Could not save motorcycle.');
    } finally {
      setSavingBike(false);
    }
  };

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
      Alert.alert(
        'No Motorcycle Selected',
        'Please select or add a motorcycle from your garage to proceed with this booking.',
        [
          { text: 'Add Motorcycle', onPress: () => setShowAddBikeModal(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
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
      console.log('[Booking] Submitting service booking to database...', {
        customer_id: user.id,
        workshop_id: selectedWorkshop.id,
        workshop_name: selectedWorkshop.name,
        motorcycle_id: selectedMotorcycle.id,
        booking_date: selectedDate,
        booking_time: selectedTime,
        services_count: selectedServices.length,
      });

      const res = await createBooking({
        customer_id: user.id,
        workshop_id: selectedWorkshop.id,
        motorcycle_id: selectedMotorcycle.id,
        booking_date: selectedDate,
        booking_time: selectedTime,
        services: selectedServices.map((id) => ({ service_id: id, quantity: 1 })),
      });

      console.log('[Booking] Successfully created booking record in Supabase:', res.id);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('[Booking] Booking submission error:', err);
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render Booking Steps Form ──────────────────────────────
  const renderBookingStepsForm = () => (
    <View style={styles.stepsFormWrapper}>
      {/* Step 0: Motorcycle Selection */}
      <View style={styles.stepSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={styles.stepTitle}>{t('booking.step0')}</Text>
          {motorcycles.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowAddBikeModal(true)}
              style={styles.addBikeQuickBtn}
              activeOpacity={0.7}
            >
              <Plus color={colors.primary} size={13} />
              <Text style={styles.addBikeQuickText}>Add Bike</Text>
            </TouchableOpacity>
          )}
        </View>

        {motorcycles.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateRow}>
              {motorcycles.map((bike) => {
                const isSelected = selectedMotorcycle?.id === bike.id;
                return (
                  <TouchableOpacity
                    key={bike.id}
                    style={[styles.dateChip, isSelected && styles.activeDateChip]}
                    onPress={() => setSelectedMotorcycle(bike)}
                    activeOpacity={0.8}
                  >
                    <Bike color={isSelected ? colors.primary : colors.textSecondary} size={14} />
                    <Text style={[styles.dateChipText, isSelected && styles.activeDateText]}>
                      {bike.nickname || `${bike.brand} ${bike.model}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.dateChip, { borderStyle: 'dashed' }]}
                onPress={() => setShowAddBikeModal(true)}
                activeOpacity={0.8}
              >
                <Plus color={colors.primary} size={14} />
                <Text style={[styles.dateChipText, { color: colors.primary }]}>New</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <TouchableOpacity
            style={styles.emptyBikeCard}
            onPress={() => setShowAddBikeModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.emptyBikeIconBox}>
              <Bike color={colors.primary} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyBikeTitle}>No Motorcycle in Garage</Text>
              <Text style={styles.emptyBikeSubtitle}>
                Add your motorcycle to proceed with workshop booking
              </Text>
            </View>
            <View style={styles.emptyBikeAddBtn}>
              <Plus color="#000" size={14} />
              <Text style={styles.emptyBikeAddText}>Add Bike</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Step 1: Workshop Selection */}
      <View style={styles.stepSection}>
        <Text style={styles.stepTitle}>{t('booking.step1')}</Text>
        <TouchableOpacity
          style={styles.dropdownBox}
          onPress={() => setShowWorkshopModal(true)}
          activeOpacity={0.8}
        >
          <Wrench color={colors.primary} size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dropdownLabel}>{t('booking.selectWorkshop').toUpperCase()}</Text>
            <Text style={styles.dropdownValue}>{selectedWorkshop?.name ?? t('booking.selectWorkshop')}</Text>
          </View>
          <ChevronDown color={colors.textSecondary} size={18} />
        </TouchableOpacity>
      </View>

      {/* Step 2 (Langkah 3): Date Picker & Time Slot */}
      <View style={styles.stepSection}>
        <Text style={styles.stepTitle}>{t('booking.step2')}</Text>

        {/* Interactive Calendar Date Picker Card */}
        <View style={styles.calendarCard}>
          {/* Month Header Navigation */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.calNavBtn}
              onPress={handlePrevMonth}
              activeOpacity={0.7}
              accessibilityLabel="Previous Month"
            >
              <ChevronLeft color={colors.textPrimary} size={18} />
            </TouchableOpacity>

            <View style={styles.calMonthTitleWrapper}>
              <CalendarDays color={colors.primary} size={16} />
              <Text style={styles.calMonthTitle}>
                {(MONTH_NAMES[language] || MONTH_NAMES['en-GB'])[calendarMonth.getMonth()]}{' '}
                {calendarMonth.getFullYear()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.calNavBtn}
              onPress={handleNextMonth}
              activeOpacity={0.7}
              accessibilityLabel="Next Month"
            >
              <ChevronRight color={colors.textPrimary} size={18} />
            </TouchableOpacity>
          </View>

          {/* Day of Week Headers */}
          <View style={styles.weekDaysRow}>
            {(DAY_NAMES[language] || DAY_NAMES['en-GB']).map((day, idx) => (
              <View key={idx} style={styles.weekDayCol}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {getDaysInMonthGrid(calendarMonth).map((item, index) => {
              if (!item) {
                return <View key={`blank-${index}`} style={styles.dayCellBlank} />;
              }

              const isSelected = selectedDate === item.dateString;
              const isDisabled = item.isPast;

              return (
                <TouchableOpacity
                  key={item.dateString}
                  style={[
                    styles.dayCell,
                    item.isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                    isDisabled && styles.dayCellDisabled,
                  ]}
                  disabled={isDisabled}
                  onPress={() => setSelectedDate(item.dateString)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      item.isToday && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                      isDisabled && styles.dayTextDisabled,
                    ]}
                  >
                    {item.dayNumber}
                  </Text>
                  {isSelected && <View style={styles.selectedDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Date Summary Indicator */}
          <View style={styles.selectedDateBadge}>
            <CalendarIcon color={colors.primary} size={15} />
            <Text style={styles.selectedDateText}>
              {t('common.date')}: <Text style={{ color: isDark ? colors.textPrimary : '#000000', fontWeight: '900' }}>{selectedDate || t('booking.title')}</Text>
            </Text>
          </View>
        </View>

        {/* Time Slot Selection */}
        <Text style={[styles.stepSubHeading, { marginTop: 18, marginBottom: 10 }]}>
          {t('booking.selectTime').toUpperCase()}
        </Text>
        <View style={styles.timeGrid}>
          {availableTimes.map((time) => {
            const isSelected = selectedTime === time;
            return (
              <TouchableOpacity
                key={time}
                style={[styles.timeChip, isSelected && styles.activeTimeChip]}
                onPress={() => setSelectedTime(time)}
                activeOpacity={0.8}
              >
                <Clock color={isSelected ? '#000000' : colors.textSecondary} size={14} />
                <Text style={[styles.timeChipText, isSelected && styles.activeTimeText]}>{time}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Step 3 (Langkah 4): Services Selection */}
      <View style={styles.stepSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.stepTitle}>{t('booking.step3')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>
            {services.length} {t('booking.servicesAvailable')}
          </Text>
        </View>

        {/* Category Navigation Bar with Prev & Next buttons */}
        <View style={styles.categoryNavRow}>
          <TouchableOpacity
            style={[
              styles.catNavBtn,
              categoryList.findIndex((c) => c.key === serviceCategoryFilter) <= 0 && styles.catNavBtnDisabled,
            ]}
            onPress={handlePrevCategory}
            disabled={categoryList.findIndex((c) => c.key === serviceCategoryFilter) <= 0}
            activeOpacity={0.7}
            accessibilityLabel="Previous Category"
          >
            <ChevronLeft
              color={
                categoryList.findIndex((c) => c.key === serviceCategoryFilter) <= 0
                  ? colors.textMuted
                  : colors.primary
              }
              size={18}
            />
          </TouchableOpacity>

          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollTrack}
          >
            {categoryList.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  serviceCategoryFilter === cat.key && styles.activeCategoryChip,
                ]}
                onPress={() => setServiceCategoryFilter(cat.key)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    serviceCategoryFilter === cat.key && styles.activeCategoryChipText,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.catNavBtn,
              categoryList.findIndex((c) => c.key === serviceCategoryFilter) >= categoryList.length - 1 &&
                styles.catNavBtnDisabled,
            ]}
            onPress={handleNextCategory}
            disabled={
              categoryList.findIndex((c) => c.key === serviceCategoryFilter) >= categoryList.length - 1
            }
            activeOpacity={0.7}
            accessibilityLabel="Next Category"
          >
            <ChevronRight
              color={
                categoryList.findIndex((c) => c.key === serviceCategoryFilter) >= categoryList.length - 1
                  ? colors.textMuted
                  : colors.primary
              }
              size={18}
            />
          </TouchableOpacity>
        </View>

        {loadingServices ? (
          <View style={styles.noServicesCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.noServicesText}>{t('common.loading')}</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.noServicesCard}>
            <Text style={styles.noServicesText}>{t('services.noServicesConfigured')}</Text>
          </View>
        ) : (
          <View style={styles.servicesGridList}>
            {services
              .filter((srv) => {
                if (!matchesCategoryFilter(srv.category, serviceCategoryFilter)) {
                  return false;
                }
                if (serviceSearch.trim()) {
                  const q = serviceSearch.toLowerCase();
                  const n = (srv.name || '').toLowerCase();
                  const d = (srv.description || '').toLowerCase();
                  if (!n.includes(q) && !d.includes(q)) return false;
                }
                return true;
              })
              .map((srv) => {
                const isSelected = selectedServices.includes(srv.id);
                return (
                  <TouchableOpacity
                    key={srv.id}
                    style={[styles.serviceCard, isSelected && styles.activeServiceCard]}
                    onPress={() => toggleService(srv.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.checkboxRow}>
                      <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
                        {isSelected && <Check color="#000" size={14} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceTitle}>{srv.name}</Text>
                        <Text style={styles.serviceMeta}>
                          {formatCategoryName(srv.category || 'General', language)} • ~
                          {srv.estimated_duration_minutes || 30} mins
                        </Text>
                      </View>
                      <Text style={styles.servicePrice}>RM {Number(srv.price).toFixed(2)}</Text>
                    </View>
                    {srv.description ? <Text style={styles.serviceDesc}>{srv.description}</Text> : null}
                  </TouchableOpacity>
                );
              })}
          </View>
        )}
      </View>
    </View>
  );

  // ─── Render Sticky Summary Card ─────────────────────────────
  const renderSummaryCard = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{t('booking.bookingSummary').toUpperCase()}</Text>

      {selectedMotorcycle && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('motorcycle.details')}:</Text>
          <Text style={styles.summaryValue}>
            {selectedMotorcycle.nickname || `${selectedMotorcycle.brand} ${selectedMotorcycle.model}`}
          </Text>
        </View>
      )}

      {selectedWorkshop && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('booking.selectWorkshop')}:</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {selectedWorkshop.name}
          </Text>
        </View>
      )}

      {selectedDate && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('common.date')}:</Text>
          <Text style={styles.summaryValue}>
            {selectedDate} {selectedTime ? `at ${selectedTime}` : ''}
          </Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{t('booking.totalServices')}:</Text>
        <Text style={styles.summaryValue}>
          {selectedServices.length} {t('common.selected')}
        </Text>
      </View>

      {/* Selected Services Itemized List */}
      {selectedServiceItems.length > 0 && (
        <View style={styles.itemizedList}>
          {selectedServiceItems.map((item) => (
            <View key={item.id} style={styles.itemizedRow}>
              <Text style={styles.itemizedName} numberOfLines={1}>
                • {item.name}
              </Text>
              <Text style={styles.itemizedPrice}>RM {Number(item.price).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      <View
        style={[
          styles.summaryRow,
          { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
        ]}
      >
        <Text style={[styles.summaryLabel, { fontWeight: '900', color: colors.textPrimary }]}>
          {t('common.total')}:
        </Text>
        <Text style={[styles.summaryValue, { color: colors.primary, fontSize: 18, fontWeight: '900' }]}>
          {formatCurrency(totalPrice)}
        </Text>
      </View>

      <CustomButton
        title={submitting ? t('booking.submittingBooking') : t('booking.confirmBooking')}
        onPress={handleConfirmBooking}
        icon={
          submitting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Zap color="#000" size={18} />
          )
        }
        disabled={
          submitting ||
          !selectedDate ||
          !selectedTime ||
          !selectedWorkshop ||
          selectedServices.length === 0
        }
        style={{ marginTop: 12 }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('booking.title')} subtitle={t('booking.subtitle')} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: contentPadding,
            paddingBottom:
              isPhone && selectedServices.length > 0
                ? showMobileSummaryExpanded
                  ? 340
                  : 150
                : 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {isPhone ? (
            // Mobile: Stacked steps (Summary floats at bottom when items selected)
            <View style={{ gap: 16 }}>
              {renderBookingStepsForm()}
              {selectedServices.length === 0 && renderSummaryCard()}
            </View>
          ) : (
            // Tablet & Desktop: 2-column layout (Steps on Left, Summary on Right)
            <View style={styles.desktopLayoutRow}>
              <View style={styles.desktopLeftStepsCol}>{renderBookingStepsForm()}</View>
              <View style={styles.desktopRightSummaryCol}>{renderSummaryCard()}</View>
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* Floating Summary Bar for Mobile View when items are added */}
      {isPhone && selectedServices.length > 0 && (
        <View style={styles.floatingMobileSummary}>
          {/* Header Row: Tap to expand / collapse full breakdown */}
          <TouchableOpacity
            style={styles.floatingSummaryHeader}
            onPress={() => setShowMobileSummaryExpanded(!showMobileSummaryExpanded)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.floatingBadge}>
                <Text style={styles.floatingBadgeText}>{selectedServices.length}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.floatingTitle}>{t('booking.bookingSummary').toUpperCase()}</Text>
                <Text style={styles.floatingItemsSub} numberOfLines={1}>
                  {selectedServices.length} {t('common.selected')} • {selectedWorkshop ? selectedWorkshop.name : t('booking.selectWorkshop')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.floatingTotalPrice}>{formatCurrency(totalPrice)}</Text>
              {showMobileSummaryExpanded ? (
                <ChevronDown color={colors.textSecondary} size={20} />
              ) : (
                <ChevronUp color={colors.textSecondary} size={20} />
              )}
            </View>
          </TouchableOpacity>

          {/* Expanded Breakdown Drawer if opened */}
          {showMobileSummaryExpanded && (
            <ScrollView
              style={styles.floatingExpandedContent}
              contentContainerStyle={{ gap: 6, paddingBottom: 6 }}
              showsVerticalScrollIndicator={false}
            >
              {selectedMotorcycle && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('motorcycle.details')}:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedMotorcycle.nickname || `${selectedMotorcycle.brand} ${selectedMotorcycle.model}`}
                  </Text>
                </View>
              )}

              {selectedWorkshop && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('booking.selectWorkshop')}:</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {selectedWorkshop.name}
                  </Text>
                </View>
              )}

              {selectedDate && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('common.date')}:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedDate} {selectedTime ? `at ${selectedTime}` : ''}
                  </Text>
                </View>
              )}

              {/* Itemized list */}
              {selectedServiceItems.length > 0 && (
                <View style={styles.itemizedList}>
                  {selectedServiceItems.map((item) => (
                    <View key={item.id} style={styles.itemizedRow}>
                      <Text style={styles.itemizedName} numberOfLines={1}>
                        • {item.name}
                      </Text>
                      <Text style={styles.itemizedPrice}>RM {Number(item.price).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {/* Main Action Button */}
          <CustomButton
            title={submitting ? t('booking.submittingBooking') : t('booking.confirmBooking')}
            onPress={handleConfirmBooking}
            icon={
              submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Zap color="#000" size={18} />
              )
            }
            disabled={
              submitting ||
              !selectedDate ||
              !selectedTime ||
              !selectedWorkshop ||
              selectedServices.length === 0
            }
            style={{ marginTop: 8 }}
          />
        </View>
      )}

      {/* Workshop Selector Modal */}
      <ResponsiveModal
        visible={showWorkshopModal}
        onClose={() => setShowWorkshopModal(false)}
        title={t('booking.selectWorkshop')}
      >
        <View style={{ gap: 8 }}>
          {workshops.map((ws) => {
            const isSelected = selectedWorkshop?.id === ws.id;
            return (
              <TouchableOpacity
                key={ws.id}
                style={[styles.workshopItem, isSelected && styles.selectedWorkshopItem]}
                onPress={() => handleSelectWorkshop(ws)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.workshopItemName, isSelected && styles.selectedWorkshopItemText]}>
                    {ws.name}
                  </Text>
                  {ws.address ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MapPin color={colors.textMuted} size={12} />
                      <Text style={styles.workshopItemAddress} numberOfLines={1}>
                        {ws.address}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {isSelected && <Check color={colors.primary} size={18} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ResponsiveModal>

      {/* Success Modal */}
      <ResponsiveModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={t('booking.bookingSubmittedTitle')}
        showCloseButton={false}
      >
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={styles.modalIconBox}>
            <ShieldCheck color={colors.success} size={36} />
          </View>
          <Text style={styles.modalSub}>{t('booking.bookingSubmittedSub')}</Text>
          <View style={styles.ticketBox}>
            <Text style={styles.ticketDetail}>
              {t('common.date')}: {selectedDate} at {selectedTime}
            </Text>
            <Text style={styles.ticketDetail}>
              {t('common.total')}: {formatCurrency(totalPrice)}
            </Text>
          </View>
          <CustomButton
            title={t('booking.viewMyBookings')}
            onPress={() => {
              setShowSuccessModal(false);
              router.replace('/(customer)/history');
            }}
            style={{ width: '100%', marginTop: 8 }}
          />
        </View>
      </ResponsiveModal>

      {/* Quick Add Motorcycle Modal */}
      <ResponsiveModal
        visible={showAddBikeModal}
        onClose={() => setShowAddBikeModal(false)}
        title="Add Motorcycle to Garage"
      >
        <View style={{ gap: 14 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Register your motorcycle details to select it for this booking.
          </Text>

          <View style={{ gap: 6 }}>
            <Text style={styles.inputLabel}>BRAND (E.G. YAMAHA, HONDA)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Yamaha"
              placeholderTextColor={colors.textMuted}
              value={newBikeBrand}
              onChangeText={setNewBikeBrand}
              autoCapitalize="words"
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.inputLabel}>MODEL (E.G. Y15ZR, RS150R, MT-09)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Y15ZR"
              placeholderTextColor={colors.textMuted}
              value={newBikeModel}
              onChangeText={setNewBikeModel}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.inputLabel}>PLATE NUMBER</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. WAA 1234"
              placeholderTextColor={colors.textMuted}
              value={newBikePlate}
              onChangeText={setNewBikePlate}
              autoCapitalize="characters"
            />
          </View>

          <CustomButton
            title={savingBike ? 'Saving Motorcycle...' : 'Save & Select Motorcycle'}
            onPress={handleQuickAddBike}
            disabled={savingBike || !newBikeBrand.trim() || !newBikeModel.trim() || !newBikePlate.trim()}
            style={{ marginTop: 8 }}
          />
        </View>
      </ResponsiveModal>
    </SafeAreaView>
  );
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingVertical: 16, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
    loadingText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

    desktopLayoutRow: {
      flexDirection: 'row',
      gap: 24,
      width: '100%',
      alignItems: 'flex-start',
    },
    desktopLeftStepsCol: {
      flex: 1.2,
      minWidth: 360,
    },
    desktopRightSummaryCol: {
      flex: 0.8,
      minWidth: 280,
      position: 'relative',
    },

    stepsFormWrapper: {
      gap: 16,
      width: '100%',
    },
    stepSection: {
      gap: 8,
    },
    stepTitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginTop: 6,
      marginBottom: 4,
    },
    addBikeQuickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.1)' : 'rgba(255, 107, 0, 0.08)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 107, 0, 0.3)' : 'rgba(255, 107, 0, 0.2)',
    },
    addBikeQuickText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    emptyBikeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceContainer,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    emptyBikeIconBox: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyBikeTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    emptyBikeSubtitle: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    emptyBikeAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
    },
    emptyBikeAddText: {
      color: isDark ? '#000' : '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    inputLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    textInput: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    dropdownBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownLabel: { color: colors.primaryDim, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
    dropdownValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 2 },
    dateRow: { flexDirection: 'row', gap: 8 },
    dateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceContainer,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeDateChip: { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)', borderColor: colors.primary },
    dateChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    activeDateText: { color: colors.textPrimary },
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    timeChip: {
      flex: 1,
      minWidth: '30%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.surfaceContainer,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeTimeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
    timeChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    activeTimeText: { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '800' },
    categoryNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    catNavBtn: {
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      width: 32,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catNavBtnDisabled: {
      opacity: 0.35,
    },
    categoryScrollTrack: {
      gap: 8,
      alignItems: 'center',
    },
    categoryChip: {
      backgroundColor: colors.surfaceContainer,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeCategoryChip: { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)', borderColor: colors.primary },
    categoryChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
    activeCategoryChipText: { color: colors.primary, fontWeight: '800' },
    noServicesCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 14,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 8,
    },
    noServicesText: { color: colors.textSecondary, fontSize: 13 },
    servicesGridList: {
      gap: 8,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceContainer,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
    },
    searchField: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      padding: 0,
    },
    calendarCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    calNavBtn: {
      backgroundColor: colors.surface,
      padding: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    calMonthTitleWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    calMonthTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    weekDaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    weekDayCol: {
      width: '14.28%',
      alignItems: 'center',
    },
    weekDayText: {
      color: colors.primaryDim,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCellBlank: {
      width: '14.28%',
      height: 38,
    },
    dayCell: {
      width: '14.28%',
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 10,
      marginVertical: 2,
      position: 'relative',
    },
    dayCellToday: {
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.5)',
    },
    dayCellSelected: {
      backgroundColor: colors.primary,
    },
    dayCellDisabled: {
      opacity: 0.25,
    },
    dayText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    dayTextToday: {
      color: colors.primary,
      fontWeight: '800',
    },
    dayTextSelected: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontWeight: '900',
    },
    dayTextDisabled: {
      color: colors.textMuted,
    },
    selectedDot: {
      position: 'absolute',
      bottom: 3,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
    },
    selectedDateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.1)' : 'rgba(255, 107, 0, 0.08)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 107, 0, 0.25)' : 'rgba(255, 107, 0, 0.2)',
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    selectedDateText: {
      color: colors.primaryDim,
      fontSize: 11,
      fontWeight: '700',
    },
    stepSubHeading: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    servicesGrid: { gap: 10 },
    emptyServices: {
      padding: 24,
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    serviceCard: {
      backgroundColor: colors.surfaceContainer,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    activeServiceCard: { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(255, 107, 0, 0.08)' : 'rgba(255, 107, 0, 0.06)' },
    selectedServiceCard: { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.1)' : 'rgba(255, 107, 0, 0.08)', borderColor: colors.primary },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    serviceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    activeCheckbox: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkedBox: { backgroundColor: colors.primary, borderColor: colors.primary },
    serviceTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
    serviceName: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
    serviceMeta: { color: colors.primaryDim, fontSize: 11, fontWeight: '600', marginTop: 2 },
    servicePrice: { color: colors.primary, fontSize: 15, fontWeight: '900' },
    serviceDesc: { color: colors.textSecondary, fontSize: 12, paddingLeft: 34 },

    summaryCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.primary,
      gap: 8,
      width: '100%',
    },
    summaryTitle: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    summaryValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
    itemizedList: {
      paddingVertical: 6,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      gap: 4,
      marginVertical: 4,
    },
    itemizedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemizedName: { color: colors.textSecondary, fontSize: 12, flex: 1 },
    itemizedPrice: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },

    modalIconBox: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.successBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.success,
    },
    modalSub: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
    ticketBox: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    ticketDetail: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
    workshopItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedWorkshopItem: { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.1)', borderColor: colors.primary },
    workshopItemName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    selectedWorkshopItemText: { color: colors.primary, fontWeight: '800' },
    workshopItemAddress: { color: colors.textMuted, fontSize: 11 },

    // Floating Mobile Booking Summary Card
    floatingMobileSummary: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surfaceContainer,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1.5,
      borderBottomWidth: 0,
      borderColor: isDark ? 'rgba(255, 122, 0, 0.5)' : 'rgba(255, 122, 0, 0.3)',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: isDark ? 0.6 : 0.15,
      shadowRadius: 14,
      elevation: 24,
      zIndex: 999,
    },
    floatingSummaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    floatingBadge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      width: 22,
      height: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    floatingBadgeText: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    floatingTitle: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    floatingItemsSub: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
    },
    floatingTotalPrice: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: '900',
    },
    floatingExpandedContent: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      maxHeight: 180,
    },
  });
