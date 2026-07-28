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
import { Search, MapPin, Star, Wrench, ChevronRight } from 'lucide-react-native';
import { getWorkshops } from '../../services/workshopService';
import type { Workshop } from '../../types/database';

export default function CustomerWorkshopsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkshops = async () => {
    try {
      setLoading(true);
      const data = await getWorkshops({ search: search.trim() });
      setWorkshops(data ?? []);
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
  }, [search]);

  const handleOpenDetails = (w: Workshop) => {
    router.push({
      pathname: '/(customer)/workshop-details',
      params: {
        id: w.id,
        name: w.name,
        rating: (w.rating ?? 4.8).toString(),
        address: `${w.address || ''}${w.district ? ', ' + w.district : ''}`,
        phone: w.phone || 'N/A',
        isOpen: w.is_open ? 'true' : 'false',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Find Workshops" subtitle="Certified Nearby Motorcycle Workshops" />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search color={COLORS.textMuted} size={18} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search workshops, address, district..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>WORKSHOPS NEARBY</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : workshops.length === 0 ? (
          <View style={styles.emptyBox}>
            <Wrench color={COLORS.textMuted} size={36} />
            <Text style={styles.emptyTitle}>No Workshops Found</Text>
            <Text style={styles.emptyDesc}>
              {search ? 'No workshops matched your search.' : 'No active workshops registered.'}
            </Text>
          </View>
        ) : (
          workshops.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={styles.workshopCard}
              activeOpacity={0.8}
              onPress={() => handleOpenDetails(w)}
            >
              <View style={styles.iconBox}>
                <Wrench color={COLORS.primary} size={24} />
              </View>

              <View style={styles.infoCol}>
                <View style={styles.titleRow}>
                  <Text style={styles.workshopName}>{w.name}</Text>
                  <View
                    style={[
                      styles.statusTag,
                      { backgroundColor: w.is_open ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' },
                    ]}
                  >
                    <Text style={[styles.statusTagText, { color: w.is_open ? COLORS.success : COLORS.danger }]}>
                      {w.is_open ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.addressText}>{w.address}{w.district ? `, ${w.district}` : ''}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.ratingBadge}>
                    <Star color="#f59e0b" size={14} fill="#f59e0b" />
                    <Text style={styles.ratingText}>{(w.rating ?? 5.0).toFixed(1)}</Text>
                  </View>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.distBadge}>
                    <MapPin color={COLORS.primary} size={14} />
                    <Text style={styles.distText}>{w.district || w.state || 'Malaysia'}</Text>
                  </View>
                </View>
              </View>

              <ChevronRight color={COLORS.textMuted} size={20} />
            </TouchableOpacity>
          ))
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
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  infoCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  workshopName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
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
  },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
