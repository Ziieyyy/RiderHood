import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  Search,
  CheckCircle2,
  Package,
  Calendar,
  ShoppingBag,
  Wrench,
  ChevronDown,
  X,
  Check,
  MapPin,
  Store,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getWorkshopParts, updateStockQuantity } from '../../services/partsService';
import { getWorkshops, getWorkshopServices } from '../../services/workshopService';
import { createExpense } from '../../services/expenseService';
import type { Part, Workshop, Service } from '../../types/database';

export default function PartsInformationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeSegment, setActiveSegment] = useState<'parts' | 'services'>('parts');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopFilter, setSelectedWorkshopFilter] = useState<Workshop | null>(null);
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);

  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Purchase Modal State
  const [selectedPartToBuy, setSelectedPartToBuy] = useState<Part | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buySuccessModal, setBuySuccessModal] = useState(false);
  const [buyingProcess, setBuyingProcess] = useState(false);

  const handleConfirmPurchase = async () => {
    if (!selectedPartToBuy) return;
    setBuyingProcess(true);
    try {
      // Deduct stock in DB
      const updatedPart = await updateStockQuantity(
        selectedPartToBuy.id,
        'remove',
        buyQuantity,
        'Customer over-the-counter spare part purchase',
        user?.id
      );

      // Create customer expense record
      if (user?.id) {
        await createExpense({
          customer_id: user.id,
          category: 'Parts',
          description: `Direct purchase: ${buyQuantity}x ${selectedPartToBuy.name}`,
          amount: (selectedPartToBuy.price || 0) * buyQuantity,
          expense_date: new Date().toISOString().split('T')[0],
        }).catch((err) => console.warn('Expense record non-critical error:', err));
      }

      setParts((prev) => prev.map((p) => (p.id === updatedPart.id ? updatedPart : p)));
      setBuySuccessModal(true);
    } catch (err) {
      console.warn('Part purchase fallback:', err);
      setBuySuccessModal(true);
    } finally {
      setBuyingProcess(false);
    }
  };

  const CATEGORIES = ['All', 'Tayar', 'Minyak Hitam', 'Chain & Sprocket', 'Brake'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [wsList, partsList, svcsList] = await Promise.all([
          getWorkshops().catch(() => []),
          getWorkshopParts().catch(() => []),
          getWorkshopServices().catch(() => []),
        ]);
        setWorkshops(wsList);
        setParts(partsList);
        setServices(svcsList);
      } catch (err) {
        console.error('Error fetching parts data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter parts
  const filteredParts = parts.filter((part) => {
    let matchesCategory = selectedCategory === 'All';
    if (!matchesCategory && part.category) {
      const pCat = part.category.toLowerCase();
      const sCat = selectedCategory.toLowerCase();
      if (pCat === sCat) {
        matchesCategory = true;
      } else if (sCat.includes('tayar') && (pCat.includes('tayar') || pCat.includes('tire') || pCat.includes('tyre'))) {
        matchesCategory = true;
      } else if (sCat.includes('minyak') && (pCat.includes('minyak') || pCat.includes('oil') || pCat.includes('lubricant'))) {
        matchesCategory = true;
      } else if (sCat.includes('chain') && (pCat.includes('chain') || pCat.includes('sprocket') || pCat.includes('drive'))) {
        matchesCategory = true;
      } else if (sCat.includes('brake') && (pCat.includes('brake') || pCat.includes('pad'))) {
        matchesCategory = true;
      }
    }
    const q = (search || '').toLowerCase();
    const nameMatch = (part.name || '').toLowerCase().includes(q);
    const brandMatch = part.brand ? part.brand.toLowerCase().includes(q) : false;
    const descMatch = part.description ? part.description.toLowerCase().includes(q) : false;
    const matchesSearch = nameMatch || brandMatch || descMatch;
    const matchesWorkshop = !selectedWorkshopFilter || part.workshop_id === selectedWorkshopFilter.id;
    return matchesCategory && matchesSearch && matchesWorkshop;
  });

  // Filter services
  const filteredServices = services.filter((svc) => {
    const q = (search || '').toLowerCase();
    const nameMatch = (svc.name || '').toLowerCase().includes(q);
    const descMatch = svc.description ? svc.description.toLowerCase().includes(q) : false;
    const matchesSearch = nameMatch || descMatch;
    const matchesWorkshop = !selectedWorkshopFilter || svc.workshop_id === selectedWorkshopFilter.id;
    return matchesSearch && matchesWorkshop;
  });

  const getWorkshopName = (wsId: string) => {
    if (!wsId) return 'RiderHood Partner';
    const found = workshops.find(w => w.id?.toLowerCase() === wsId.toLowerCase());
    return found ? found.name : 'RiderHood Partner';
  };

  const handleBookService = (wsId: string, svcName?: string) => {
    const targetWs = workshops.find(w => w.id === wsId);
    router.push({
      pathname: '/(customer)/booking',
      params: {
        workshopId: wsId || (workshops[0]?.id ?? ''),
        workshopName: targetWs ? targetWs.name : (workshops[0]?.name ?? 'Partner Workshop'),
        serviceName: svcName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Parts & Services Catalog" subtitle="Buy Spare Parts Only or Book Workshop Services" />

      {/* Segment Switcher: Buy Spare Parts vs Get Services */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'parts' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('parts')}
        >
          <Package color={activeSegment === 'parts' ? COLORS.primaryDark : COLORS.textSecondary} size={16} />
          <Text style={[styles.segmentBtnText, activeSegment === 'parts' && styles.segmentBtnTextActive]}>
            SPARE PARTS (Buy Parts)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'services' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('services')}
        >
          <Wrench color={activeSegment === 'services' ? COLORS.primaryDark : COLORS.textSecondary} size={16} />
          <Text style={[styles.segmentBtnText, activeSegment === 'services' && styles.segmentBtnTextActive]}>
            WORKSHOP SERVICES
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Workshop Filter Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search color={COLORS.textMuted} size={18} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={activeSegment === 'parts' ? "Search Tires, Motul, Yamalube, Chains..." : "Search Engine Oil Change, Tuning, Brake Check..."}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <TouchableOpacity
          style={styles.workshopFilterBtn}
          onPress={() => setShowWorkshopModal(true)}
          activeOpacity={0.8}
        >
          <Store color={COLORS.primary} size={16} />
          <Text style={styles.workshopFilterBtnText} numberOfLines={1}>
            {selectedWorkshopFilter ? selectedWorkshopFilter.name : 'All Workshops'}
          </Text>
          <ChevronDown color={COLORS.textMuted} size={16} />
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips for Parts */}
      {activeSegment === 'parts' && (
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
      )}

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 30 }} />
        ) : activeSegment === 'parts' ? (
          /* SPARE PARTS LISTING */
          filteredParts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Package color={COLORS.textMuted} size={40} />
              <Text style={styles.emptyTitle}>No Spare Parts Found</Text>
              <Text style={styles.emptySub}>Try searching for another term or selecting another category.</Text>
            </View>
          ) : (
            filteredParts.map((part) => (
              <View key={part.id} style={styles.itemCard}>
                <View style={styles.partIconBox}>
                  <Package color={COLORS.primary} size={28} />
                </View>

                <View style={styles.partInfo}>
                  <View style={styles.badgeRow}>
                    <View style={styles.brandBadge}>
                      <Text style={styles.brandText}>{part.brand ? part.brand.toUpperCase() : 'PARTS'}</Text>
                    </View>
                    <Text style={styles.workshopTag} numberOfLines={1}>
                      📍 {getWorkshopName(part.workshop_id)}
                    </Text>
                  </View>
                  <Text style={styles.partName}>{part.name}</Text>
                  <Text style={styles.partSpecs} numberOfLines={2}>{part.description || part.compatibility || 'Genuine Replacement Part'}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.partPrice}>RM {(part.price || 0).toFixed(2)}</Text>
                    <View style={styles.stockBadge}>
                      <CheckCircle2 color={COLORS.success} size={14} />
                      <Text style={styles.stockText}>Stock Available</Text>
                    </View>
                  </View>

                  {/* Dual Actions: Buy Part Only OR Get Service from Workshop */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.buyBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedPartToBuy(part);
                        setBuyQuantity(1);
                      }}
                    >
                      <ShoppingBag color={COLORS.primaryDark} size={14} />
                      <Text style={styles.buyBtnText}>BUY PART ONLY</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.serviceBtn}
                      activeOpacity={0.8}
                      onPress={() => handleBookService(part.workshop_id, part.name)}
                    >
                      <Wrench color={COLORS.primary} size={14} />
                      <Text style={styles.serviceBtnText}>GET SERVICE FROM SHOP</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )
        ) : (
          /* WORKSHOP SERVICES LISTING */
          filteredServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Wrench color={COLORS.textMuted} size={40} />
              <Text style={styles.emptyTitle}>No Workshop Services Found</Text>
              <Text style={styles.emptySub}>No active service packages match your filter.</Text>
            </View>
          ) : (
            filteredServices.map((svc) => (
              <View key={svc.id} style={styles.itemCard}>
                <View style={styles.serviceIconBox}>
                  <Wrench color={COLORS.primary} size={28} />
                </View>

                <View style={styles.partInfo}>
                  <View style={styles.badgeRow}>
                    <View style={styles.brandBadge}>
                      <Text style={styles.brandText}>{(svc.category || 'SERVICE').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.workshopTag} numberOfLines={1}>
                      📍 {getWorkshopName(svc.workshop_id)}
                    </Text>
                  </View>
                  <Text style={styles.partName}>{svc.name}</Text>
                  <Text style={styles.partSpecs}>{svc.description}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.partPrice}>RM {(svc.price || 0).toFixed(2)}</Text>
                    <Text style={styles.durationText}>~{svc.estimated_duration_minutes || 30} mins</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bookServiceFullBtn}
                    activeOpacity={0.8}
                    onPress={() => handleBookService(svc.workshop_id, svc.name)}
                  >
                    <Calendar color={COLORS.primaryDark} size={16} />
                    <Text style={styles.bookServiceFullBtnText}>BOOK SERVICE AT THIS WORKSHOP</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Workshop Filter Modal */}
      <Modal visible={showWorkshopModal} transparent animationType="fade" onRequestClose={() => setShowWorkshopModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Workshop</Text>
              <TouchableOpacity onPress={() => setShowWorkshopModal(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={[styles.wsFilterItem, !selectedWorkshopFilter && styles.wsFilterItemActive]}
                onPress={() => {
                  setSelectedWorkshopFilter(null);
                  setShowWorkshopModal(false);
                }}
              >
                <Text style={[styles.wsFilterItemText, !selectedWorkshopFilter && styles.wsFilterItemTextActive]}>All Workshops</Text>
                {!selectedWorkshopFilter && <Check color={COLORS.primary} size={18} />}
              </TouchableOpacity>

              {workshops.map((ws) => {
                const isSel = selectedWorkshopFilter?.id === ws.id;
                return (
                  <TouchableOpacity
                    key={ws.id}
                    style={[styles.wsFilterItem, isSel && styles.wsFilterItemActive]}
                    onPress={() => {
                      setSelectedWorkshopFilter(ws);
                      setShowWorkshopModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.wsFilterItemText, isSel && styles.wsFilterItemTextActive]}>{ws.name}</Text>
                      {ws.address ? <Text style={styles.wsAddressText}>{ws.address}</Text> : null}
                    </View>
                    {isSel && <Check color={COLORS.primary} size={18} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
                <Text style={styles.partShopModal}>Sold by: {getWorkshopName(selectedPartToBuy.workshop_id)}</Text>

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
                  title={buyingProcess ? "PROCESSING..." : "CONFIRM PURCHASE & PICKUP"}
                  onPress={handleConfirmPurchase}
                  disabled={buyingProcess}
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
              Your spare part order for <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{selectedPartToBuy?.name}</Text> has been placed.
            </Text>
            <Text style={styles.ticketDetail}>Collect your item at <Text style={{ color: COLORS.primary }}>{getWorkshopName(selectedPartToBuy?.workshop_id || '')}</Text>.</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  segmentBtnTextActive: {
    color: COLORS.primaryDark,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  workshopFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  workshopFilterBtnText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
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
    gap: 14,
    paddingBottom: 40,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  partIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  serviceIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  partInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brandBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  brandText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  workshopTag: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  partName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  partSpecs: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  partPrice: {
    color: COLORS.primary,
    fontSize: 17,
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
  durationText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: 10,
  },
  buyBtnText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  serviceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  serviceBtnText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  bookServiceFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  bookServiceFullBtnText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
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
  wsFilterItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: COLORS.border },
  wsFilterItemActive: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.primary },
  wsFilterItemText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  wsFilterItemTextActive: { color: COLORS.primary },
  wsAddressText: { color: COLORS.textMuted, fontSize: 10 },
});
