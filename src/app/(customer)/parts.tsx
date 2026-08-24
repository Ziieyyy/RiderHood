import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';
import { ResponsiveModal } from '../../components/responsive/ResponsiveModal';
import { useResponsive } from '../../hooks/useResponsive';
import {
  Search,
  Calendar,
  Wrench,
  ChevronDown,
  X,
  Check,
  MapPin,
  Phone,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { getWorkshops, getWorkshopServices, canBookWorkshop } from '../../services/workshopService';
import { getCategoryFilterList, formatCategoryName, matchesCategoryFilter } from '../../utils/categoryUtils';
import type { Workshop, Service } from '../../types/database';

export default function ServicesCatalogScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, formatCurrency, language } = useTranslation();
  const { contentPadding } = useResponsive();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopFilter, setSelectedWorkshopFilter] = useState<Workshop | null>(null);
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const wsList = await getWorkshops();
        setWorkshops(wsList);

        if (selectedWorkshopFilter?.id) {
          const svcs = await getWorkshopServices(selectedWorkshopFilter.id);
          setServices(svcs);
        } else {
          const allServicesNested = await Promise.all(
            wsList.map((ws) => getWorkshopServices(ws.id).catch(() => []))
          );
          setServices(allServicesNested.flat());
        }
      } catch (err) {
        console.error('Error fetching workshop services:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedWorkshopFilter?.id]);

  const filteredServices = services.filter((svc) => {
    const matchesCategory = matchesCategoryFilter(svc.category, selectedCategory);
    const q = (search || '').toLowerCase();
    const nameMatch = (svc.name || '').toLowerCase().includes(q);
    const descMatch = (svc.description || '').toLowerCase().includes(q);
    const matchesSearch = nameMatch || descMatch;
    const matchesWorkshop =
      !selectedWorkshopFilter || svc.workshop_id === selectedWorkshopFilter.id;
    return matchesCategory && matchesSearch && matchesWorkshop;
  });

  const getWorkshopObj = (wsId: string) => {
    if (!wsId) return null;
    return workshops.find((w) => w.id?.toLowerCase() === wsId.toLowerCase()) || null;
  };

  const getWorkshopName = (wsId: string) => {
    if (!wsId) return 'RiderHood Workshop';
    const found = getWorkshopObj(wsId);
    return found ? found.name : 'RiderHood Workshop';
  };

  const handleBookService = (wsId: string, svcName?: string) => {
    const targetWs = getWorkshopObj(wsId);
    if (!targetWs || !canBookWorkshop(targetWs)) {
      if (targetWs?.phone) {
        Linking.openURL(`tel:${targetWs.phone.replace(/[^0-9+]/g, '')}`);
      }
      return;
    }
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
      <Header title={t('services.title')} subtitle={t('services.subtitle')} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Search & Workshop Filter Bar */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchInputWrapper}>
              <Search color={COLORS.textMuted} size={18} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search service name, package, CVT, Oil..."
                placeholderTextColor={COLORS.textMuted}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X color={COLORS.textMuted} size={16} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Workshop Filter Picker Trigger */}
            <TouchableOpacity
              style={styles.workshopFilterBtn}
              onPress={() => setShowWorkshopModal(true)}
              activeOpacity={0.8}
            >
              <MapPin color={COLORS.primary} size={15} />
              <Text style={styles.workshopFilterBtnText} numberOfLines={1}>
                {selectedWorkshopFilter ? selectedWorkshopFilter.name : 'All Workshops'}
              </Text>
              <ChevronDown color={COLORS.textMuted} size={14} />
            </TouchableOpacity>
          </View>

          {/* Category Pills Slider */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {getCategoryFilterList(language).map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Results Count Header */}
          <View style={styles.listHeaderRow}>
            <Text style={styles.resultsCount}>
              {filteredServices.length} {t('services.title').toUpperCase()}
            </Text>
            {(selectedCategory !== 'All' || search || selectedWorkshopFilter) && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory('All');
                  setSearch('');
                  setSelectedWorkshopFilter(null);
                }}
              >
                <Text style={styles.clearFilterText}>{t('common.all')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
          ) : filteredServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Wrench color={COLORS.textMuted} size={40} />
              <Text style={styles.emptyTitle}>No Workshop Services Found</Text>
              <Text style={styles.emptySub}>
                No active service packages match your filter criteria.
              </Text>
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {filteredServices.map((svc) => {
                const wsObj = getWorkshopObj(svc.workshop_id);
                const isBookable = canBookWorkshop(wsObj);

                return (
                  <View key={svc.id} style={styles.itemCard}>
                    <View style={styles.serviceIconBox}>
                      <Wrench color={COLORS.primary} size={24} />
                    </View>

                    <View style={styles.partInfo}>
                      <View style={styles.badgeRow}>
                        <View style={styles.brandBadge}>
                          <Text style={styles.brandText}>
                            {formatCategoryName(svc.category || 'SERVICE', language).toUpperCase()}
                          </Text>
                        </View>

                        <Text style={styles.workshopTag} numberOfLines={1}>
                          📍 {getWorkshopName(svc.workshop_id)}
                        </Text>
                      </View>

                      <Text style={styles.partName}>{svc.name}</Text>
                      {svc.description ? (
                        <Text style={styles.partSpecs} numberOfLines={2}>
                          {svc.description}
                        </Text>
                      ) : null}

                      <View style={styles.priceRow}>
                        <Text style={styles.partPrice}>RM {(svc.price || 0).toFixed(2)}</Text>
                        <Text style={styles.durationText}>
                          ⏱ ~{svc.estimated_duration_minutes || 30} mins
                        </Text>
                      </View>

                      {isBookable ? (
                        <TouchableOpacity
                          style={styles.bookServiceFullBtn}
                          activeOpacity={0.85}
                          onPress={() => handleBookService(svc.workshop_id, svc.name)}
                        >
                          <Calendar color="#FFFFFF" size={15} />
                          <Text style={styles.bookServiceFullBtnText}>BOOK SERVICE AT WAN LEGACY</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.callWorkshopBtn}
                          activeOpacity={0.85}
                          onPress={() =>
                            wsObj?.phone &&
                            Linking.openURL(`tel:${wsObj.phone.replace(/[^0-9+]/g, '')}`)
                          }
                        >
                          <Phone color={COLORS.textPrimary} size={14} />
                          <Text style={styles.callWorkshopBtnText}>
                            CALL WORKSHOP ({wsObj?.phone || 'CONTACT'})
                          </Text>
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

      {/* Workshop Filter Modal */}
      <ResponsiveModal
        visible={showWorkshopModal}
        onClose={() => setShowWorkshopModal(false)}
        title="Filter by Workshop"
      >
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            style={[
              styles.modalItem,
              selectedWorkshopFilter === null && styles.modalItemActive,
            ]}
            onPress={() => {
              setSelectedWorkshopFilter(null);
              setShowWorkshopModal(false);
            }}
          >
            <Text
              style={[
                styles.modalItemText,
                selectedWorkshopFilter === null && styles.modalItemTextActive,
              ]}
            >
              All 11 Workshops (Kulim Area)
            </Text>
            {selectedWorkshopFilter === null && <Check color={COLORS.primary} size={18} />}
          </TouchableOpacity>

          {workshops.map((ws) => {
            const isSelected = selectedWorkshopFilter?.id === ws.id;
            const isBookable = canBookWorkshop(ws);
            return (
              <TouchableOpacity
                key={ws.id}
                style={[styles.modalItem, isSelected && styles.modalItemActive]}
                onPress={() => {
                  setSelectedWorkshopFilter(ws);
                  setShowWorkshopModal(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modalItemText,
                      isSelected && styles.modalItemTextActive,
                    ]}
                  >
                    {ws.name}
                  </Text>
                  <Text style={styles.modalItemSub}>
                    {isBookable ? '⚡ Online Booking Partner' : '📁 Directory Listing'}
                  </Text>
                </View>
                {isSelected && <Check color={COLORS.primary} size={18} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ResponsiveModal>
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
  searchBarContainer: {
    marginBottom: 12,
    gap: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  workshopFilterBtnText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryScroll: {
    paddingVertical: 4,
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultsCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  clearFilterText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
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
  itemCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    width: '100%',
  },
  serviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  partInfo: {
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  brandText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  workshopTag: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  partName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  partSpecs: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  partPrice: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  durationText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  bookServiceFullBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  bookServiceFullBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  callWorkshopBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  callWorkshopBtnText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalItemActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderColor: COLORS.primary,
  },
  modalItemText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  modalItemTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  modalItemSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
