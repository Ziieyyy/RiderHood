import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../constants/theme';
import { Header } from '../../../components/Header';
import { CustomButton } from '../../../components/CustomButton';
import {
  Wrench,
  Star,
  MapPin,
  Phone,
  Clock,
  Plus,
  Check,
  Calendar,
  Share2,
  Heart,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Edit2,
  MessageCircle,
  User,
} from 'lucide-react-native';
import { getWorkshop, getWorkshopServices } from '../../../services/workshopService';
import { getWorkshopReviews, getReviewStats, canCustomerReview, getCompletedBookingsWithoutReview, createReviewWithPhotos, type ReviewStats } from '../../../services/reviewService';
import { useAuth } from '../../../context/AuthContext';
import type { Workshop, Service, Review } from '../../../types/database';
import { useTranslation } from '../../../i18n';

export default function CustomerWorkshopDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [services, setServices] = useState<Service[]>([]); 
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const loadWorkshopData = useCallback(async () => {
    if (!id) return;
    try {
      const [wRes, svcsRes, revsRes, statsRes] = await Promise.allSettled([
        getWorkshop(id),
        getWorkshopServices(id),
        getWorkshopReviews(id),
        getReviewStats(id),
      ]);

      if (wRes.status === 'fulfilled') setWorkshop(wRes.value);
      if (svcsRes.status === 'fulfilled') setServices(svcsRes.value);
      if (revsRes.status === 'fulfilled') setReviews(revsRes.value);
      if (statsRes.status === 'fulfilled') setReviewStats(statsRes.value);

      // Check if current user can write a review
      if (user?.id) {
        const allowed = await canCustomerReview(user.id, id);
        setCanReview(allowed);
      }
    } catch (err) {
      console.log('Error loading workshop detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadWorkshopData();
  }, [loadWorkshopData]);

  const toggleSelectService = (svcId: string) => {
    if (selectedServiceIds.includes(svcId)) {
      setSelectedServiceIds(selectedServiceIds.filter(i => i !== svcId));
    } else {
      setSelectedServiceIds([...selectedServiceIds, svcId]);
    }
  };

  const handleCall = () => {
    if (workshop?.phone) {
      Linking.openURL(`tel:${workshop.phone}`);
    } else {
      Alert.alert('Phone Contact', 'No phone number listed for this workshop.');
    }
  };

  const handleDirections = () => {
    if (workshop?.address) {
      const query = encodeURIComponent(`${workshop.name}, ${workshop.address}`);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    } else {
      Alert.alert('Location', 'Workshop address not available.');
    }
  };

  const handleProceedBooking = () => {
    if (!workshop) return;
    router.push({
      pathname: '/(customer)/booking',
      params: {
        workshopId: workshop.id,
        selectedServices: selectedServiceIds.join(','),
      },
    });
  };

  const handleWriteReview = async () => {
    if (!user?.id || !workshop?.id) {
      Alert.alert('Sign In Required', 'Please sign in to submit a review.');
      return;
    }
    try {
      const bks = await getCompletedBookingsWithoutReview(user.id, workshop.id);
      if (bks.length === 0) {
        Alert.alert('No Eligible Booking', 'You need a completed service booking to write a review.');
        return;
      }
      Alert.alert(
        'Review Service',
        `Submit review for your completed service on ${bks[0].booking_date}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Rate 5 Stars ⭐',
            onPress: async () => {
              try {
                await createReviewWithPhotos({
                  customer_id: user.id,
                  workshop_id: workshop.id,
                  booking_id: bks[0].id,
                  motorcycle_id: bks[0].motorcycle_id || null,
                  rating: 5,
                  comment: 'Excellent service and friendly staff!',
                });
                Alert.alert('🎉 Review Submitted!', 'Thank you for your feedback.');
                loadWorkshopData();
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to submit review.');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not verify booking eligibility.');
    }
  };

  const handleGoogleReview = () => {
    if (workshop?.google_review_url) {
      Linking.openURL(workshop.google_review_url).catch(() => {
        Alert.alert('Google Reviews', 'Could not open Google Reviews page.');
      });
    } else {
      Alert.alert('Google Reviews', 'Google review link is not available for this workshop yet.');
    }
  };

  const formatTimeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  };

  const renderStarRow = (rating: number, size: number = 12) => {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} color="#f59e0b" fill={i <= rating ? '#f59e0b' : 'transparent'} size={size} />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Workshop Details" showBack />
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!workshop) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Workshop Details" showBack />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>WORKSHOP NOT FOUND</Text>
          <CustomButton title="Back to Workshops" onPress={() => router.replace('/(customer)/workshops')} />
        </View>
      </SafeAreaView>
    );
  }

  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
  const estimatedTotal = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const workshopRating = reviewStats.count > 0 ? reviewStats.average : Number(workshop.rating || 0);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={workshop.name}
        subtitle={`${workshop.district || 'Kuala Lumpur'} • ★ ${workshopRating.toFixed(1)}`}
        showBack
        rightElement={
          <TouchableOpacity onPress={() => setFavorite(!favorite)} activeOpacity={0.8}>
            <Heart color={favorite ? COLORS.primary : COLORS.textMuted} fill={favorite ? COLORS.primary : 'none'} size={22} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cover & Info Header */}
        <View style={styles.headerCard}>
          <View style={styles.coverImageContainer}>
            <Image
              source={{ uri: workshop.cover_image_url || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1000&q=80' }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          </View>

          <View style={styles.workshopMetaBox}>
            <View style={styles.ratingBadgeRow}>
              <View style={styles.ratingBadge}>
                <Star color="#f59e0b" fill="#f59e0b" size={14} />
                <Text style={styles.ratingText}>
                  {workshopRating.toFixed(1)} ({reviewStats.count || workshop.review_count || 0} reviews)
                </Text>
              </View>

              <View style={styles.openBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openText}>{workshop.is_open ? 'OPEN NOW' : 'CLOSED'}</Text>
              </View>
            </View>

            <Text style={styles.workshopTitle}>{workshop.name}</Text>

            <View style={styles.locationRow}>
              <MapPin color={COLORS.textMuted} size={14} />
              <Text style={styles.locationText}>{workshop.address || 'Kuala Lumpur, Malaysia'}</Text>
            </View>

            {workshop.opening_time && workshop.closing_time ? (
              <View style={styles.locationRow}>
                <Clock color={COLORS.textMuted} size={14} />
                <Text style={styles.locationText}>
                  Operating Hours: {workshop.opening_time} - {workshop.closing_time}
                </Text>
              </View>
            ) : null}

            {/* Quick Buttons: Call & Directions */}
            <View style={styles.quickBtnRow}>
              <TouchableOpacity style={styles.quickBtn} onPress={handleCall}>
                <Phone color={COLORS.primary} size={16} />
                <Text style={styles.quickBtnText}>CALL WORKSHOP</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickBtn} onPress={handleDirections}>
                <MapPin color={COLORS.primary} size={16} />
                <Text style={styles.quickBtnText}>GET DIRECTIONS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Services List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('workshopAdmin.manageServices').toUpperCase()} ({services.length})</Text>
          <Text style={styles.sectionSub}>{t('booking.selectServices')}</Text>
        </View>

        {services.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('empty.noServices').toUpperCase()}</Text>
            <Text style={styles.emptySub}>{t('empty.noServicesSub')}</Text>
          </View>
        ) : (
          services.map(svc => {
            const isSelected = selectedServiceIds.includes(svc.id);
            return (
              <View key={svc.id} style={[styles.svcCard, isSelected && styles.svcCardSelected]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.svcName}>{svc.name}</Text>
                  {svc.description ? <Text style={styles.svcDesc}>{svc.description}</Text> : null}
                  <View style={styles.svcPriceRow}>
                    <Text style={styles.svcPrice}>RM {Number(svc.price).toFixed(2)}</Text>
                    {svc.estimated_duration_minutes ? (
                      <Text style={styles.svcDuration}>⏱ {svc.estimated_duration_minutes} mins</Text>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.addSvcBtn, isSelected && styles.addSvcBtnActive]}
                  onPress={() => toggleSelectService(svc.id)}
                >
                  {isSelected ? (
                    <>
                      <Check color="#000" size={14} />
                      <Text style={styles.addSvcTextActive}>{t('common.done').toUpperCase()}</Text>
                    </>
                  ) : (
                    <>
                      <Plus color={COLORS.primary} size={14} />
                      <Text style={styles.addSvcText}>{t('common.add').toUpperCase()}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CUSTOMER REVIEWS SECTION                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}

        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>{t('reviews.title').toUpperCase()}</Text>
        </View>

        {/* Rating Summary Card */}
        <View style={styles.ratingSummaryCard}>
          <View style={styles.ratingBigCol}>
            <Text style={styles.ratingBigNum}>{workshopRating.toFixed(1)}</Text>
            {renderStarRow(Math.round(workshopRating), 16)}
            <Text style={styles.ratingCountText}>Based on {reviewStats.count} review{reviewStats.count !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.ratingBarsCol}>
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviewStats.distribution[star] || 0;
              const pct = reviewStats.count > 0 ? (count / reviewStats.count) * 100 : 0;
              return (
                <View key={star} style={styles.barRow}>
                  <Text style={styles.barLabel}>{star}★</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barPct}>{Math.round(pct)}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Write a Review Button */}
        {canReview && (
          <TouchableOpacity style={styles.writeReviewBtn} onPress={handleWriteReview}>
            <Edit2 color="#000" size={16} />
            <Text style={styles.writeReviewBtnText}>{t('reviews.writeReview')}</Text>
          </TouchableOpacity>
        )}

        {/* Recent Reviews */}
        {reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Star color={COLORS.textMuted} size={32} />
            <Text style={styles.emptyTitle}>{t('empty.noReviews').toUpperCase()}</Text>
            <Text style={styles.emptySub}>{t('empty.noReviewsSub')}</Text>
          </View>
        ) : (
          <>
            {displayedReviews.map(rev => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.revHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.avatarCircle}>
                      <User color={COLORS.textMuted} size={14} />
                    </View>
                    <View>
                      <Text style={styles.revName}>{rev.customer?.full_name || 'Rider'}</Text>
                      <Text style={styles.revTimeAgo}>{formatTimeAgo(rev.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.revStarRow}>
                    {renderStarRow(rev.rating, 12)}
                  </View>
                </View>

                {rev.comment ? <Text style={styles.revComment}>"{rev.comment}"</Text> : null}

                {/* Review Photos */}
                {rev.photos && rev.photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {rev.photos.map(photo => (
                      <Image
                        key={photo.id}
                        source={{ uri: photo.photo_url }}
                        style={styles.reviewPhotoThumb}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                )}

                {/* Workshop Reply */}
                {rev.reply ? (
                  <View style={styles.workshopReplyBox}>
                    <Text style={styles.replyHeader}>Workshop Reply:</Text>
                    <Text style={styles.replyText}>{rev.reply}</Text>
                  </View>
                ) : null}

                {/* Source Badge */}
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  <View style={styles.sourceBadge}>
                    <Text style={styles.sourceBadgeText}>⭐ RIDERHOOD</Text>
                  </View>
                </View>
              </View>
            ))}

            {reviews.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => setShowAllReviews(!showAllReviews)}
              >
                <Text style={styles.viewAllBtnText}>
                  {showAllReviews ? 'Show Less' : `View All ${reviews.length} Reviews`}
                </Text>
                <ChevronRight color={COLORS.primary} size={14} />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* GOOGLE REVIEWS SECTION                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}

        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>GOOGLE REVIEWS</Text>
        </View>

        <View style={styles.googleReviewCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.googleIconBox}>
              <Text style={{ fontSize: 20 }}>G</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.googleTitle}>See what customers say on Google</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Star color="#f59e0b" fill="#f59e0b" size={12} />
                <Text style={styles.googleRatingText}>
                  {Number(workshop.rating || 0).toFixed(1)} Google Rating
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.googleReviewBtn} onPress={handleGoogleReview}>
            <Star color="#FFF" fill="#FFF" size={14} />
            <Text style={styles.googleReviewBtnText}>Review us on Google</Text>
            <ExternalLink color="#FFF" size={12} />
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Floating Bottom Booking Bar */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barLabelText}>
            {selectedServiceIds.length > 0
              ? `${selectedServiceIds.length} Service(s) Selected`
              : 'Book Appointment'}
          </Text>
          <Text style={styles.barPrice}>
            RM {estimatedTotal > 0 ? estimatedTotal.toFixed(2) : '0.00'}
          </Text>
        </View>

        <CustomButton
          title="BOOK SERVICE NOW →"
          onPress={handleProceedBooking}
          style={{ paddingHorizontal: 20 }}
        />
      </View>
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
    paddingBottom: 90,
    gap: 12,
  },
  headerCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  coverImageContainer: {
    height: 180,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  workshopMetaBox: {
    padding: 16,
    gap: 8,
  },
  ratingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  openText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '900',
  },
  workshopTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  quickBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  quickBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  svcCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  svcCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  svcName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  svcDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  svcPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  svcPrice: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  svcDuration: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  addSvcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addSvcBtnActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  addSvcText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  addSvcTextActive: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },

  // ─── Rating Summary Card ────────────────────────────────────
  ratingSummaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  ratingBigCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 80,
  },
  ratingBigNum: {
    color: COLORS.textPrimary,
    fontSize: 36,
    fontWeight: '900',
  },
  ratingCountText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  ratingBarsCol: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    width: 22,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  barPct: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    width: 28,
    textAlign: 'right',
  },

  // ─── Write Review Button ────────────────────────────────────
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  writeReviewBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },

  // ─── Review Cards ───────────────────────────────────────────
  reviewCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  revHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  revName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  revTimeAgo: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  revStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  revComment: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  reviewPhotoThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  workshopReplyBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginTop: 4,
  },
  replyHeader: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  replyText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  sourceBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  sourceBadgeText: {
    color: COLORS.primary,
    fontSize: 8,
    fontWeight: '900',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewAllBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  // ─── Google Reviews Section ─────────────────────────────────
  googleReviewCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  googleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  googleRatingText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  googleReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 10,
  },
  googleReviewBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },

  // ─── Bottom Bar ─────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barLabelText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  barPrice: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
});
