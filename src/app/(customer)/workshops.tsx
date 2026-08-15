import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Search, MapPin, Star, Wrench, ChevronRight, Calendar, CheckCircle2, Info } from 'lucide-react-native';
import { getWorkshops } from '../../services/workshopService';
import { getWorkshopOpenStatus } from '../../utils/operatingHours';
import type { Workshop } from '../../types/database';

export default function CustomerWorkshopsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'partner'>('all');
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkshops = async () => {
    try {
      setLoading(true);
      const data = await getWorkshops({
        search: search.trim(),
        partnerOnly: filterMode === 'partner',
      });
      const sorted = (data ?? []).slice().sort((a, b) => {
        if (a.is_partner && !b.is_partner) return -1;
        if (!a.is_partner && b.is_partner) return 1;
        return Number(b.rating || 0) - Number(a.rating || 0);
      });
      setWorkshops(sorted);
    } catch (err) {
      console.log('Error fetching customer workshops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkshops();
    }, 300);
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
    router.push({
      pathname: '/(customer)/booking',
      params: {
        workshopId: w.id,
        workshopName: w.name,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Find Workshops" subtitle="Certified Nearby Motorcycle Workshops & Directory" />

      {/* Search & Filter Container */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search color={COLORS.textMuted} size={18} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search workshops, address, Kulim, etc..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Filter Chips: All Workshops vs Booking Available */}
        <View style={styles.filterChipRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterMode === 'all' && styles.activeFilterChip]}
            onPress={() => setFilterMode('all')}
          >
            <Text style={[styles.filterChipText, filterMode === 'all' && styles.activeFilterChipText]}>
              All Workshops
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterMode === 'partner' && styles.activeFilterChip]}
            onPress={() => setFilterMode('partner')}
          >
            <Text style={[styles.filterChipText, filterMode === 'partner' && styles.activeFilterChipText]}>
              ⚡ Booking Available (Partners)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {filterMode === 'partner' ? 'PARTNER BOOKABLE WORKSHOPS' : 'WORKSHOP DIRECTORY & PARTNERS'} ({workshops.length})
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : workshops.length === 0 ? (
          <View style={styles.emptyBox}>
            <Wrench color={COLORS.textMuted} size={36} />
            <Text style={styles.emptyTitle}>No Workshops Found</Text>
            <Text style={styles.emptyDesc}>
              {search ? 'No workshops matched your search.' : 'No workshops registered in this category.'}
            </Text>
          </View>
        ) : (
          workshops.map((w) => {
            const isPartner = Boolean(w.is_partner && w.booking_enabled);
            const openStatus = getWorkshopOpenStatus(w);

            return (
              <View key={w.id} style={[styles.workshopCard, isPartner && styles.partnerWorkshopCard]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workshopName}>{w.name}</Text>
                    <Text style={styles.addressText}>{w.address}{w.district ? `, ${w.district}` : ''}</Text>
                  </View>

                  {/* Collaboration Status Badge */}
                  <View style={[styles.badge, isPartner ? styles.partnerBadge : styles.directoryBadge]}>
                    <Text style={[styles.badgeText, isPartner ? styles.partnerBadgeText : styles.directoryBadgeText]}>
                      {isPartner ? 'PARTNER • BOOKING' : 'DIRECTORY ONLY'}
                    </Text>
                  </View>
                </View>

                {/* Rating & Schedule Meta Row */}
                <View style={styles.metaRow}>
                  <View style={styles.ratingBadge}>
                    <Star color="#f59e0b" size={14} fill="#f59e0b" />
                    <Text style={styles.ratingText}>{(w.rating ?? 4.4).toFixed(1)}</Text>
                  </View>

                  <Text style={styles.metaDot}>•</Text>

                  <View style={[styles.statusTag, { backgroundColor: openStatus.isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                    <Text style={[styles.statusTagText, { color: openStatus.isOpen ? COLORS.success : COLORS.danger }]}>
                      {openStatus.statusText}
                    </Text>
                  </View>

                  <Text style={styles.metaDot}>•</Text>

                  <View style={styles.distBadge}>
                    <MapPin color={COLORS.primary} size={13} />
                    <Text style={styles.distText}>{w.district || 'Kulim, Kedah'}</Text>
                  </View>
                </View>

                {/* Card Action Buttons */}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => handleOpenDetails(w)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </TouchableOpacity>

                  {isPartner ? (
                    <TouchableOpacity
                      style={styles.bookServiceBtn}
                      onPress={() => handleBookNow(w)}
                      activeOpacity={0.8}
                    >
                      <Calendar color="#FFFFFF" size={14} />
                      <Text style={styles.bookServiceText}>Book Service</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.disabledBookBox}>
                      <Text style={styles.disabledBookText}>Booking Unavailable</Text>
                    </View>
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
    paddingVertical: 8,
    gap: 8,
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
  },
  filterChip: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterChip: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  activeFilterChipText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  workshopCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  partnerWorkshopCard: {
    borderColor: 'rgba(255, 107, 0, 0.4)',
    backgroundColor: 'rgba(255, 107, 0, 0.03)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  workshopName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  addressText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  partnerBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: COLORS.primary,
  },
  directoryBadge: {
    backgroundColor: 'rgba(113, 113, 122, 0.15)',
    borderColor: COLORS.border,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  partnerBadgeText: {
    color: COLORS.primary,
  },
  directoryBadgeText: {
    color: COLORS.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  metaDot: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  viewDetailsBtn: {
    flex: 1,
    backgroundColor: COLORS.cards,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewDetailsText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  bookServiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: 10,
  },
  bookServiceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  disabledBookBox: {
    flex: 1,
    backgroundColor: COLORS.secondaryBackground,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabledBookText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
