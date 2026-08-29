import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, AppThemeColors } from '../../constants/theme';
import { CustomButton } from '../../components/CustomButton';
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Wrench,
  CheckCircle2,
  ArrowLeft,
  Package,
  ShoppingBag,
  Calendar,
  Check,
  X,
  Info,
  User,
  Edit2,
  ExternalLink,
  ChevronRight,
  Bike,
  Search,
} from 'lucide-react-native';
import { getWorkshop, getWorkshopServices, canBookWorkshop } from '../../services/workshopService';
import { getWorkshopImageSource } from '../../utils/workshopImage';
import { getWorkshopParts } from '../../services/partsService';
import {
  getWorkshopReviews,
  getReviewStats,
  canCustomerReview,
  getCompletedBookingsWithoutReview,
  createReviewWithPhotos,
  subscribeToRealtimeReviews,
  type ReviewStats,
} from '../../services/reviewService';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import { fetchGooglePlaceDetails, type GooglePlaceDetailsResult } from '../../services/googlePlacesService';
import { getWorkshopOpenStatus } from '../../utils/operatingHours';
import { getCategoryFilterList, formatCategoryName, matchesCategoryFilter } from '../../utils/categoryUtils';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveModal } from '../../components/responsive/ResponsiveModal';
import type { Service, Workshop, Part, Review } from '../../types/database';

