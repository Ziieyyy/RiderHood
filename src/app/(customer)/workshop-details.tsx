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
import { COLORS } from '../../constants/theme';
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
} from 'lucide-react-native';
import { getWorkshop, getWorkshopServices } from '../../services/workshopService';
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
import { getWorkshopOpenStatus } from '../../utils/operatingHours';
import { useAuth } from '../../context/AuthContext';
import { fetchGooglePlaceDetails, type GooglePlaceDetailsResult } from '../../services/googlePlacesService';
import type { Service, Workshop, Part, Review } from '../../types/database';

export default function WorkshopDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workshopId = params.id as string;
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'services' | 'parts'>('services');
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [googlePlaceDetails, setGooglePlaceDetails] = useState<GooglePlaceDetailsResult | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
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

  // Buy Part Modal State
  const [selectedPartToBuy, setSelectedPartToBuy] = useState<Part | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buySuccessModal, setBuySuccessModal] = useState(false);

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
      const placeId = targetWorkshop.google_place_id;
      if (!placeId) {
        setGooglePlaceDetails(null);
        return;
      }
      const gDetails = await fetchGooglePlaceDetails(placeId, targetWorkshop);
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
    setParts([]);
    setLoading(true);

    const loadDetails = async () => {
      if (!workshopId) return;
      try {
        const [wsData, svcData, partsData, revData, statsData] = await Promise.all([
          getWorkshop(workshopId).catch(() => null),
          getWorkshopServices(workshopId).catch(() => []),
          getWorkshopParts(workshopId).catch(() => []),
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
        setParts(partsData ?? []);
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



  const isPartner = Boolean(workshop ? (workshop.is_partner && workshop.booking_enabled) : true);
  const openStatus = getWorkshopOpenStatus(workshop || { is_open: isOpen });

  const handleBookNow = (serviceName?: string) => {
    if (workshop && workshop.booking_enabled === false) {
      Alert.alert('Booking Unavailable', 'This workshop is a directory-only listing and is currently not accepting RiderHood online bookings.');
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

  const handleConfirmPartPurchase = () => {
    if (!selectedPartToBuy) return;
    setBuySuccessModal(true);
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
          <ArrowLeft color={COLORS.textPrimary} size={20} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner / Workshop Image Header */}
        <View style={styles.photoContainer}>
          <View style={styles.photoPlaceholder}>
            <Wrench color={COLORS.primary} size={44} />
            <Text style={styles.photoPlaceholderText}>{isPartner ? 'RiderHood Certified Partner Lab' : 'Directory Motorcycle Workshop'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: openStatus.isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
            <Text style={[styles.statusText, { color: openStatus.isOpen ? COLORS.success : COLORS.danger }]}>
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
                  {isPartner ? 'ACTIVE RIDERHOOD PARTNER' : 'DIRECTORY LISTING ONLY'}
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
              <MapPin color={COLORS.primary} size={16} />
              <Text style={styles.detailText}>Address: {workshop.address}</Text>
            </View>
          ) : null}

          {workshop?.phone ? (
            <View style={styles.detailRow}>
              <Phone color={COLORS.primary} size={16} />
              <Text style={styles.detailText}>Phone: {workshop.phone}</Text>
            </View>
          ) : null}

          {openStatus.scheduleText ? (
            <View style={styles.detailRow}>
              <Clock color={COLORS.primary} size={16} />
              <Text style={styles.detailText}>Hours: {openStatus.scheduleText}</Text>
            </View>
          ) : null}
        </View>

        {/* Segmented Tab Controls: Services vs Spare Parts */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'services' && styles.activeTabButton]}
            onPress={() => setActiveTab('services')}
          >
            <Wrench color={activeTab === 'services' ? COLORS.primaryDark : COLORS.textSecondary} size={16} />
            <Text style={[styles.tabButtonText, activeTab === 'services' && styles.activeTabText]}>
              SERVICES & TUNING ({services.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'parts' && styles.activeTabButton]}
            onPress={() => setActiveTab('parts')}
          >
            <Package color={activeTab === 'parts' ? COLORS.primaryDark : COLORS.textSecondary} size={16} />
            <Text style={[styles.tabButtonText, activeTab === 'parts' && styles.activeTabText]}>
              SPARE PARTS ({parts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Tab 1: Services List */}
        {activeTab === 'services' && (
          <View style={{ gap: 10 }}>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 20 }} />
            ) : services.length === 0 ? (
              <View style={styles.emptyServiceBox}>
                <Text style={styles.emptyServiceText}>
                  {isPartner
                    ? 'Tap below to book your service at this workshop.'
                    : 'No service packages configured for this directory listing.'}
                </Text>
              </View>
            ) : (
              services.map((serv) => (
                <View key={serv.id} style={styles.serviceItem}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.servNameRow}>
                      <CheckCircle2 color={COLORS.primary} size={16} />
                      <Text style={styles.serviceName}>{serv.name}</Text>
                    </View>
                    {serv.description ? (
                      <Text style={styles.serviceDesc}>{serv.description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.priceActionCol}>
                    <Text style={styles.servicePrice}>RM{Number(serv.price).toFixed(0)}</Text>
                    {isPartner && (
                      <TouchableOpacity style={styles.selectServBtn} onPress={() => handleBookNow(serv.name)}>
                        <Text style={styles.selectServBtnText}>Book Service</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Content Tab 2: Spare Parts Section */}
        {activeTab === 'parts' && (
          <View style={{ gap: 12 }}>
            <View style={styles.partsBannerNote}>
              <ShoppingBag color={COLORS.primary} size={18} />
              <Text style={styles.partsBannerNoteText}>
                Buy spare parts directly from <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{name}</Text> or request installation during service booking.
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 20 }} />
            ) : parts.length === 0 ? (
              <View style={styles.emptyServiceBox}>
                <Text style={styles.emptyServiceText}>No spare parts information available for this directory listing.</Text>
              </View>
            ) : (
              parts.map((part) => (
                <View key={part.id} style={styles.partCard}>
                  <View style={styles.partIconBox}>
                    <Package color={COLORS.primary} size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.brandBadge}>
                      <Text style={styles.brandText}>{part.brand ? part.brand.toUpperCase() : 'SPARE PART'}</Text>
                    </View>
                    <Text style={styles.partName}>{part.name}</Text>
                    {part.description ? <Text style={styles.partDesc} numberOfLines={2}>{part.description}</Text> : null}
                    <Text style={styles.partPrice}>RM {(part.price || 0).toFixed(2)}</Text>
                  </View>

                  <View style={{ gap: 6, justifyContent: 'center' }}>
                    <TouchableOpacity
                      style={styles.buyPartOnlyBtn}
                      onPress={() => {
                        setSelectedPartToBuy(part);
                        setBuyQuantity(1);
                      }}
                    >
                      <ShoppingBag color={COLORS.primaryDark} size={14} />
                      <Text style={styles.buyPartOnlyBtnText}>Buy Part Only</Text>
                    </TouchableOpacity>

                    {isPartner && (
                      <TouchableOpacity
                        style={styles.installWithServiceBtn}
                        onPress={() => handleBookNow(part.name)}
                      >
                        <Calendar color={COLORS.primary} size={14} />
                        <Text style={styles.installWithServiceBtnText}>Get Service</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CUSTOMER REVIEWS SECTION                                  */}
        {/* Directly below Services & Spare Parts                      */}
        {/* ═══════════════════════════════════════════════════════════ */}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleHeader}>CUSTOMER REVIEWS</Text>
        </View>

        {/* RiderHood Rating Summary Box */}
        <View style={styles.ratingSummaryCard}>
          <View style={styles.ratingBigCol}>
            <Text style={styles.ratingBigNum}>⭐ {riderhoodRating > 0 ? riderhoodRating.toFixed(1) : '0.0'}</Text>
            <Text style={styles.ratingCountText}>
              Based on {reviewStats.count} RiderHood review{reviewStats.count !== 1 ? 's' : ''}
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
            <Edit2 color="#000" size={16} />
            <Text style={styles.writeReviewBtnText}>Write a Review</Text>
          </TouchableOpacity>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <View style={styles.emptyServiceBox}>
            <Star color={COLORS.textMuted} size={28} />
            <Text style={styles.emptyReviewTitle}>No RiderHood reviews yet.</Text>
            <Text style={styles.emptyReviewSub}>Be the first to share your experience after completing a service booking.</Text>
          </View>
        ) : (
          <>
            {displayedReviews.map((rev) => (
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
                    <Text style={styles.replyHeader}>Workshop Reply:</Text>
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
                  {showAllReviews ? 'Show Less' : `View All ${reviews.length} RiderHood Reviews`}
                </Text>
                <ChevronRight color={COLORS.primary} size={14} />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* GOOGLE REVIEWS SECTION                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleHeader}>GOOGLE REVIEWS</Text>
          <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '700' }}>Powered by Google Maps</Text>
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
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '600' }}>
                    ({googlePlaceDetails?.userRatingCount ?? workshop?.google_review_count ?? 0} Google reviews)
                  </Text>
                </View>
              ) : (
                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                  Google rating unavailable
                </Text>
              )}
            </View>
          </View>

          {/* 1. Loading State */}
          {googleLoading ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator color="#4285F4" size="small" />
              <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8 }}>Loading Google Reviews...</Text>
            </View>
          ) : null}

          {/* 2. Error State */}
          {!googleLoading && googlePlaceDetails?.status === 'error' ? (
            <View style={{ paddingVertical: 12, alignItems: 'center', gap: 8 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' }}>
                Google reviews are temporarily unavailable.
              </Text>
              <TouchableOpacity
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surfaceContainer, borderWidth: 1, borderColor: COLORS.border }}
                onPress={() => loadGoogleDetails(workshop)}
              >
                <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* 3. Missing Google Place ID / Information Unavailable State */}
          {!googleLoading && !workshop?.google_place_id && !googlePlaceDetails ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>
                Google information is currently unavailable for this workshop.
              </Text>
            </View>
          ) : null}

          {/* 4. Zero Reviews State */}
          {!googleLoading && (googlePlaceDetails?.status === 'no_reviews' || (googlePlaceDetails && googlePlaceDetails.reviews.length === 0)) ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>
                No Google reviews are currently available.
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
                          <User color={COLORS.textMuted} size={12} />
                        </View>
                      )}
                      <Text style={styles.gRevAuthor}>{gRev.authorName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {renderStarRow(gRev.rating, 10)}
                      {gRev.relativeTime ? (
                        <Text style={{ color: COLORS.textMuted, fontSize: 10, marginLeft: 4 }}>{gRev.relativeTime}</Text>
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
                    {showAllGoogleReviews ? 'Show Less' : `View All ${googlePlaceDetails.reviews.length} Google Reviews`}
                  </Text>
                  <ChevronRight color={COLORS.primary} size={14} />
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* Authentic Google Maps Link */}
          {(googlePlaceDetails?.googleMapsUrl || workshop?.google_maps_url) ? (
            <TouchableOpacity style={styles.googleReviewBtn} onPress={handleGoogleReview}>
              <ExternalLink color="#FFF" size={14} />
              <Text style={styles.googleReviewBtnText}>View on Google Maps</Text>
            </TouchableOpacity>
          ) : null}
        </View>


        {/* ═══════════════════════════════════════════════════════════ */}
        {/* BOOKING / AVAILABILITY SECTION                             */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {isPartner ? (
          <CustomButton
            title="BOOK SERVICE AT THIS WORKSHOP →"
            onPress={() => handleBookNow()}
            style={{ marginTop: 14 }}
          />
        ) : (
          <View style={styles.unavailableBannerBox}>
            <Info color={COLORS.textMuted} size={18} />
            <Text style={styles.unavailableBannerText}>
              Online booking is currently unavailable for this directory listing.
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Write Review Modal (Inline) */}
      <Modal visible={writeReviewModalVisible} transparent animationType="slide" onRequestClose={() => setWriteReviewModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setWriteReviewModalVisible(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, paddingVertical: 4 }}>
                {/* Completed Booking Selector */}
                {completedBookings.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: '800' }}>SELECT COMPLETED BOOKING</Text>
                    {completedBookings.map((bk) => (
                      <TouchableOpacity
                        key={bk.id}
                        style={[
                          styles.bookingSelectBox,
                          selectedBookingForReview?.id === bk.id && styles.bookingSelectBoxActive,
                        ]}
                        onPress={() => setSelectedBookingForReview(bk)}
                      >
                        <Bike color={selectedBookingForReview?.id === bk.id ? COLORS.primary : COLORS.textMuted} size={16} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' }}>
                            {bk.motorcycle?.nickname || bk.motorcycle?.brand || 'Motorcycle'} ({bk.motorcycle?.plate_number})
                          </Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>Date: {bk.booking_date}</Text>
                        </View>
                        {selectedBookingForReview?.id === bk.id && <Check color={COLORS.primary} size={16} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Rating Stars */}
                <View style={{ alignItems: 'center', gap: 6, marginVertical: 8 }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '800' }}>YOUR RATING</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TouchableOpacity key={i} onPress={() => setNewRating(i)}>
                        <Star color="#f59e0b" fill={i <= newRating ? '#f59e0b' : 'transparent'} size={32} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Comment Text Area */}
                <Text style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: '800' }}>YOUR COMMENT (OPTIONAL)</Text>
                <TextInput
                  style={styles.reviewCommentInput}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Share details of your experience..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={300}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={styles.cancelReviewBtn} onPress={() => setWriteReviewModalVisible(false)}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '800' }}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton
                title={submittingReview ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
                onPress={handleSubmitReview}
                disabled={submittingReview || newRating === 0}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Buy Part Modal */}
      <Modal visible={!!selectedPartToBuy && !buySuccessModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buy Spare Part Only</Text>
              <TouchableOpacity onPress={() => setSelectedPartToBuy(null)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            {selectedPartToBuy && (
              <View style={{ gap: 12, paddingVertical: 8 }}>
                <Text style={styles.partNameModal}>{selectedPartToBuy.name}</Text>
                <Text style={styles.partShopModal}>Sold by: {name}</Text>

                <View style={styles.qtyRow}>
                  <Text style={styles.qtyLabel}>Quantity:</Text>
                  <View style={styles.qtyBox}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setBuyQuantity(q => Math.max(1, q - 1))}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{buyQuantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setBuyQuantity(q => q + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Price:</Text>
                  <Text style={styles.totalVal}>RM {((selectedPartToBuy.price || 0) * buyQuantity).toFixed(2)}</Text>
                </View>

                <CustomButton
                  title="CONFIRM PURCHASE & PICKUP"
                  onPress={handleConfirmPartPurchase}
                  style={{ marginTop: 10 }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Purchase Success Modal */}
      <Modal visible={buySuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconBox}>
              <Check color={COLORS.success} size={40} />
            </View>
            <Text style={styles.modalTitle}>PURCHASE SUCCESSFUL!</Text>
            <Text style={styles.modalSub}>
              Your spare part order for <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{selectedPartToBuy?.name}</Text> has been placed at <Text style={{ color: COLORS.primary }}>{name}</Text>.
            </Text>
            <Text style={styles.ticketDetail}>Please present order reference at workshop for self-pickup.</Text>
            <CustomButton
              title="DONE"
              onPress={() => {
                setBuySuccessModal(false);
                setSelectedPartToBuy(null);
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topHeaderNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surfaceContainer, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  topTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  photoContainer: { height: 160, borderRadius: 20, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  photoPlaceholder: { flex: 1, backgroundColor: COLORS.surfaceContainer, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primaryGlow, gap: 8 },
  photoPlaceholderText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  statusBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  partnerTag: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  partnerTagActive: { backgroundColor: 'rgba(255,107,0,0.15)', borderColor: COLORS.primary },
  partnerTagDir: { backgroundColor: 'rgba(113,113,122,0.15)', borderColor: COLORS.border },
  partnerTagText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  partnerTagTextActive: { color: COLORS.primary },
  partnerTagTextDir: { color: COLORS.textMuted },
  unavailableBannerBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surfaceContainer, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 },
  unavailableBannerText: { color: COLORS.textMuted, fontSize: 12, flex: 1, lineHeight: 16, fontWeight: '600' },
  infoCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10, marginBottom: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workshopName: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900', flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surfaceContainer, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  activeTabButton: { backgroundColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.primary },
  tabButtonText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '800' },
  activeTabText: { color: COLORS.primaryDark },
  emptyServiceBox: { backgroundColor: COLORS.surfaceContainer, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 6 },
  emptyServiceText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  serviceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  servNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  serviceName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  serviceDesc: { color: COLORS.textMuted, fontSize: 11 },
  priceActionCol: { alignItems: 'flex-end', gap: 6 },
  servicePrice: { color: COLORS.primary, fontSize: 15, fontWeight: '900' },
  selectServBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  selectServBtnText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: '800' },
  partsBannerNote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surfaceContainer, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  partsBannerNoteText: { color: COLORS.textSecondary, fontSize: 12, flex: 1, lineHeight: 16 },
  partCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  partIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primaryGlow, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  brandBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  brandText: { color: COLORS.primary, fontSize: 9, fontWeight: '800' },
  partName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  partDesc: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  partPrice: { color: COLORS.primary, fontSize: 15, fontWeight: '900', marginTop: 4 },
  buyPartOnlyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  buyPartOnlyBtnText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: '800' },
  installWithServiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  installWithServiceBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },

  // ─── Section Headers ────────────────────────────────────────
  sectionHeaderRow: { marginTop: 20, marginBottom: 8 },
  sectionTitleHeader: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  // ─── Rating Summary Card ────────────────────────────────────
  ratingSummaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textPrimary,
    fontSize: 26,
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
    width: 20,
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
    marginBottom: 12,
  },
  writeReviewBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },

  // ─── Review Items ───────────────────────────────────────────
  emptyReviewTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  emptyReviewSub: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
  reviewCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    marginBottom: 8,
  },
  viewAllBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  // ─── Google Reviews Card ────────────────────────────────────
  googleReviewCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderColor: COLORS.border,
  },
  avatarCircleSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.surfaceContainer,
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
  googleReviewItemBox: {
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gRevAuthor: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  gRevText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
  },

  // Write Review Modal Styles
  bookingSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingSelectBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark,
  },
  reviewCommentInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelReviewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surfaceContainer, borderRadius: 24, padding: 20, width: '100%', borderWidth: 1, borderColor: COLORS.primary, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  modalSub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  partNameModal: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  partShopModal: { color: COLORS.textMuted, fontSize: 12 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  qtyLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  qtyBtn: { width: 32, height: 32, backgroundColor: COLORS.surfaceContainer, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  qtyValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  totalLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  totalVal: { color: COLORS.primary, fontSize: 20, fontWeight: '900' },
  successIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.successBg, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', borderWidth: 1, borderColor: COLORS.success },
  ticketDetail: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});
