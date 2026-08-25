import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';
import { useResponsive } from '../../hooks/useResponsive';
import {
  Search,
  MapPin,
  Star,
  Wrench,
  ChevronRight,
  Phone,
  Clock,
  X,
  Navigation,
  RotateCw,
} from 'lucide-react-native';
import { getWorkshops, canBookWorkshop } from '../../services/workshopService';
import { getWorkshopOpenStatus } from '../../utils/operatingHours';
import { getWorkshopImageSource } from '../../utils/workshopImage';
import {
  requestUserLocation,
  getWorkshopCoordinates,
  calculateDistanceKm,
  formatDistance,
  type Coordinates,
} from '../../utils/location';
import { useTranslation } from '../../i18n';
import type { Workshop } from '../../types/database';

export default function CustomerWorkshopsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { contentPadding } = useResponsive();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'nearby' | 'open_now' | 'bookable' | 'highest_rated'>('all');
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  // GPS State
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'active' | 'denied'>('idle');

  // Request GPS Location
  const handleRequestGPS = useCallback(async (autoSetNearby = false) => {
    setLocationLoading(true);
    try {
      const coords = await requestUserLocation();
      if (coords) {
        setUserLocation(coords);
        setLocationStatus('active');
        if (autoSetNearby) {
          setFilterMode('nearby');
        }
      } else {
        setLocationStatus('denied');
        if (autoSetNearby) {
          // If browser denied GPS, default to Kulim center
          setUserLocation({ latitude: 5.3644, longitude: 100.5618 });
          setFilterMode('nearby');
        }
      }
    } catch (e) {
      console.warn('GPS location request error:', e);
      setLocationStatus('denied');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Request GPS on initial mount
  useEffect(() => {
    handleRequestGPS(false);
  }, [handleRequestGPS]);

  const fetchWorkshops = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWorkshops({
        search: search.trim(),
        partnerOnly: filterMode === 'bookable',
        isOpenNow: filterMode === 'open_now',
      });

      let list = data ?? [];

      if (filterMode === 'nearby') {
        // Sort by Distance using GPS coordinates
        const refLat = userLocation?.latitude ?? 5.3644;
        const refLng = userLocation?.longitude ?? 100.5618;

        list = list.slice().sort((a, b) => {
          const coordsA = getWorkshopCoordinates(a);
          const coordsB = getWorkshopCoordinates(b);
          const distA = coordsA ? calculateDistanceKm(refLat, refLng, coordsA.latitude, coordsA.longitude) : 9999;
          const distB = coordsB ? calculateDistanceKm(refLat, refLng, coordsB.latitude, coordsB.longitude) : 9999;
          return distA - distB;
        });
      } else if (filterMode === 'highest_rated') {
        list = list.slice().sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
      } else if (filterMode !== 'bookable') {
        // Standard sort: Pin Wan Legacy / Online Booking Partner to top, followed by rating
        list = list.slice().sort((a, b) => {
          const aBookable = canBookWorkshop(a);
          const bBookable = canBookWorkshop(b);
          if (aBookable && !bBookable) return -1;
          if (!aBookable && bBookable) return 1;
          return Number(b.rating || 0) - Number(a.rating || 0);
        });
      }

      setWorkshops(list);
    } catch (err) {
      console.log('Error fetching customer workshops:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterMode, userLocation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkshops();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchWorkshops]);

  const handleNearbyFilterClick = () => {
    if (!userLocation) {
      handleRequestGPS(true);
    } else {
      setFilterMode('nearby');
    }
  };

  const handleOpenDetails = (w: Workshop) => {
    router.push({
      pathname: '/(customer)/workshop-details',
      params: {
        id: w.id,
      },
    });
  };

  const handleBookNow = (w: Workshop) => {
    if (!canBookWorkshop(w)) {
      Alert.alert(
        'Online Booking Unavailable',
        `Online appointment booking is currently available exclusively with Wan Legacy Motor. You can call ${w.name} directly at ${w.phone || 'their phone number'}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call Workshop',
            onPress: () => w.phone && Linking.openURL(`tel:${w.phone.replace(/\s+/g, '')}`),
          },
        ]
      );
      return;
    }

    router.push({
      pathname: '/(customer)/booking',
      params: {
        workshopId: w.id,
        workshopName: w.name,
      },
    });
  };

  const handleCallWorkshop = (w: Workshop) => {
    if (!w.phone) {
      Alert.alert('Contact Information', `No phone number registered for ${w.name}.`);
      return;
    }
    const cleanNumber = w.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('workshop.directoryTitle')} subtitle={t('workshop.directorySub')} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Search & Filter Container */}
          <View style={styles.searchContainer}>
            {/* GPS Location Status Bar */}
            <View style={styles.gpsBanner}>
              <View style={styles.gpsInfo}>
                <Navigation color={userLocation ? COLORS.primary : COLORS.textMuted} size={15} />
                <Text style={styles.gpsText} numberOfLines={1}>
                  {locationLoading
                    ? '🛰️ ' + t('common.loading') + ' GPS...'
                    : userLocation
                    ? `📍 GPS Aktif • ${filterMode === 'nearby' ? 'Disusun paling dekat' : 'Jarak dipaparkan'}`
                    : '📍 Bolehkan GPS untuk melihat jarak bengkel'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.gpsBtn, userLocation ? styles.gpsBtnActive : undefined]}
                onPress={() => handleRequestGPS(true)}
                disabled={locationLoading}
                activeOpacity={0.8}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <RotateCw color={userLocation ? '#000' : COLORS.primary} size={12} />
                    <Text style={[styles.gpsBtnText, userLocation ? styles.gpsBtnTextActive : undefined]}>
                      {userLocation ? 'Kemaskini GPS' : 'Kesan GPS'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <Search color={COLORS.textMuted} size={18} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={t('workshop.searchPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X color={COLORS.textMuted} size={16} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipRow}
            >
              <TouchableOpacity
                style={[styles.filterChip, filterMode === 'all' && styles.activeFilterChip]}
                onPress={() => setFilterMode('all')}
              >
                <Text style={[styles.filterChipText, filterMode === 'all' && styles.activeFilterChipText]}>
                  {t('common.all')} ({workshops.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, filterMode === 'nearby' && styles.activeFilterChip]}
                onPress={handleNearbyFilterClick}
              >
                <Text style={[styles.filterChipText, filterMode === 'nearby' && styles.activeFilterChipText]}>
                  📍 {t('workshop.nearbyWorkshops')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, filterMode === 'open_now' && styles.activeFilterChip]}
                onPress={() => setFilterMode('open_now')}
              >
                <Text style={[styles.filterChipText, filterMode === 'open_now' && styles.activeFilterChipText]}>
                  🟢 {t('workshop.openNow')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, filterMode === 'bookable' && styles.activeFilterChip]}
                onPress={() => setFilterMode('bookable')}
              >
                <Text style={[styles.filterChipText, filterMode === 'bookable' && styles.activeFilterChipText]}>
                  ⚡ {t('workshop.onlineBookingAvailable')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, filterMode === 'highest_rated' && styles.activeFilterChip]}
                onPress={() => setFilterMode('highest_rated')}
              >
                <Text style={[styles.filterChipText, filterMode === 'highest_rated' && styles.activeFilterChipText]}>
                  ⭐ {t('workshop.highestRated')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Workshop Cards Grid */}
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
          ) : workshops.length === 0 ? (
            <View style={styles.emptyCard}>
              <Wrench color={COLORS.textMuted} size={48} />
              <Text style={styles.emptyTitle}>{t('workshop.noWorkshopsFound')}</Text>
              <Text style={styles.emptySub}>{t('workshop.noWorkshopsFoundDesc')}</Text>
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {workshops.map((w) => {
                const bookable = canBookWorkshop(w);
                const openStatus = getWorkshopOpenStatus(w);
                const coords = getWorkshopCoordinates(w);
                const refLat = userLocation?.latitude ?? 5.3644;
                const refLng = userLocation?.longitude ?? 100.5618;
                const distKm = coords ? calculateDistanceKm(refLat, refLng, coords.latitude, coords.longitude) : null;

                return (
                  <View key={w.id} style={styles.workshopCard}>
                    {/* Header Row */}
                    <View style={styles.cardTopRow}>
                      <Image
                        source={getWorkshopImageSource(w)}
                        style={styles.workshopThumb}
                        resizeMode="contain"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.wsName} numberOfLines={1}>
                          {w.name}
                        </Text>
                        <View style={styles.ratingRow}>
                          <Star color="#F59E0B" fill="#F59E0B" size={13} />
                          <Text style={styles.ratingText}>
                            {w.rating ? Number(w.rating).toFixed(1) : '4.8'}
                          </Text>
                          <Text style={styles.reviewsCount}>
                            ({w.review_count || 24} {t('workshop.reviewsCount')})
                          </Text>
                        </View>
                      </View>
                      {distKm !== null && (
                        <View style={styles.distanceTag}>
                          <Navigation color={COLORS.primary} size={11} />
                          <Text style={styles.distanceTagText}>{formatDistance(distKm)}</Text>
                        </View>
                      )}
                    </View>

                    {/* Address */}
                    <View style={styles.addressRow}>
                      <MapPin color={COLORS.textMuted} size={14} style={{ marginTop: 2 }} />
                      <Text style={styles.addressText} numberOfLines={2}>
                        {w.address || 'Kulim, Kedah'}
                      </Text>
                    </View>

                    {/* Status & Timing */}
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.openBadge,
                          {
                            backgroundColor: openStatus.isOpen
                              ? 'rgba(16, 185, 129, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor: openStatus.isOpen
                                ? COLORS.success
                                : COLORS.danger,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.openBadgeText,
                            {
                              color: openStatus.isOpen ? COLORS.success : COLORS.danger,
                            },
                          ]}
                        >
                          {openStatus.statusText}
                        </Text>
                      </View>

                      {bookable && (
                        <View style={styles.partnerBadge}>
                          <Text style={styles.partnerBadgeText}>
                            ⚡ {t('workshop.verified')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.detailsBtn}
                        onPress={() => handleOpenDetails(w)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.detailsBtnText}>{t('common.details')}</Text>
                        <ChevronRight color={COLORS.textPrimary} size={14} />
                      </TouchableOpacity>

                      {bookable ? (
                        <TouchableOpacity
                          style={styles.bookBtn}
                          onPress={() => handleBookNow(w)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.bookBtnText}>{t('common.bookNow')}</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => handleCallWorkshop(w)}
                          activeOpacity={0.8}
                        >
                          <Phone color={COLORS.primary} size={14} />
                          <Text style={styles.callBtnText}>{t('common.call')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ResponsiveGrid>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  searchContainer: {
    marginBottom: 16,
    gap: 10,
  },
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    gap: 8,
  },
  gpsInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 0, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.4)',
  },
  gpsBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  gpsBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  gpsBtnTextActive: {
    color: '#000',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterChip: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterChipText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  workshopCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    width: '100%',
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  workshopThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  distanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  distanceTagText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  wsName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewsCount: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  addressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  partnerBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
  },
  partnerBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsBtnText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  bookBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  bookBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  callBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
