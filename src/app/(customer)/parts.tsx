import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import {
  Search,
  CheckCircle2,
  Package,
  Layers,
  ArrowLeft,
  Calendar,
} from 'lucide-react-native';

interface PartItem {
  id: string;
  category: 'Tayar' | 'Minyak Hitam' | 'Chain & Sprocket';
  brand: string;
  name: string;
  specs: string;
  price: number;
  stock: boolean;
}

const PARTS_DATA: PartItem[] = [
  // Tayar
  {
    id: 'p1',
    category: 'Tayar',
    brand: 'Michelin',
    name: 'Michelin Pilot Street',
    specs: 'Saiz: 90/80-17 TL/TT',
    price: 150,
    stock: true,
  },
  {
    id: 'p2',
    category: 'Tayar',
    brand: 'Pirelli',
    name: 'Pirelli Diablo Rosso Sport',
    specs: 'Saiz: 100/80-17 TL',
    price: 180,
    stock: true,
  },
  {
    id: 'p3',
    category: 'Tayar',
    brand: 'IRC',
    name: 'IRC NR80 Racing',
    specs: 'Saiz: 70/90-17',
    price: 95,
    stock: true,
  },

  // Minyak Hitam
  {
    id: 'p4',
    category: 'Minyak Hitam',
    brand: 'Yamalube',
    name: 'Yamalube 4T 10W-40',
    specs: 'Semi Synthetic • 1.0 Litre',
    price: 35,
    stock: true,
  },
  {
    id: 'p5',
    category: 'Minyak Hitam',
    brand: 'Motul',
    name: 'Motul 7100 4T 10W-40',
    specs: '100% Fully Synthetic • 1.0 Litre',
    price: 58,
    stock: true,
  },
  {
    id: 'p6',
    category: 'Minyak Hitam',
    brand: 'Shell',
    name: 'Shell Advance AX7 10W-40',
    specs: 'Synthetic Technology • 1.0 Litre',
    price: 38,
    stock: true,
  },

  // Chain & Sprocket
  {
    id: 'p7',
    category: 'Chain & Sprocket',
    brand: 'DID',
    name: 'DID Heavy Duty Chain 428HD',
    specs: 'Saiz: 428 x 122L • Gold/Black',
    price: 120,
    stock: true,
  },
  {
    id: 'p8',
    category: 'Chain & Sprocket',
    brand: 'SSS',
    name: 'SSS Racing Sprocket Set',
    specs: 'Saiz: 428-39T Front/Rear Combo',
    price: 75,
    stock: true,
  },
  {
    id: 'p9',
    category: 'Chain & Sprocket',
    brand: 'RK',
    name: 'RK O-Ring Sealed Chain',
    specs: 'Saiz: 428 KLO x 132L',
    price: 145,
    stock: true,
  },
];

const CATEGORIES = ['All', 'Tayar', 'Minyak Hitam', 'Chain & Sprocket'];

export default function PartsInformationScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filteredParts = PARTS_DATA.filter((part) => {
    const matchesCategory =
      selectedCategory === 'All' || part.category === selectedCategory;
    const matchesSearch =
      part.name.toLowerCase().includes(search.toLowerCase()) ||
      part.brand.toLowerCase().includes(search.toLowerCase()) ||
      part.specs.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Parts Information" subtitle="Katalog Tayar, Minyak Hitam & Rantai" />

      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search color={COLORS.textMuted} size={18} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari Tayar, Yamalube, Motul, DID Chain..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredParts.map((part) => (
          <View key={part.id} style={styles.partCard}>
            <View style={styles.partIconBox}>
              <Package color={COLORS.primary} size={28} />
            </View>

            <View style={styles.partInfo}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandText}>{part.brand.toUpperCase()}</Text>
              </View>
              <Text style={styles.partName}>{part.name}</Text>
              <Text style={styles.partSpecs}>{part.specs}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.partPrice}>RM{part.price}</Text>
                <View style={styles.stockBadge}>
                  <CheckCircle2 color={COLORS.success} size={14} />
                  <Text style={styles.stockText}>Stock Available</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.bookPartBtn}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/(customer)/booking',
                  params: { preselectedPart: part.name },
                })
              }
            >
              <Calendar color={COLORS.primaryDark} size={16} />
              <Text style={styles.bookPartBtnText}>Book</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 46,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  chipsContainer: {
    marginBottom: 8,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  partCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  partIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  partInfo: {
    flex: 1,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  brandText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  partName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  partSpecs: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partPrice: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
  },
  bookPartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bookPartBtnText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
});
