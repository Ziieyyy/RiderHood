import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { DARK_COLORS } from '../../constants/theme';
import { Service } from '../../types/database';
import {
  Wrench,
  Plus,
  Edit2,
  Trash2,
  Clock,
  ChevronDown,
  Check,
  X,
  Search,
} from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import { getWorkshopServices, createService, getMyWorkshop } from '../../services/workshopService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { formatCategoryName } from '../../utils/categoryUtils';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';

const CATEGORIES = ['All', 'Engine', 'Brake', 'Oil & Fluid', 'Suspension', 'Electrical', 'General', 'Custom'];

const DURATION_OPTIONS = [
  { label: '15 min', value: '15' },
  { label: '30 min', value: '30' },
  { label: '45 min', value: '45' },
  { label: '60 min (1 hour)', value: '60' },
  { label: '90 min (1.5 hours)', value: '90' },
  { label: '120 min (2 hours)', value: '120' },
  { label: '180 min (3 hours)', value: '180' },
  { label: '240 min (4 hours)', value: '240' },
];

export default function WorkshopServicesScreen() {
  const { t, language } = useTranslation();
  const { profile } = useAuth();
  const { contentPadding } = useResponsive();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modals & Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadServices = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (ws) {
        const data = await getWorkshopServices(ws.id, { onlyAvailable: false });
        setServices(data);
      }
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleOpenAddModal = () => {
    setEditingService(null);
    setTitle('');
    setCategory('General');
    setPrice('');
    setDuration('30');
    setDescription('');
    setIsActive(true);
    setShowDurationPicker(false);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (srv: Service) => {
    setEditingService(srv);
    setTitle(srv.name || '');
    setCategory(srv.category || 'General');
    setPrice(srv.price !== undefined && srv.price !== null ? String(srv.price) : '');
    setDuration(srv.estimated_duration_minutes ? String(srv.estimated_duration_minutes) : '30');
    setDescription(srv.description || '');
    setIsActive(srv.is_available ?? true);
    setShowDurationPicker(false);
    setShowAddModal(true);
  };

  const handleToggleActiveStatus = async (srv: Service) => {
    const updatedStatus = !(srv.is_available ?? true);
    try {
      const { data, error } = await supabase
        .from('services')
        .update({ is_available: updatedStatus, updated_at: new Date().toISOString() })
        .eq('id', srv.id)
        .select()
        .single();
      if (error) throw error;
      setServices((prev) => prev.map((s) => (s.id === srv.id ? data : s)));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update service availability status.');
    }
  };

  const handleSaveService = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.required'), t('errors.requiredField'));
      return;
    }

    setSaving(true);
    try {
      const ws = await getMyWorkshop(profile?.id || '');
      if (!ws) throw new Error('No workshop available to associate this service.');

      const numericPrice = parseFloat(price) || 0;
      const numericDuration = parseInt(duration, 10) || 30;

      if (editingService) {
        const { data, error } = await supabase
          .from('services')
          .update({
            name: title.trim(),
            category,
            price: numericPrice,
            estimated_duration_minutes: numericDuration,
            description: description.trim() || null,
            is_available: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingService.id)
          .select()
          .single();

        if (error) throw error;
        setServices((prev) => prev.map((s) => (s.id === data.id ? data : s)));
        Alert.alert(t('common.success'), t('common.update'));
      } else {
        const newSrv = await createService({
          workshop_id: ws.id,
          name: title.trim(),
          category,
          price: numericPrice,
          estimated_duration_minutes: numericDuration,
          description: description.trim() || undefined,
          is_available: isActive,
        });
        setServices((prev) => [newSrv, ...prev]);
        Alert.alert(t('common.success'), t('workshopAdmin.addService'));
      }

      setShowAddModal(false);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (srv: Service) => {
    Alert.alert(
      t('dialogs.deleteServiceTitle'),
      t('dialogs.deleteServiceMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('services').delete().eq('id', srv.id);
              if (error) throw error;
              setServices((prev) => prev.filter((s) => s.id !== srv.id));
              Alert.alert(t('common.success'), t('common.delete'));
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || t('errors.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const filteredServices = services.filter((srv) => {
    if (selectedCategory !== 'All' && srv.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const n = (srv.name || '').toLowerCase();
      const d = (srv.description || '').toLowerCase();
      if (!n.includes(q) && !d.includes(q)) return false;
    }
    return true;
  });

  const selectedDurationObj = DURATION_OPTIONS.find((opt) => opt.value === duration) || {
    label: `${duration} mins`,
    value: duration,
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Service Catalog...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <WorkshopAdminHeader
        title={t('workshopAdmin.manageServices')}
        subtitle={`${services.length} ${t('workshopAdmin.services')}`}
      />

      {/* Top Header Actions & Search */}
      <View style={styles.topBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search color={colors.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color={colors.textMuted} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal} activeOpacity={0.8}>
          <Plus color={isDark ? '#000000' : '#FFFFFF'} size={16} />
          <Text style={styles.addBtnText}>{t('workshopAdmin.addService')}</Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs Scroll (Fixed Height Constraint) */}
      <View style={styles.categoryTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabsScroll}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSel && styles.activeCategoryChip]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, isSel && styles.activeCategoryChipText]}>
                  {formatCategoryName(cat, language)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Services List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadServices();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <ResponsiveContainer>
          {filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Wrench color={colors.textMuted} size={48} />
              <Text style={styles.emptyTitle}>{t('empty.noServices')}</Text>
              <Text style={styles.emptyDesc}>
                {t('empty.noServicesSub')}
              </Text>
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {filteredServices.map((srv) => {
                const isAct = srv.is_available ?? true;
                return (
                  <View key={srv.id} style={[styles.serviceCard, !isAct && styles.disabledCard]}>
                    {/* Card Top: Title, Status Badge, Tags & Price */}
                    <View style={styles.cardTop}>
                      <View style={styles.titleCol}>
                        <View style={styles.titleRow}>
                          <Text style={styles.srvTitle} numberOfLines={1}>{srv.name}</Text>
                          <View
                            style={[
                              styles.activeStatusChip,
                              {
                                backgroundColor: isAct
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(113, 113, 122, 0.15)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.activeStatusText,
                                { color: isAct ? colors.success : colors.textMuted },
                              ]}
                            >
                              {isAct ? t('common.active').toUpperCase() : t('common.inactive').toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.metaRow}>
                          <View style={styles.metaChip}>
                            <Clock color={colors.primary} size={11} />
                            <Text style={styles.metaText}>{srv.estimated_duration_minutes || 30} mins</Text>
                          </View>
                          <View style={styles.metaChip}>
                            <Wrench color={colors.textSecondary} size={11} />
                            <Text style={styles.metaText}>{formatCategoryName(srv.category || 'General', language)}</Text>
                          </View>
                        </View>
                      </View>

                      <Text style={styles.srvPrice}>RM {Number(srv.price || 0).toFixed(2)}</Text>
                    </View>

                    {/* Specification / Description */}
                    <Text style={styles.srvDesc} numberOfLines={2}>
                      {srv.description || `${t('services.specification')}: ${srv.name} • Genuine Workshop Service`}
                    </Text>

                    {/* Footer Actions */}
                    <View style={styles.cardActions}>
                      <View style={styles.toggleActiveContainer}>
                        <Text style={styles.toggleLabel}>{t('common.status')}:</Text>
                        <Switch
                          value={isAct}
                          onValueChange={() => handleToggleActiveStatus(srv)}
                          trackColor={{ false: colors.border, true: 'rgba(255, 107, 0, 0.45)' }}
                          thumbColor={isAct ? colors.primary : colors.textMuted}
                        />
                      </View>

                      <View style={styles.rightActionBtns}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleOpenEditModal(srv)}
                          activeOpacity={0.8}
                        >
                          <Edit2 color={colors.textSecondary} size={13} />
                          <Text style={styles.actionText}>{t('common.edit')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.deleteBtn]}
                          onPress={() => handleDelete(srv)}
                          activeOpacity={0.8}
                        >
                          <Trash2 color={colors.danger} size={13} />
                          <Text style={[styles.actionText, { color: colors.danger }]}>{t('common.delete')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ResponsiveGrid>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* Add / Edit Service Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? t('services.editService') : t('services.addService')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={colors.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('services.serviceName').toUpperCase()} *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Major Service & Valve Clearance"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('services.categoryLabel').toUpperCase()}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.miniCatChip, category === cat && styles.activeMiniCatChip]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.miniCatText, category === cat && styles.activeMiniCatText]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('common.price').toUpperCase()} (RM) *</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="e.g. 180"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              {/* ESTIMATED DURATION DROPDOWN */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('services.estDuration').toUpperCase()}</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setShowDurationPicker(!showDurationPicker)}
                  activeOpacity={0.8}
                >
                  <Clock color={colors.primary} size={16} />
                  <Text style={styles.dropdownTriggerText}>{selectedDurationObj.label}</Text>
                  <ChevronDown color={colors.textMuted} size={18} />
                </TouchableOpacity>
              </View>

              {showDurationPicker && (
                <View style={styles.dropdownContainer}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                    {DURATION_OPTIONS.map((opt) => {
                      const isSelected = duration === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.dropdownItem, isSelected && styles.selectedDropdownItem]}
                          onPress={() => {
                            setDuration(opt.value);
                            setShowDurationPicker(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isSelected && styles.selectedDropdownItemText]}>
                            {opt.label}
                          </Text>
                          {isSelected && <Check color={colors.primary} size={16} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DESCRIPTION & INCLUSIONS</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Details of maintenance items included in this package..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>

              <View style={styles.activeSwitchRow}>
                <Text style={styles.inputLabel}>ACTIVE IN CATALOG</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: colors.border, true: 'rgba(255, 107, 0, 0.5)' }}
                  thumbColor={isActive ? colors.primary : colors.textMuted}
                />
              </View>

              <CustomButton
                title={saving ? 'SAVING...' : editingService ? 'UPDATE SERVICE PACKAGE' : 'PUBLISH SERVICE PACKAGE'}
                onPress={handleSaveService}
                disabled={saving}
                style={{ marginTop: 8 }}
              />
              <CustomButton title="CANCEL" variant="secondary" onPress={() => setShowAddModal(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 12,
      backgroundColor: colors.background,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    topBarContainer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cards,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
      height: 42,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      height: 42,
      borderRadius: 12,
      justifyContent: 'center',
    },
    addBtnText: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    categoryTabsWrapper: {
      height: 44,
      marginBottom: 6,
    },
    categoryTabsScroll: {
      flexGrow: 0,
      height: 44,
    },
    categoryScroll: {
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: colors.cards,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activeCategoryChip: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)',
      borderColor: colors.primary,
    },
    categoryChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    activeCategoryChipText: {
      color: colors.primary,
      fontWeight: '800',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 14,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 64,
      gap: 10,
      backgroundColor: colors.cards,
      borderRadius: 18,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    emptyDesc: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      maxWidth: 280,
    },
    serviceCard: {
      backgroundColor: colors.cards,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
      justifyContent: 'space-between',
    },
    disabledCard: {
      opacity: 0.65,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    titleCol: {
      flex: 1,
      gap: 6,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    srvTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 20,
    },
    activeStatusChip: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    activeStatusText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.secondaryBackground,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
    },
    srvPrice: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'right',
      minWidth: 80,
    },
    srvDesc: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      minHeight: 32,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    toggleActiveContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    toggleLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    rightActionBtns: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.elevatedCards,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderHighlight,
    },
    deleteBtn: {
      borderColor: 'rgba(239, 68, 68, 0.3)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    actionText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.elevatedCards,
      borderRadius: 24,
      padding: 20,
      width: '100%',
      maxWidth: 480,
      borderWidth: 1,
      borderColor: colors.borderHighlight,
      maxHeight: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    input: {
      backgroundColor: colors.cards,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 13,
    },
    miniCatChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.cards,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeMiniCatChip: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    miniCatText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
    },
    activeMiniCatText: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontWeight: '800',
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cards,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    dropdownTriggerText: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    dropdownContainer: {
      backgroundColor: colors.cards,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      overflow: 'hidden',
      marginTop: 2,
    },
    dropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    selectedDropdownItem: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)',
    },
    dropdownItemText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    selectedDropdownItemText: {
      color: colors.primary,
      fontWeight: '800',
    },
    activeSwitchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
  });
