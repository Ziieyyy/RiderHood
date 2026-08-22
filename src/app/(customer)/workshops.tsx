import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import {
  Search,
  MapPin,
  Star,
  Wrench,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Phone,
  Clock,
  Package,
  Layers,
  X,
} from 'lucide-react-native';
import { getWorkshops, canBookWorkshop } from '../../services/workshopService';
import { getWorkshopOpenStatus } from '../../utils/operatingHours';
import { useTranslation } from '../../i18n';
import type { Workshop } from '../../types/database';

export default function CustomerWorkshopsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'open_now' | 'bookable' | 'highest_rated'>('all');
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkshops = async () => {
    try {
      setLoading(true);
      const data = await getWorkshops({
        search: search.trim(),
        partnerOnly: filterMode === 'bookable',
        isOpenNow: filterMode === 'open_now',
      });

      let list = data ?? [];

      if (filterMode === 'highest_rated') {
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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkshops();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, filterMode]);

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

      {/* Search & Filter Container */}
      <View style={styles.searchContainer}>
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

        {/* 4 Standard Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterMode === 'all' && styles.activeFilterChip]}
            onPress={() => setFilterMode('all')}
          >
            <Text style={[styles.filterChipText, filterMode === 'all' && styles.activeFilterChipText]}>
              {t('common.all')} ({workshops.length})
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {filterMode === 'bookable'
            ? t('workshop.onlineBookingAvailable').toUpperCase()
            : filterMode === 'open_now'
            ? t('workshop.openNow').toUpperCase()
            : filterMode === 'highest_rated'
            ? t('workshop.highestRated').toUpperCase()
            : t('workshop.directoryTitle').toUpperCase()} ({workshops.length})
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 24 }} />
        ) : workshops.length === 0 ? (
          <View style={styles.emptyBox}>
            <Wrench color={COLORS.textMuted} size={40} />
            <Text style={styles.emptyTitle}>{t('workshop.noWorkshopsFound')}</Text>
            <Text style={styles.emptyDesc}>
              {t('workshop.noWorkshopsFoundDesc')}
            </Text>
          </View>
        ) : (
          workshops.map((w) => {
            const isBookable = canBookWorkshop(w);
            const openStatus = getWorkshopOpenStatus(w);

            return (
              <View
                key={w.id}
                style={[
                  styles.workshopCard,
                  isBookable && styles.bookableCardHighlight,
                ]}
              >
                {/* Header Row: Title & Partner Badge */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workshopName}>{w.name}</Text>
                    <Text style={styles.addressText}>
                      {w.address}
                      {w.district ? `, ${w.district}` : ''}
                    </Text>
                  </View>

                  {/* Collaboration Status Badge */}
                  <View
                    style={[
                      styles.badge,
                      isBookable ? styles.partnerBadge : styles.directoryBadge,
                    ]}
                  >
                    <Text style={isBookable ? styles.partnerBadgeText : styles.directoryBadgeText}>
                      {isBookable ? t('workshop.onlineBookingAvailable').toUpperCase() : t('workshop.directoryListing').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Rating, Open Schedule & Phone Meta Row */}
                <View style={styles.metaRow}>
                  <View style={styles.ratingBadge}>
                    <Star color="#f59e0b" size={13} fill="#f59e0b" />
                    <Text style={styles.ratingText}>{(w.rating ?? 4.4).toFixed(1)}</Text>
                  </View>

                  <Text style={styles.metaDot}>•</Text>

                  <View
                    style={[
                      styles.statusTag,
                      {
                        backgroundColor: openStatus.isOpen
                          ? 'rgba(16,185,129,0.12)'
                          : 'rgba(239,68,68,0.12)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        { color: openStatus.isOpen ? COLORS.success : COLORS.danger },
                      ]}
                    >
                      {openStatus.statusText}
                    </Text>
                  </View>

                  {w.phone && (
                    <>
                      <Text style={styles.metaDot}>•</Text>
                      <View style={styles.phoneBadge}>
                        <Phone color={COLORS.textSecondary} size={11} />
                        <Text style={styles.phoneText}>{w.phone}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Catalogue Capability Indicators */}
                <View style={styles.catalogueBadgeRow}>
                  <View style={styles.catIndicator}>
                    <Wrench color={COLORS.primary} size={12} />
                    <Text style={styles.catIndicatorText}>{t('services.title')}</Text>
                  </View>
                </View>

                {/* Action Buttons: Strict Wan Legacy vs Directory Control */}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => handleOpenDetails(w)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewDetailsText}>{t('workshop.viewWorkshop')}</Text>
                  </TouchableOpacity>

                  {isBookable ? (
                    <TouchableOpacity
                      style={styles.bookServiceBtn}
                      onPress={() => handleBookNow(w)}
                      activeOpacity={0.85}
                    >
                      <Calendar color="#FFFFFF" size={14} />
                      <Text style={styles.bookServiceText}>{t('common.bookNow')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.callWorkshopBtn}
                      onPress={() => handleCallWorkshop(w)}
                      activeOpacity={0.85}
                    >
                      <Phone color={COLORS.textPrimary} size={13} />
                      <Text style={styles.callWorkshopText}>{t('workshop.callWorkshop')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
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
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDesc: {
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
  },
  bookableCardHighlight: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  workshopName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  addressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  partnerBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.primary,
  },
  partnerBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  directoryBadge: {
    backgroundColor: 'rgba(113, 113, 122, 0.12)',
    borderColor: COLORS.border,
  },
  directoryBadgeText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  metaDot: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  catalogueBadgeRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4,
    flexWrap: 'wrap',
  },
  catIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  catIndicatorText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewDetailsBtn: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewDetailsText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  bookServiceBtn: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  bookServiceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  callWorkshopBtn: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  callWorkshopText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
});
