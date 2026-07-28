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
} from 'lucide-react-native';
import { getWorkshop, getWorkshopServices } from '../../../services/workshopService';
import { getWorkshopReviews } from '../../../services/reviewService';
import type { Workshop, Service, Review } from '../../../types/database';

export default function CustomerWorkshopDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);

  const loadWorkshopData = useCallback(async () => {
    if (!id) return;
    try {
      const [w, svcs, revs] = await Promise.all([
        getWorkshop(id),
        getWorkshopServices(id),
        getWorkshopReviews(id),
      ]);
      setWorkshop(w);
      setServices(svcs);
      setReviews(revs);
    } catch (err) {
      console.log('Error loading workshop detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={workshop.name}
        subtitle={`${workshop.district || 'Kuala Lumpur'} • ★ ${workshop.rating ? Number(workshop.rating).toFixed(1) : '5.0'}`}
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
          <View style={styles.coverPlaceholder}>
            <Wrench color={COLORS.primary} size={48} />
          </View>

          <View style={styles.workshopMetaBox}>
            <View style={styles.ratingBadgeRow}>
              <View style={styles.ratingBadge}>
                <Star color="#f59e0b" fill="#f59e0b" size={14} />
                <Text style={styles.ratingText}>
                  {workshop.rating ? Number(workshop.rating).toFixed(1) : '5.0'} ({workshop.review_count || 12} reviews)
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
          <Text style={styles.sectionTitle}>AVAILABLE SERVICES ({services.length})</Text>
          <Text style={styles.sectionSub}>Select services to proceed with booking</Text>
        </View>

        {services.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>NO SERVICES LISTED</Text>
            <Text style={styles.emptySub}>Contact the workshop directly for available packages.</Text>
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
                      <Text style={styles.addSvcTextActive}>ADDED</Text>
                    </>
                  ) : (
                    <>
                      <Plus color={COLORS.primary} size={14} />
                      <Text style={styles.addSvcText}>ADD</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Customer Reviews Section */}
        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>CUSTOMER REVIEWS ({reviews.length})</Text>
        </View>

        {reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Star color={COLORS.textMuted} size={32} />
            <Text style={styles.emptyTitle}>NO REVIEWS YET</Text>
            <Text style={styles.emptySub}>Be the first rider to leave a review after your service appointment.</Text>
          </View>
        ) : (
          reviews.map(rev => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.revHeader}>
                <Text style={styles.revName}>{rev.customer?.full_name || 'Rider'}</Text>
                <View style={styles.revStarRow}>
                  <Star color="#f59e0b" fill="#f59e0b" size={12} />
                  <Text style={styles.revStarText}>{rev.rating}.0</Text>
                </View>
              </View>
              {rev.comment ? <Text style={styles.revComment}>{rev.comment}</Text> : null}
              {rev.reply ? (
                <View style={styles.workshopReplyBox}>
                  <Text style={styles.replyHeader}>Workshop Reply:</Text>
                  <Text style={styles.replyText}>{rev.reply}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Bottom Booking Bar */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barLabel}>
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
  coverPlaceholder: {
    height: 140,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  revName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  revStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  revStarText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  revComment: {
    color: COLORS.textSecondary,
    fontSize: 12,
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
  barLabel: {
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
