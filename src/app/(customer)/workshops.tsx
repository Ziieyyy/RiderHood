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
import { COLORS, DARK_COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';
import { InteractiveWorkshopMap } from '../../components/InteractiveWorkshopMap';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
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
  Layers,
  Map,
  List,
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
  type UserLocationDetails,
} from '../../utils/location';
import { useTranslation } from '../../i18n';
import type { Workshop } from '../../types/database';

export default function CustomerWorkshopsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isPhone, contentPadding } = useResponsive();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'nearby' | 'open_now' | 'bookable' | 'highest_rated'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
  const [selectedMapWorkshop, setSelectedMapWorkshop] = useState<Workshop | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  // GPS State
  const [userLocation, setUserLocation] = useState<UserLocationDetails | Coordinates | null>(null);
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
          {/* View Mode & Map Toolbar */}
          <View style={styles.viewModeHeader}>
            <View style={styles.viewModeInfo}>
              <Text style={styles.viewModeTitle}>
                {viewMode === 'map' ? 'MAP EXPLORER' : viewMode === 'split' ? 'INTERACTIVE MAP & DIRECTORY' : 'WORKSHOP DIRECTORY'}
              </Text>
              <Text style={styles.viewModeSubtitle}>
                {userLocation
                  ? `📍 GPS Active • ${workshops.length} workshops near you`
                  : `📍 Kulim, Kedah • ${workshops.length} workshops`}
              </Text>
            </View>

            {/* View Mode Toggle Segmented Control */}
            <View style={styles.viewModeSegment}>
              <TouchableOpacity
                style={[styles.segmentBtn, viewMode === 'split' && styles.segmentBtnActive]}
                onPress={() => setViewMode('split')}
                activeOpacity={0.8}
              >
                <Layers color={viewMode === 'split' ? '#000' : colors.textSecondary} size={13} />
                <Text style={[styles.segmentBtnText, viewMode === 'split' && styles.segmentBtnTextActive]}>
                  Split
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, viewMode === 'map' && styles.segmentBtnActive]}
                onPress={() => setViewMode('map')}
                activeOpacity={0.8}
              >
                <Map color={viewMode === 'map' ? '#000' : colors.textSecondary} size={13} />
                <Text style={[styles.segmentBtnText, viewMode === 'map' && styles.segmentBtnTextActive]}>
                  Map
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, viewMode === 'list' && styles.segmentBtnActive]}
                onPress={() => setViewMode('list')}
                activeOpacity={0.8}
              >
                <List color={viewMode === 'list' ? '#000' : colors.textSecondary} size={13} />
                <Text style={[styles.segmentBtnText, viewMode === 'list' && styles.segmentBtnTextActive]}>
                  List
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Live GPS Map Component */}
          {viewMode !== 'list' && (
            <InteractiveWorkshopMap
              userLocation={userLocation}
              workshops={workshops}
              selectedWorkshopId={selectedMapWorkshop?.id}
              onSelectWorkshop={(ws) => {
                setSelectedMapWorkshop(ws);
                handleOpenDetails(ws);
              }}
              onBookWorkshop={handleBookNow}
              onRefreshLocation={() => handleRequestGPS(false)}
              locationLoading={locationLoading}
              height={viewMode === 'map' ? (isPhone ? 560 : 680) : (isPhone ? 420 : 500)}
            />
          )}

          {/* Search & Filter Container */}
          <View style={styles.searchContainer}>
            {/* GPS Location Status Bar */}
            <View style={styles.gpsBanner}>
              <View style={styles.gpsInfo}>
                <Navigation color={userLocation ? colors.primary : colors.textMuted} size={15} />
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
                    <RotateCw color={userLocation ? '#000' : colors.primary} size={12} />
                    <Text style={[styles.gpsBtnText, userLocation ? styles.gpsBtnTextActive : undefined]}>
                      {userLocation ? 'Kemaskini GPS' : 'Kesan GPS'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <Search color={colors.textMuted} size={18} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={t('workshop.searchPlaceholder')}
                placeholderTextColor={colors.textMuted}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X color={colors.textMuted} size={16} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipRow}
            >
              {[
                { key: 'all', label: t('common.all') },
                { key: 'nearby', label: '📍 ' + t('workshop.nearbyWorkshops') },
                { key: 'open_now', label: '🟢 ' + t('workshop.openNow') },
                { key: 'bookable', label: '⚡ ' + t('workshop.onlineBookingAvailable') },
                { key: 'highest_rated', label: '⭐ ' + t('workshop.highestRated') },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterChip,
                    filterMode === f.key && styles.activeFilterChip,
                  ]}
                  onPress={() => setFilterMode(f.key as any)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterMode === f.key && styles.activeFilterChipText,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Workshop Cards Section (Rendered in Split and List modes, or as a quick carousel in Map mode) */}
          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
          ) : workshops.length === 0 ? (
            <View style={styles.emptyCard}>
              <Wrench color={colors.textMuted} size={48} />
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
                          <Navigation color={colors.primary} size={11} />
                          <Text style={styles.distanceTagText}>{formatDistance(distKm)}</Text>
                        </View>
                      )}
                    </View>

                    {/* Address */}
                    <View style={styles.addressRow}>
                      <MapPin color={colors.textMuted} size={14} style={{ marginTop: 2 }} />
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
                                ? colors.success
                                : colors.danger,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.openBadgeText,
                            {
                              color: openStatus.isOpen ? colors.success : colors.danger,
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
                        <ChevronRight color={colors.textPrimary} size={14} />
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
                          <Phone color={colors.primary} size={14} />
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

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingVertical: 16,
      paddingBottom: 40,
    },
    viewModeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      flexWrap: 'wrap',
      gap: 8,
    },
    viewModeInfo: {
      flex: 1,
      minWidth: 160,
    },
    viewModeTitle: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    viewModeSubtitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
    },
    viewModeSegment: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 10,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 2,
    },
    segmentBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 7,
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
    },
    segmentBtnText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    segmentBtnTextActive: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontWeight: '800',
    },
    searchContainer: {
      marginBottom: 16,
      gap: 10,
    },
    gpsBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.08)' : 'rgba(255, 107, 0, 0.06)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 107, 0, 0.25)' : 'rgba(255, 107, 0, 0.2)',
      gap: 8,
    },
    gpsInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    gpsText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },
    gpsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.18)' : 'rgba(255, 107, 0, 0.12)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.4)',
    },
    gpsBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    gpsBtnText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    gpsBtnTextActive: {
      color: isDark ? '#000' : '#FFF',
    },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 46,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
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
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeFilterChip: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)',
      borderColor: colors.primary,
    },
    filterChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    activeFilterChipText: {
      color: colors.primary,
      fontWeight: '800',
    },
    emptyCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 32,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 8,
      marginTop: 20,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    emptySub: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
    },
    workshopCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    distanceTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.3)',
    },
    distanceTagText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    wsName: {
      color: colors.textPrimary,
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
      color: colors.textMuted,
      fontSize: 11,
    },
    addressRow: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'flex-start',
    },
    addressText: {
      color: colors.textSecondary,
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
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 107, 0, 0.35)' : 'rgba(255, 107, 0, 0.25)',
    },
    partnerBadgeText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '800',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    detailsBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailsBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    bookBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 10,
    },
    bookBtnText: {
      color: isDark ? '#000' : '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    callBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)',
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.3)',
    },
    callBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
  });
