import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../constants/theme';
import { Header } from '../../../components/Header';
import { CustomButton } from '../../../components/CustomButton';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Wrench,
  FileText,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bike,
  Building,
  CreditCard,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { getBooking, cancelBooking } from '../../../services/bookingService';
import { createReview } from '../../../services/reviewService';
import { useAuth } from '../../../context/AuthContext';
import type { Booking, BookingService } from '../../../types/database';
import { useTranslation } from '../../../i18n';

export default function CustomerBookingDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!id) return;
    try {
      const b = await getBooking(id);
      setBooking(b);
    } catch (err) {
      console.log('Error loading booking details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleCancelBooking = () => {
    if (!booking) return;
    Alert.alert(
      t('dialogs.cancelBookingTitle'),
      t('dialogs.cancelBookingMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('booking.cancelBooking'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.id) {
                await cancelBooking(booking.id, user.id);
                setBooking((prev: Booking | null) => (prev ? { ...prev, status: 'cancelled' } : null));
                Alert.alert(t('common.success'), t('booking.bookingCancelled'));
              }
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || t('errors.genericMessage'));
            }
          },
        },
      ]
    );
  };

  const handleSubmitReview = async () => {
    if (!booking || !user?.id) return;
    setSubmittingReview(true);
    try {
      await createReview({
        customer_id: user.id,
        workshop_id: booking.workshop_id,
        booking_id: booking.id,
        rating,
        comment: reviewComment.trim() || undefined,
      });
      setShowReviewModal(false);
      Alert.alert(t('reviews.reviewSuccessTitle'), t('reviews.reviewSuccessDesc'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('errors.reviewFailed'));
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('booking.bookingDetails')} showBack />
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('booking.bookingDetails')} showBack />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('errors.notFound').toUpperCase()}</Text>
          <CustomButton title={t('navigation.bookings')} onPress={() => router.replace('/(customer)/history')} />
        </View>
      </SafeAreaView>
    );
  }

  const isConfirmed = booking.status === 'confirmed';
  const isInProgress = booking.status === 'in_progress';
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  const timelineSteps = [
    { title: t('booking.title'), completed: true },
    { title: t('booking.bookingConfirmed'), completed: isConfirmed || isInProgress || isCompleted },
    { title: t('booking.inProgress'), completed: isInProgress || isCompleted },
    { title: t('booking.bookingCompleted'), completed: isCompleted },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={`${t('booking.bookingId')} #${booking.id.substring(0, 8).toUpperCase()}`}
        subtitle={`${t('booking.bookingDate')}: ${booking.booking_date} @ ${booking.booking_time}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Header Badge */}
        <View style={styles.statusHeaderCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusHeaderTitle}>{t('booking.bookingStatus').toUpperCase()}</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isCompleted
                    ? COLORS.successBg
                    : isCancelled
                    ? COLORS.dangerBg
                    : COLORS.primaryDark,
                  borderColor: isCompleted
                    ? COLORS.success
                    : isCancelled
                    ? COLORS.danger
                    : COLORS.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isCompleted
                      ? COLORS.success
                      : isCancelled
                      ? COLORS.danger
                      : COLORS.primary,
                  },
                ]}
              >
                ● {booking.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Timeline Visualizer */}
          {!isCancelled && (
            <View style={styles.timelineContainer}>
              {timelineSteps.map((step, idx) => (
                <View key={step.title} style={styles.timelineStep}>
                  <View style={[styles.stepCircle, step.completed && styles.stepCircleCompleted]}>
                    {step.completed ? <CheckCircle2 color="#000" size={12} /> : <Text style={styles.stepNum}>{idx + 1}</Text>}
                  </View>
                  <Text style={[styles.stepTitle, step.completed && styles.stepTitleCompleted]}>
                    {step.title}
                  </Text>
                  {idx < timelineSteps.length - 1 && (
                    <View style={[styles.stepLine, timelineSteps[idx + 1].completed && styles.stepLineCompleted]} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Workshop Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('dashboard.workshop').toUpperCase()}</Text>
          <Text style={styles.workshopName}>
            {((booking.workshop as unknown as Record<string, unknown>)?.name as string) || 'RiderHood Moto Lab'}
          </Text>
          <Text style={styles.workshopAddress}>
            {((booking.workshop as unknown as Record<string, unknown>)?.address as string) || 'Kuala Lumpur, Malaysia'}
          </Text>
        </View>

        {/* Motorcycle Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('dashboard.myMotorcycle').toUpperCase()}</Text>
          <View style={styles.bikeRow}>
            <Bike color={COLORS.primary} size={24} />
            <View>
              <Text style={styles.bikeTitle}>
                {((booking.motorcycle as unknown as Record<string, unknown>)?.nickname as string) ||
                  `${((booking.motorcycle as unknown as Record<string, unknown>)?.brand as string || 'Yamaha')} ${((booking.motorcycle as unknown as Record<string, unknown>)?.model as string || 'Y15ZR')}`}
              </Text>
              <Text style={styles.bikePlate}>
                {t('motorcycle.plateNumber')}: {((booking.motorcycle as unknown as Record<string, unknown>)?.plate_number as string || 'ABC 1234')}
              </Text>
            </View>
          </View>
        </View>

        {/* Selected Services Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('booking.selectServices').toUpperCase()}</Text>
          {booking.booking_services && booking.booking_services.length > 0 ? (
            booking.booking_services.map((svc: BookingService) => (
              <View key={svc.id} style={styles.svcRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.svcName}>{svc.service_name_snapshot}</Text>
                  <Text style={styles.svcQty}>{t('invoice.qty')}: {svc.quantity}</Text>
                </View>
                <Text style={styles.svcPrice}>RM {Number(svc.price_snapshot * svc.quantity).toFixed(2)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.svcName}>{t('services.title')}</Text>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('common.total').toUpperCase()}</Text>
            <Text style={styles.totalVal}>RM {Number(booking.total_amount).toFixed(2)}</Text>
          </View>
        </View>

        {/* Dynamic Action Buttons */}
        <View style={styles.actionSection}>
          {isCompleted && (
            <>
              <CustomButton
                title={`📄 ${t('invoice.view').toUpperCase()}`}
                onPress={() => router.push(`/(customer)/invoice/${booking.id}` as any)}
              />
              <CustomButton
                title={`★ ${t('reviews.writeReview').toUpperCase()}`}
                variant="secondary"
                onPress={() => setShowReviewModal(true)}
              />
            </>
          )}

          {(booking.status === 'pending' || isConfirmed) && (
            <TouchableOpacity style={styles.cancelBookingBtn} onPress={handleCancelBooking}>
              <XCircle color={COLORS.danger} size={16} />
              <Text style={styles.cancelBookingText}>{t('booking.cancelBooking').toUpperCase()}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="fade" onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('reviews.writeReview')}</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Star color="#f59e0b" fill={s <= rating ? '#f59e0b' : 'none'} size={32} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('reviews.yourComment')}</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder={t('reviews.commentPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
            </View>

            <CustomButton
              title={submittingReview ? t('reviews.submittingReview') : t('reviews.submitReview')}
              onPress={handleSubmitReview}
              disabled={submittingReview}
            />
            <CustomButton title={t('common.cancel').toUpperCase()} variant="secondary" onPress={() => setShowReviewModal(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  statusHeaderCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusHeaderTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepNum: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  stepTitle: {
    color: COLORS.textMuted,
    fontSize: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  stepTitleCompleted: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  stepLine: {
    position: 'absolute',
    top: 10,
    right: '-50%',
    left: '50%',
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: -1,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  cardTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  workshopName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  workshopAddress: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  bikeTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  bikePlate: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  svcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  svcName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  svcQty: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  svcPrice: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  totalVal: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  actionSection: {
    gap: 10,
    marginTop: 8,
  },
  cancelBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.dangerBg,
  },
  cancelBookingText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 14,
    alignItems: 'center',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
  },
  inputGroup: {
    width: '100%',
    gap: 6,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
  },
});