export default function WorkshopDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workshopId = params.id as string;
  const { user } = useAuth();
  const { t, formatDate, language } = useTranslation();
  const { isPhone, contentPadding } = useResponsive();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);


  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [googlePlaceDetails, setGooglePlaceDetails] = useState<GooglePlaceDetailsResult | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('All');
  const [searchService, setSearchService] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllGoogleReviews, setShowAllGoogleReviews] = useState(false);

  // Write Review Inline Modal State
  const [writeReviewModalVisible, setWriteReviewModalVisible] = useState(false);
  const [completedBookings, setCompletedBookings] = useState<any[]>([]);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any | null>(null);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const name = workshop?.name || (params.name as string) || 'Workshop Details';
  const address = workshop?.address || (params.address as string) || 'Address not provided';
  const phone = workshop?.phone || (params.phone as string) || 'No contact phone';
  const rawRating = workshop?.rating ?? parseFloat((params.rating as string) || '0');
  const isOpen = workshop ? workshop.is_open : params.isOpen !== 'false';

  const [googleLoading, setGoogleLoading] = useState(false);

  const loadGoogleDetails = async (targetWorkshop: Workshop | null) => {
    if (!targetWorkshop) return;
    setGoogleLoading(true);
    try {
      const gDetails = await fetchGooglePlaceDetails(targetWorkshop.google_place_id, targetWorkshop);
      setGooglePlaceDetails(gDetails);
    } catch (err) {
      console.log('[WorkshopDetails] Error fetching Google Place Details:', err);
      setGooglePlaceDetails(null);
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    // RULE 16: ALWAYS clear previous workshop review state immediately to prevent cross-workshop leakage!
    setGooglePlaceDetails(null);
    setReviews([]);
    setServices([]);
    setLoading(true);

    const loadDetails = async () => {
      if (!workshopId) return;
      try {
        const [wsData, svcData, revData, statsData] = await Promise.all([
          getWorkshop(workshopId).catch(() => null),
          getWorkshopServices(workshopId).catch(() => []),
          getWorkshopReviews(workshopId).catch(() => []),
          getReviewStats(workshopId).catch(() => ({
            average: 0,
            count: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          })),
        ]);
        if (wsData) {
          setWorkshop(wsData);
          loadGoogleDetails(wsData);
        }
        setServices(svcData ?? []);
        setReviews(revData ?? []);
        setReviewStats(statsData);

        if (user?.id) {
          const allowed = await canCustomerReview(user.id, workshopId).catch(() => false);
          setCanReview(allowed);
        }
      } catch (err) {
        console.log('Error loading workshop details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();

    // Real-time listener for reviews on this workshop
    const subscription = subscribeToRealtimeReviews(() => {
      console.log('[WorkshopDetails] Realtime review change for workshop:', workshopId);
      getWorkshopReviews(workshopId).then(setReviews).catch(() => {});
      getReviewStats(workshopId).then(setReviewStats).catch(() => {});
    }, workshopId);

    return () => {
      subscription?.unsubscribe();
    };
  }, [workshopId, user?.id]);



  const isPartner = canBookWorkshop(workshop);
  const openStatus = getWorkshopOpenStatus(workshop || { is_open: isOpen });

  const handleBookNow = (serviceName?: string) => {
    if (!canBookWorkshop(workshop)) {
      Alert.alert(
        'Online Booking Unavailable',
        `Online appointment booking is currently available exclusively with Wan Legacy Motor. You can call ${name} directly at ${phone || 'their contact number'}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call Workshop',
            onPress: () => phone && Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`),
          },
        ]
      );
      return;
    }
    router.push({
      pathname: '/(customer)/booking',
      params: {
        workshopId,
        workshopName: name,
        serviceName,
      },
    });
  };

  const handleOpenWriteReviewModal = async () => {
    if (!user?.id || !workshopId) {
      Alert.alert('Sign In Required', 'Please sign in to submit a review.');
      return;
    }
    try {
      const bks = await getCompletedBookingsWithoutReview(user.id, workshopId);
      setCompletedBookings(bks);
      if (bks.length > 0) {
        setSelectedBookingForReview(bks[0]);
      }
      setWriteReviewModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not verify booking eligibility.');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedBookingForReview) {
      Alert.alert('Select Booking', 'Please select a completed booking to review.');
      return;
    }
    if (newRating === 0) {
      Alert.alert('Star Rating Required', 'Please tap the stars to choose your rating.');
      return;
    }
    if (!user?.id || !workshopId) return;

    setSubmittingReview(true);
    try {
      await createReviewWithPhotos({
        customer_id: user.id,
        workshop_id: workshopId,
        booking_id: selectedBookingForReview.id,
        motorcycle_id: selectedBookingForReview.motorcycle_id || null,
        rating: newRating,
        comment: newComment.trim() || null,
      });

      setWriteReviewModalVisible(false);
      setNewRating(0);
      setNewComment('');
      Alert.alert('🎉 Review Submitted!', 'Thank you for reviewing this workshop.');

      // Refresh reviews & stats
      const [revData, statsData] = await Promise.all([
        getWorkshopReviews(workshopId),
        getReviewStats(workshopId),
      ]);
      setReviews(revData ?? []);
      setReviewStats(statsData);
      setCanReview(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleGoogleReview = () => {
    const targetUrl = googlePlaceDetails?.googleMapsUrl || workshop?.google_maps_url || workshop?.google_review_url;
    if (targetUrl) {
      Linking.openURL(targetUrl).catch(() => {
        Alert.alert('Google Maps', 'Could not open Google Maps link.');
      });
    } else {
      Alert.alert('Google Reviews', 'Google Maps link is not configured for this workshop yet.');
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

  const renderStarRow = (ratingVal: number, size: number = 12) => {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} color="#f59e0b" fill={i <= ratingVal ? '#f59e0b' : 'transparent'} size={size} />
        ))}
      </View>
    );
  };

  const riderhoodRating = reviewStats.count > 0 ? reviewStats.average : 0.0;
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeaderNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.textPrimary} size={20} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          {/* Banner / Workshop Image Header */}
        <View style={styles.photoContainer}>
          <Image
            source={getWorkshopImageSource(workshop ? { id: workshop.id, name: workshop.name, cover_image_url: workshop.cover_image_url } : { id: workshopId, name: name })}
            style={styles.workshopCoverImage}
            resizeMode="contain"
          />
          <View style={[styles.statusBadge, { backgroundColor: openStatus.isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
            <Text style={[styles.statusText, { color: openStatus.isOpen ? colors.success : colors.danger }]}>
              {openStatus.statusText.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Workshop Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.workshopName}>{name}</Text>
              <View style={[styles.partnerTag, isPartner ? styles.partnerTagActive : styles.partnerTagDir]}>
                <Text style={[styles.partnerTagText, isPartner ? styles.partnerTagTextActive : styles.partnerTagTextDir]}>
                  {isPartner ? t('workshop.verified').toUpperCase() : t('workshop.directoryListing').toUpperCase()}
                </Text>
              </View>
            </View>
            {(googlePlaceDetails?.rating || workshop?.google_rating || (rawRating > 0)) ? (
              <View style={styles.ratingBadge}>
                <Star color="#f59e0b" size={16} fill="#f59e0b" />
                <Text style={styles.ratingText}>
                  {(googlePlaceDetails?.rating ?? workshop?.google_rating ?? rawRating).toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          {workshop?.address ? (
            <View style={styles.detailRow}>
              <MapPin color={colors.primary} size={16} />
              <Text style={styles.detailText}>{t('workshop.address')}: {workshop.address}</Text>
            </View>
          ) : null}

          {workshop?.phone ? (
            <View style={styles.detailRow}>
              <Phone color={colors.primary} size={16} />
              <Text style={styles.detailText}>{t('workshop.phone')}: {workshop.phone}</Text>
            </View>
          ) : null}

          {openStatus.scheduleText ? (
            <View style={styles.detailRow}>
              <Clock color={colors.primary} size={16} />
              <Text style={styles.detailText}>{t('workshop.operatingHours')}: {openStatus.scheduleText}</Text>
            </View>
          ) : null}
        </View>

        {/* ─── EXPLICIT BOOKING SECTION (SECTION 8 OF SPEC) ──────── */}
        {isPartner ? (
          <View style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary, marginBottom: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 color={colors.primary} size={18} />
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '900' }}>{t('workshop.onlineBookingAvailable').toUpperCase()}</Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
              {t('workshop.onlineBookingAvailDesc')}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 }}
              onPress={() => handleBookNow()}
            >
              <Calendar color={isDark ? "#000" : "#FFF"} size={15} />
              <Text style={{ color: isDark ? "#000" : "#FFF", fontSize: 13, fontWeight: '800' }}>{t('common.bookNow')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.surfaceContainer, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Info color={colors.textMuted} size={18} />
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '900' }}>{t('workshop.directoryListing').toUpperCase()}</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 16 }}>
              {t('workshop.directoryListingDesc')}
            </Text>
            {phone && (
              <TouchableOpacity
                style={{ backgroundColor: colors.surface, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, marginTop: 4 }}
                onPress={() => Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`)}
              >
                <Phone color={colors.textPrimary} size={14} />
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '800' }}>{t('workshop.callWorkshop')} ({phone})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── WORKSHOP SERVICES & TUNING CATALOGUE ──────────────── */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Wrench color={colors.primary} size={18} />
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '900' }}>
                {t('services.title').toUpperCase()} ({services.length})
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>
              {t('workshop.standardRates')}
            </Text>
          </View>

          {/* Quick Search within Workshop Services */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 38, marginBottom: 10 }}>
            <Search color={colors.textMuted} size={16} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, color: colors.textPrimary, fontSize: 12 }}
              value={searchService}
              onChangeText={setSearchService}
              placeholder={t('workshop.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
            />
            {searchService ? (
              <TouchableOpacity onPress={() => setSearchService('')}>
                <X color={colors.textMuted} size={15} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Sort / Filter by Categories Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {getCategoryFilterList(language).map((cat) => {
              const isActive = selectedServiceCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryFilterChip,
                    isActive && styles.activeCategoryFilterChip,
                  ]}
                  onPress={() => setSelectedServiceCategory(cat.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryFilterChipText,
                      isActive && styles.activeCategoryFilterChipText,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 20 }} />
          ) : services.length === 0 ? (
            <View style={styles.emptyServiceBox}>
              <Text style={styles.emptyServiceText}>
                {isPartner
                  ? t('workshop.onlineBookingAvailDesc')
                  : t('services.noServicesConfigured')}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {services
                .filter((serv) => {
                  if (!matchesCategoryFilter(serv.category, selectedServiceCategory)) {
                    return false;
                  }
                  if (searchService.trim()) {
                    const q = searchService.toLowerCase();
                    const n = (serv.name || '').toLowerCase();
                    const d = (serv.description || '').toLowerCase();
                    if (!n.includes(q) && !d.includes(q)) return false;
                  }
                  return true;
                })
                .map((serv) => (
                  <View key={serv.id} style={styles.serviceItem}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.servNameRow}>
                        <CheckCircle2 color={colors.primary} size={16} />
                        <Text style={styles.serviceName}>{serv.name}</Text>
                      </View>
                      {serv.description ? (
                        <Text style={styles.serviceDesc}>{serv.description}</Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '800' }}>
                            {formatCategoryName(serv.category || 'SERVICE', language).toUpperCase()}
                          </Text>
                        </View>
                        {serv.estimated_duration_minutes ? (
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                            ⏱ ~{serv.estimated_duration_minutes} mins
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.priceActionCol}>
                      <Text style={styles.servicePrice}>RM{Number(serv.price).toFixed(0)}</Text>
                      {isPartner && (
                        <TouchableOpacity style={styles.selectServBtn} onPress={() => handleBookNow(serv.name)}>
                          <Text style={styles.selectServBtnText}>{t('common.bookNow')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>


        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CUSTOMER REVIEWS SECTION                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleHeader}>{t('reviews.customerReviews').toUpperCase()}</Text>
        </View>

        {/* RiderHood Rating Summary Box */}
        <View style={styles.ratingSummaryCard}>
          <View style={styles.ratingBigCol}>
            <Text style={styles.ratingBigNum}>⭐ {riderhoodRating > 0 ? riderhoodRating.toFixed(1) : '0.0'}</Text>
            <Text style={styles.ratingCountText}>
              {t('reviews.totalReviews')}: {reviewStats.count}
            </Text>
          </View>

          <View style={styles.ratingBarsCol}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviewStats.distribution[star] || 0;
              const pct = reviewStats.count > 0 ? (count / reviewStats.count) * 100 : 0;
              return (
                <View key={star} style={styles.barRow}>
                  <Text style={styles.barLabel}>{star}★</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barPct}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Write Review Button (if eligible) */}
        {canReview && (
          <TouchableOpacity style={styles.writeReviewBtn} onPress={handleOpenWriteReviewModal}>
            <Edit2 color={isDark ? "#000" : "#FFF"} size={16} />
            <Text style={styles.writeReviewBtnText}>{t('reviews.writeReview')}</Text>
          </TouchableOpacity>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <View style={styles.emptyServiceBox}>
            <Star color={colors.textMuted} size={28} />
            <Text style={styles.emptyReviewTitle}>{t('reviews.noReviewsYet')}</Text>
            <Text style={styles.emptyReviewSub}>{t('reviews.noReviewsDesc')}</Text>
          </View>
        ) : (
          <>
            {displayedReviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.revHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.avatarCircle}>
                      <User color={colors.textMuted} size={14} />
                    </View>
                    <View>
                      <Text style={styles.revName}>{rev.customer?.full_name || 'Rider'}</Text>
                      <Text style={styles.revTimeAgo}>{formatTimeAgo(rev.created_at)}</Text>
                    </View>
                  </View>
                  {renderStarRow(rev.rating, 12)}
                </View>

                {rev.comment ? <Text style={styles.revComment}>"{rev.comment}"</Text> : null}

                {/* Optional Customer Photos */}
                {rev.photos && rev.photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {rev.photos.map((photo) => (
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
                    <Text style={styles.replyHeader}>{t('reviews.workshopResponse')}:</Text>
                    <Text style={styles.replyText}>{rev.reply}</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', marginTop: 4 }}>
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
                  {showAllReviews ? t('common.showLess') : `${t('common.viewAll')} (${reviews.length})`}
                </Text>
                <ChevronRight color={colors.primary} size={14} />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* GOOGLE REVIEWS SECTION                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleHeader}>{t('reviews.googleReviewsTitle').toUpperCase()}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>Powered by Google Maps</Text>
        </View>

        <View style={styles.googleReviewCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={styles.googleIconBox}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#4285F4' }}>G</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.googleTitle}>{name}</Text>
              {(googlePlaceDetails?.rating !== undefined || workshop?.google_rating !== undefined) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Star color="#f59e0b" fill="#f59e0b" size={14} />
                  <Text style={styles.googleRatingText}>
                    {Number(googlePlaceDetails?.rating ?? workshop?.google_rating ?? 0).toFixed(1)}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                    ({googlePlaceDetails?.userRatingCount ?? workshop?.google_review_count ?? 0} Google reviews)
                  </Text>
                </View>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {t('reviews.noReviewsYet')}
                </Text>
              )}
            </View>
          </View>

          {/* 1. Loading State */}
          {googleLoading ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator color="#4285F4" size="small" />
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>{t('common.loading')}</Text>
            </View>
          ) : null}

          {/* 2. Error State */}
          {!googleLoading && googlePlaceDetails?.status === 'error' ? (
            <View style={{ paddingVertical: 12, alignItems: 'center', gap: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                {t('reviews.noReviewsYet')}
              </Text>
              <TouchableOpacity
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.border }}
                onPress={() => loadGoogleDetails(workshop)}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* 3. Missing Google Place ID / Information Unavailable State */}
          {!googleLoading && !workshop?.google_place_id && !googlePlaceDetails ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                {t('workshop.directoryListingDesc')}
              </Text>
            </View>
          ) : null}

          {/* 4. Zero Reviews State */}
          {!googleLoading && (googlePlaceDetails?.status === 'no_reviews' || (googlePlaceDetails && googlePlaceDetails.reviews.length === 0)) ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                {t('reviews.noReviewsYet')}
              </Text>
            </View>
          ) : null}

          {/* 5. Authentic Google Reviews List */}
          {!googleLoading && googlePlaceDetails?.reviews && googlePlaceDetails.reviews.length > 0 ? (
            <View style={{ gap: 10, marginVertical: 8 }}>
              {(showAllGoogleReviews ? googlePlaceDetails.reviews : googlePlaceDetails.reviews.slice(0, 3)).map((gRev) => (
                <View key={gRev.id} style={styles.googleReviewItemBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {gRev.authorPhoto ? (
                        <Image source={{ uri: gRev.authorPhoto }} style={{ width: 22, height: 22, borderRadius: 11 }} />
                      ) : (
                        <View style={styles.avatarCircleSmall}>
                          <User color={colors.textMuted} size={12} />
                        </View>
                      )}
                      <Text style={styles.gRevAuthor}>{gRev.authorName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {renderStarRow(gRev.rating, 10)}
                      {gRev.relativeTime ? (
                        <Text style={{ color: colors.textMuted, fontSize: 10, marginLeft: 4 }}>{gRev.relativeTime}</Text>
                      ) : null}
                    </View>
                  </View>
                  {gRev.text ? <Text style={styles.gRevText}>"{gRev.text}"</Text> : null}
                </View>
              ))}

              {googlePlaceDetails.reviews.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllBtn}
                  onPress={() => setShowAllGoogleReviews(!showAllGoogleReviews)}
                >
                  <Text style={styles.viewAllBtnText}>
                    {showAllGoogleReviews ? t('common.showLess') : `${t('common.viewAll')} (${googlePlaceDetails.reviews.length})`}
                  </Text>
                  <ChevronRight color={colors.primary} size={14} />
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* Authentic Google Maps Link */}
          {(googlePlaceDetails?.googleMapsUrl || workshop?.google_maps_url) ? (
            <TouchableOpacity style={styles.googleReviewBtn} onPress={handleGoogleReview}>
              <ExternalLink color="#FFF" size={14} />
              <Text style={styles.googleReviewBtnText}>{t('reviews.viewOnGoogleMaps')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>


        {/* ═══════════════════════════════════════════════════════════ */}
        {/* BOOKING / AVAILABILITY SECTION                             */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {isPartner ? (
          <CustomButton
            title={`${t('common.bookNow').toUpperCase()} →`}
            onPress={() => handleBookNow()}
            style={{ marginTop: 14 }}
          />
        ) : (
          <View style={styles.unavailableBannerBox}>
            <Info color={colors.textMuted} size={18} />
            <Text style={styles.unavailableBannerText}>
              {t('workshop.directoryListingDesc')}
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
        </ResponsiveContainer>
      </ScrollView>

      {/* Write Review Modal (Inline) */}
      <ResponsiveModal
        visible={writeReviewModalVisible}
        onClose={() => setWriteReviewModalVisible(false)}
        title={t('reviews.writeReview')}
      >
        <View style={{ gap: 12, paddingVertical: 4 }}>
          {/* Completed Booking Selector */}
          {completedBookings.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800' }}>
                {t('reviews.selectBookingToReview').toUpperCase()}
              </Text>
              {completedBookings.map((bk) => (
                <TouchableOpacity
                  key={bk.id}
                  style={[
                    styles.bookingSelectBox,
                    selectedBookingForReview?.id === bk.id && styles.bookingSelectBoxActive,
                  ]}
                  onPress={() => setSelectedBookingForReview(bk)}
                >
                  <Bike
                    color={selectedBookingForReview?.id === bk.id ? colors.primary : colors.textMuted}
                    size={16}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '800' }}>
                      {bk.motorcycle?.nickname || bk.motorcycle?.brand || 'Motorcycle'} ({bk.motorcycle?.plate_number})
                    </Text>
                    <Text style={{ color: isDark ? colors.textMuted : '#000000', fontSize: 10 }}>
                      {t('common.date')}: {bk.booking_date}
                    </Text>
                  </View>
                  {selectedBookingForReview?.id === bk.id && <Check color={colors.primary} size={16} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Rating Stars */}
          <View style={{ alignItems: 'center', gap: 6, marginVertical: 8 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800' }}>
              {t('reviews.yourRating').toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity key={i} onPress={() => setNewRating(i)}>
                  <Star
                    color="#f59e0b"
                    fill={i <= newRating ? '#f59e0b' : 'transparent'}
                    size={32}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Comment Text Area */}
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800' }}>
            {t('reviews.yourComment').toUpperCase()} ({t('common.optional').toUpperCase()})
          </Text>
          <TextInput
            style={styles.reviewCommentInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder={t('reviews.commentPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={300}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity style={styles.cancelReviewBtn} onPress={() => setWriteReviewModalVisible(false)}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '800' }}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <CustomButton
            title={submittingReview ? t('common.submitting').toUpperCase() : t('reviews.submitReview').toUpperCase()}
            onPress={handleSubmitReview}
            disabled={submittingReview || newRating === 0}
            style={{ flex: 1 }}
          />
        </View>
      </ResponsiveModal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppThemeColors, isDark: boolean) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topHeaderNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceContainer, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  topTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  photoContainer: { height: 180, borderRadius: 20, overflow: 'hidden', marginBottom: 16, position: 'relative', backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.border },
  workshopCoverImage: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, backgroundColor: colors.surfaceContainer, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primaryGlow, gap: 8 },
  photoPlaceholderText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  statusBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  partnerTag: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  partnerTagActive: { backgroundColor: 'rgba(255,107,0,0.15)', borderColor: colors.primary },
  partnerTagDir: { backgroundColor: 'rgba(113,113,122,0.15)', borderColor: colors.border },
  partnerTagText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  partnerTagTextActive: { color: colors.primary },
  partnerTagTextDir: { color: colors.textMuted },
  unavailableBannerBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceContainer, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginTop: 10 },
  unavailableBannerText: { color: colors.textMuted, fontSize: 12, flex: 1, lineHeight: 16, fontWeight: '600' },
  infoCard: { backgroundColor: colors.surfaceContainer, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10, marginBottom: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workshopName: { color: colors.textPrimary, fontSize: 20, fontWeight: '900', flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
  categoryFilterChip: { backgroundColor: colors.surfaceContainer, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  activeCategoryFilterChip: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.primary },
  categoryFilterChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  activeCategoryFilterChipText: { color: colors.primary, fontWeight: '800' },
  emptyServiceBox: { backgroundColor: colors.surfaceContainer, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6 },
  emptyServiceText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  serviceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  servNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  serviceName: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  serviceDesc: { color: colors.textMuted, fontSize: 11 },
  priceActionCol: { alignItems: 'flex-end', gap: 6 },
  servicePrice: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  selectServBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  selectServBtnText: { color: isDark ? '#000' : '#FFFFFF', fontSize: 11, fontWeight: '800' },

  // ─── Section Headers ────────────────────────────────────────
  sectionHeaderRow: { marginTop: 20, marginBottom: 8 },
  sectionTitleHeader: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  // ─── Rating Summary Card ────────────────────────────────────
  ratingSummaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
    marginBottom: 12,
  },
  ratingBigCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 90,
  },
  ratingBigNum: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
  },
  ratingCountText: {
    color: colors.textMuted,
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
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    width: 22,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  barPct: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    width: 20,
    textAlign: 'right',
  },

  // ─── Write Review Button ────────────────────────────────────
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  writeReviewBtnText: {
    color: isDark ? '#000' : '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },

  // ─── Review Items ───────────────────────────────────────────
  emptyReviewTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  emptyReviewSub: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  reviewCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginBottom: 8,
  },
  revHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  revName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  revTimeAgo: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  revComment: {
    color: colors.textSecondary,
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
    borderColor: colors.border,
  },
  workshopReplyBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginTop: 4,
  },
  replyHeader: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  replyText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  sourceBadge: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sourceBadgeText: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '900',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  viewAllBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  // ─── Google Reviews Card ────────────────────────────────────
  googleReviewCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: 12,
  },
  googleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarCircleSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  googleRatingText: {
    color: colors.textSecondary,
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
  googleReviewItemBox: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gRevAuthor: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  gRevText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
  },

  // Write Review Modal Styles
  bookingSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingSelectBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDark,
  },
  reviewCommentInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 13,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelReviewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surfaceContainer, borderRadius: 24, padding: 20, width: '100%', borderWidth: 1, borderColor: colors.primary, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  modalSub: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  partNameModal: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  partShopModal: { color: colors.textMuted, fontSize: 12 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  qtyLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: colors.border },
  qtyBtn: { width: 32, height: 32, backgroundColor: colors.surfaceContainer, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  qtyValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  totalLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  totalVal: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  successIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.successBg, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', borderWidth: 1, borderColor: colors.success },
  ticketDetail: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
