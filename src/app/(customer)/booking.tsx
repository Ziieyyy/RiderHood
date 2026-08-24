import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { getWorkshops, getWorkshopServices } from '../../services/workshopService';
import { createBooking } from '../../services/bookingService';
import { getMotorcycles } from '../../services/motorcycleService';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveModal } from '../../components/responsive/ResponsiveModal';
import { useResponsive } from '../../hooks/useResponsive';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Wrench,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Bike,
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
        services: selectedServices.map((id) => ({ service_id: id, quantity: 1 })),
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

  // ─── Render Booking Steps Form ──────────────────────────────
  const renderBookingStepsForm = () => (
    <View style={styles.stepsFormWrapper}>
      {/* Step 0: Motorcycle Selection */}
      {motorcycles.length > 0 && (
        <View style={styles.stepSection}>
          <Text style={styles.stepTitle}>{t('booking.step0')}</Text>
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
                    <Bike color={isSelected ? COLORS.primary : COLORS.textSecondary} size={14} />
                    <Text style={[styles.dateChipText, isSelected && styles.activeDateText]}>
                      {bike.nickname || `${bike.brand} ${bike.model}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Step 1: Workshop Selection */}
      <View style={styles.stepSection}>
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
      </View>

      {/* Step 2 (Langkah 3): Services Selection */}
      <View style={styles.stepSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.stepTitle}>{t('booking.step2')}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
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
                  ? COLORS.textMuted
                  : COLORS.primary
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
                  ? COLORS.textMuted
                  : COLORS.primary
              }
              size={18}
            />
          </TouchableOpacity>
        </View>

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

      {/* Step 3 (Langkah 4): Date Picker & Time Slot */}
      <View style={styles.stepSection}>
        <Text style={styles.stepTitle}>{t('booking.step3')}</Text>

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
              <ChevronLeft color={COLORS.textPrimary} size={18} />
            </TouchableOpacity>

            <View style={styles.calMonthTitleWrapper}>
              <CalendarDays color={COLORS.primary} size={16} />
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
              <ChevronRight color={COLORS.textPrimary} size={18} />
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
            <CalendarIcon color={COLORS.primary} size={15} />
            <Text style={styles.selectedDateText}>
              {t('common.date')}: <Text style={{ color: COLORS.textPrimary, fontWeight: '900' }}>{selectedDate || t('booking.title')}</Text>
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
                <Clock color={isSelected ? '#000000' : COLORS.textSecondary} size={14} />
                <Text style={[styles.timeChipText, isSelected && styles.activeTimeText]}>{time}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
          { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4 },
        ]}
      >
        <Text style={[styles.summaryLabel, { fontWeight: '900', color: COLORS.textPrimary }]}>
          {t('common.total')}:
        </Text>
        <Text style={[styles.summaryValue, { color: COLORS.primary, fontSize: 18, fontWeight: '900' }]}>
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
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {isPhone ? (
            // Mobile: Stacked steps + summary card at bottom
            <View style={{ gap: 16 }}>
              {renderBookingStepsForm()}
              {renderSummaryCard()}
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
                      <MapPin color={COLORS.textMuted} size={12} />
                      <Text style={styles.workshopItemAddress} numberOfLines={1}>
                        {ws.address}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {isSelected && <Check color={COLORS.primary} size={18} />}
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
            <ShieldCheck color={COLORS.success} size={36} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingVertical: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },

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
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 4,
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownLabel: { color: COLORS.primaryDim, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  dropdownValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 2 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeDateChip: { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: COLORS.primary },
  dateChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  activeDateText: { color: COLORS.textPrimary },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  timeChip: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainer,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeTimeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  activeTimeText: { color: '#000000', fontWeight: '800' },
  categoryNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  categoryScrollTrack: {
    gap: 8,
    alignItems: 'center',
  },
  catNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catNavBtnDisabled: {
    opacity: 0.35,
    borderColor: 'transparent',
  },
  categoryChip: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeCategoryChip: { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: COLORS.primary },
  categoryChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  activeCategoryChipText: { color: COLORS.primary, fontWeight: '800' },
  noServicesCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
  },
  noServicesText: { color: COLORS.textSecondary, fontSize: 13 },
  servicesGridList: {
    gap: 8,
  },
  calendarCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calMonthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calMonthTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
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
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextToday: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#000000',
    fontWeight: '900',
  },
  dayTextDisabled: {
    color: COLORS.textMuted,
  },
  selectedDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
  },
  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  selectedDateText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  stepSubHeading: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  serviceCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    gap: 6,
  },
  activeServiceCard: { borderColor: COLORS.primary, backgroundColor: 'rgba(255, 107, 0, 0.08)' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.borderHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  serviceTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  serviceMeta: { color: COLORS.primaryDim, fontSize: 11, fontWeight: '600', marginTop: 2 },
  servicePrice: { color: COLORS.primary, fontSize: 15, fontWeight: '900' },
  serviceDesc: { color: COLORS.textSecondary, fontSize: 12, paddingLeft: 34 },

  summaryCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
    width: '100%',
  },
  summaryTitle: { color: COLORS.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  summaryValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  itemizedList: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 4,
    marginVertical: 4,
  },
  itemizedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemizedName: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  itemizedPrice: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },

  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  modalSub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  ticketBox: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  ticketDetail: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  workshopItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedWorkshopItem: { backgroundColor: 'rgba(255, 107, 0, 0.12)', borderColor: COLORS.primary },
  workshopItemName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  selectedWorkshopItemText: { color: COLORS.primary, fontWeight: '800' },
  workshopItemAddress: { color: COLORS.textMuted, fontSize: 11 },
});
