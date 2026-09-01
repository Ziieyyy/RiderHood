import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppThemeColors } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';
import { ResponsiveModal } from '../../components/responsive/ResponsiveModal';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import {
  Bike,
  Plus,
  Trash2,
  Eye,
  Gauge,
  Zap,
  Disc,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getMotorcycles, deleteMotorcycle, updateMotorcycle } from '../../services/motorcycleService';
import { calculateHealthScore } from '../../services/maintenanceService';
import { uploadPhotoUriToStorage } from '../../services/photoService';
import type { Motorcycle } from '../../types/database';
import { useTranslation } from '../../i18n';

export default function MyGarageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { contentPadding } = useResponsive();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [healthScores, setHealthScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [editingBike, setEditingBike] = useState<Motorcycle | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editMileage, setEditMileage] = useState('');
  const [editEngineCc, setEditEngineCc] = useState('');
  const [editFuelType, setEditFuelType] = useState('');
  const [editTransmission, setEditTransmission] = useState('');
  const [editEngineOil, setEditEngineOil] = useState('');
  const [editFrontTyre, setEditFrontTyre] = useState('');
  const [editRearTyre, setEditRearTyre] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');

  const fetchGarage = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getMotorcycles(user.id);
      setBikes(data);

      const scores: Record<string, number> = {};
      for (const b of data) {
        scores[b.id] = await calculateHealthScore(b.id);
      }
      setHealthScores(scores);
    } catch (err) {
      console.log('Error fetching garage:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGarage();
  }, [fetchGarage]);

  const handleSaveEdit = async () => {
    if (!editingBike) return;
    if (!editBrand.trim() || !editModel.trim() || !editPlate.trim()) {
      Alert.alert(t('errors.invalidForm'), t('auth.fillAllFields'));
      return;
    }

    setSavingEdit(true);
    try {
      const yr = parseInt(editYear, 10) || editingBike.year || new Date().getFullYear();
      const odo = parseInt(editMileage, 10) || editingBike.current_mileage || 0;
      const cc = parseInt(editEngineCc, 10) || null;

      let finalPhotoUrl = editPhotoUrl ? editPhotoUrl.trim() : null;
      if (finalPhotoUrl && user?.id && (finalPhotoUrl.startsWith('blob:') || finalPhotoUrl.startsWith('file:') || finalPhotoUrl.startsWith('data:'))) {
        try {
          finalPhotoUrl = await uploadPhotoUriToStorage(user.id, 'motorcycles', finalPhotoUrl);
        } catch (photoErr) {
          console.warn('Storage upload notice for motorcycle edit (non-fatal):', photoErr);
        }
      }

      const updated = await updateMotorcycle(editingBike.id, {
        nickname: editNickname.trim() || `${editBrand} ${editModel}`,
        brand: editBrand.trim(),
        model: editModel.trim(),
        year: yr,
        plate_number: editPlate.trim().toUpperCase(),
        current_mileage: odo,
        engine_cc: cc,
        fuel_type: editFuelType.trim() || null,
        transmission: editTransmission.trim() || null,
        engine_oil_type: editEngineOil.trim() || null,
        front_tyre_size: editFrontTyre.trim() || null,
        rear_tyre_size: editRearTyre.trim() || null,
        photo_url: finalPhotoUrl || null,
      });

      if (updated) {
        setBikes((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        setEditingBike(null);
        Alert.alert(t('common.success'), t('motorcycle.edit'));
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('errors.updateFailed'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = (bikeId: string, name: string) => {
    Alert.alert(
      t('dialogs.deleteMotorcycleTitle'),
      t('dialogs.deleteMotorcycleMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMotorcycle(bikeId);
              setBikes((prev) => prev.filter((b) => b.id !== bikeId));
              Alert.alert(t('common.success'), t('common.success'));
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || t('errors.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('motorcycle.garage')}
        subtitle={`${bikes.length} ${t('navigation.garage')}`}
        rightElement={
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => router.push('/(customer)/setup-motorcycle')}
            activeOpacity={0.8}
          >
            <Plus color={colors.primary} size={16} />
            <Text style={styles.addBtnText}>{t('motorcycle.registerNew')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchGarage();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <ResponsiveContainer>
          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
          ) : bikes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Bike color={colors.textMuted} size={56} />
              <Text style={styles.emptyTitle}>{t('empty.noMotorcycles').toUpperCase()}</Text>
              <Text style={styles.emptySub}>{t('empty.noMotorcyclesSub')}</Text>
              <CustomButton
                title={`+ ${t('motorcycle.registerNew')}`}
                onPress={() => router.push('/(customer)/setup-motorcycle')}
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {bikes.map((bike, index) => {
                const score = healthScores[bike.id] ?? 90;
                const isHealthy = score >= 80;
                const isPrimary = index === 0;

                return (
                  <View key={bike.id} style={styles.bikeCard}>
                    {/* HEADER & IMAGE */}
                    <View style={styles.bikeCardHeader}>
                      <View style={styles.bikePhotoPlaceholder}>
                        {bike.photo_url ? (
                          <Image
                            source={{ uri: bike.photo_url }}
                            style={{ width: '100%', height: '100%', borderRadius: 14 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Bike color={colors.primary} size={32} />
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.titleBadgeRow}>
                          <Text style={styles.bikeNickname} numberOfLines={1}>
                            {bike.nickname || `${bike.brand} ${bike.model}`}
                          </Text>
                          {isPrimary && (
                            <View style={styles.primaryTag}>
                              <Text style={styles.primaryTagText}>{t('motorcycle.primaryBadge').toUpperCase()}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.bikeModelSub} numberOfLines={1}>
                          {bike.brand} {bike.model} • {bike.year || '2024'}
                        </Text>
                        <Text style={styles.bikePlateText} numberOfLines={1}>
                          {t('motorcycle.plateNumber')}: {bike.plate_number}
                        </Text>
                      </View>
                    </View>

                    {/* DETAILED TECHNICAL METRICS BAR */}
                    <View style={styles.infoBar}>
                      <View style={styles.infoCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Gauge color={colors.primary} size={12} />
                          <Text style={styles.infoLabel} numberOfLines={1}>{t('motorcycle.currentOdometer').toUpperCase()}</Text>
                        </View>
                        <Text style={styles.infoVal} numberOfLines={1}>{bike.current_mileage.toLocaleString()} km</Text>
                      </View>

                      <View style={styles.infoCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Zap color={colors.primary} size={12} />
                          <Text style={styles.infoLabel} numberOfLines={1}>{t('motorcycle.engineOil').toUpperCase()}</Text>
                        </View>
                        <Text style={styles.infoVal} numberOfLines={1}>
                          {bike.engine_cc ? `${bike.engine_cc}cc` : 'N/A'} • {bike.engine_oil_type || '10W-40'}
                        </Text>
                      </View>

                      <View style={styles.infoCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Disc color={colors.primary} size={12} />
                          <Text style={styles.infoLabel} numberOfLines={1}>{t('motorcycle.tyreSize').toUpperCase()}</Text>
                        </View>
                        <Text style={styles.infoVal} numberOfLines={1}>
                          {bike.front_tyre_size ? bike.front_tyre_size.split('-')[0] : '90/80'} / {bike.rear_tyre_size ? bike.rear_tyre_size.split('-')[0] : '120/70'}
                        </Text>
                      </View>
                    </View>

                    {/* HEALTH SCORE ROW */}
                    <View style={styles.healthScoreRow}>
                      <View style={styles.healthRow}>
                        <View
                          style={[
                            styles.healthDot,
                            { backgroundColor: isHealthy ? colors.success : '#f59e0b' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.healthText,
                            { color: isHealthy ? colors.success : '#f59e0b' },
                          ]}
                        >
                          {isHealthy ? t('motorcycle.healthGood') : t('motorcycle.healthPoor')} ({score}%)
                        </Text>
                      </View>
                      <Text style={styles.healthDetailSub}>{t('common.telemetryLive')}</Text>
                    </View>

                    {/* CARD ACTIONS */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/(customer)/motorcycle/${bike.id}` as any)}
                        activeOpacity={0.8}
                      >
                        <Eye color={colors.textPrimary} size={14} />
                        <Text style={styles.actionBtnText}>{t('common.view')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.dangerBg }]}
                        onPress={() => handleDelete(bike.id, bike.nickname || bike.model)}
                        activeOpacity={0.8}
                      >
                        <Trash2 color={colors.danger} size={14} />
                        <Text style={[styles.actionBtnText, { color: colors.danger }]}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ResponsiveGrid>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* EDIT MOTORCYCLE MODAL */}
      <ResponsiveModal
        visible={!!editingBike}
        onClose={() => setEditingBike(null)}
        title={`✏️ ${t('motorcycle.edit')}`}
      >
        <View style={styles.modalInputGroup}>
          <Text style={styles.inputCategoryHeader}>{t('motorcycle.step1BasicInfo').toUpperCase()}</Text>
          <Text style={styles.inputLabel}>{t('motorcycle.nickname').toUpperCase()}</Text>
          <TextInput
            style={styles.modalInput}
            value={editNickname}
            onChangeText={setEditNickname}
            placeholder={t('motorcycle.nicknamePlaceholder')}
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.brand').toUpperCase()} *</Text>
              <TextInput
                style={styles.modalInput}
                value={editBrand}
                onChangeText={setEditBrand}
                placeholder={t('motorcycle.selectBrand')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.model').toUpperCase()} *</Text>
              <TextInput
                style={styles.modalInput}
                value={editModel}
                onChangeText={setEditModel}
                placeholder={t('motorcycle.selectModel')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.year').toUpperCase()}</Text>
              <TextInput
                style={styles.modalInput}
                value={editYear}
                onChangeText={setEditYear}
                placeholder={t('motorcycle.yearPlaceholder')}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.plateNumber').toUpperCase()} *</Text>
              <TextInput
                style={styles.modalInput}
                value={editPlate}
                onChangeText={setEditPlate}
                placeholder={t('motorcycle.plateNumberPlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <Text style={[styles.inputCategoryHeader, { marginTop: 12 }]}>{t('motorcycle.technicalInfo').toUpperCase()}</Text>
          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.engineCapacity').toUpperCase()}</Text>
              <TextInput
                style={styles.modalInput}
                value={editEngineCc}
                onChangeText={setEditEngineCc}
                placeholder="e.g. 155"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.currentOdometer').toUpperCase()}</Text>
              <TextInput
                style={styles.modalInput}
                value={editMileage}
                onChangeText={setEditMileage}
                placeholder="e.g. 28000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.fuelType').toUpperCase()}</Text>
              <TextInput
                style={styles.modalInput}
                value={editFuelType}
                onChangeText={setEditFuelType}
                placeholder={t('motorcycle.selectFuelType')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.transmission').toUpperCase()}</Text>
              <TextInput
                style={styles.modalInput}
                value={editTransmission}
                onChangeText={setEditTransmission}
                placeholder={t('motorcycle.selectTransmission')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>{t('motorcycle.engineOilGrade').toUpperCase()}</Text>
          <TextInput
            style={styles.modalInput}
            value={editEngineOil}
            onChangeText={setEditEngineOil}
            placeholder="e.g. Fully Synthetic 10W-40"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.frontTyreSize').toUpperCase()}</Text>
              <TextInput
                style={styles.modalInput}
                value={editFrontTyre}
                onChangeText={setEditFrontTyre}
                placeholder="e.g. 90/80-17"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('motorcycle.rearTyreSize').toUpperCase()}</Text>
              <TextInput
                style={styles.modalInput}
                value={editRearTyre}
                onChangeText={setEditRearTyre}
                placeholder="e.g. 120/70-17"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>{t('motorcycle.photoUrl').toUpperCase()}</Text>
          <TextInput
            style={styles.modalInput}
            value={editPhotoUrl}
            onChangeText={setEditPhotoUrl}
            placeholder="https://images.unsplash.com/..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.modalActionRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setEditingBike(null)}
            disabled={savingEdit}
          >
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveEdit}
            disabled={savingEdit}
          >
            {savingEdit ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ResponsiveModal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    addBtnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 107, 0, 0.3)' : 'rgba(255, 107, 0, 0.2)',
    },
    addBtnText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    scrollContent: {
      paddingVertical: 16,
      paddingBottom: 110,
      flexGrow: 1,
      backgroundColor: colors.background,
    },
    emptyCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 32,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 10,
      marginTop: 20,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    emptySub: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 320,
    },
    bikeCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
      width: '100%',
    },
    bikeCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    bikePhotoPlaceholder: {
      width: 68,
      height: 68,
      borderRadius: 14,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderHighlight,
    },
    titleBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    bikeNickname: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      flex: 1,
    },
    primaryTag: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 107, 0, 0.4)' : 'rgba(255, 107, 0, 0.25)',
    },
    primaryTagText: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '800',
    },
    bikeModelSub: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '500',
    },
    bikePlateText: {
      color: colors.primaryDim,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
    },
    infoBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'space-between',
    },
    infoCol: {
      flex: 1,
      gap: 2,
      paddingHorizontal: 4,
    },
    infoLabel: {
      color: colors.textMuted,
      fontSize: 9,
      fontWeight: '700',
    },
    infoVal: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '800',
    },
    healthScoreRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 2,
    },
    healthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    healthDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    healthText: {
      fontSize: 12,
      fontWeight: '800',
    },
    healthDetailSub: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    cardActionsRow: {
      flexDirection: 'row',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    modalInputGroup: {
      gap: 10,
    },
    inputCategoryHeader: {
      color: colors.primaryDim,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    inputLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    modalInput: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
      fontSize: 13,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    twoColRow: {
      flexDirection: 'row',
      gap: 10,
    },
    modalActionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 18,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    saveBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.primary,
      minWidth: 80,
      alignItems: 'center',
    },
    saveBtnText: {
      color: isDark ? '#000' : '#FFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });
