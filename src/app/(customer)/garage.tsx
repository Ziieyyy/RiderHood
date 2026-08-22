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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  Bike,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileText,
  X,
  Gauge,
  Zap,
  Disc,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getMotorcycles, deleteMotorcycle, updateMotorcycle } from '../../services/motorcycleService';
import { calculateHealthScore } from '../../services/maintenanceService';
import type { Motorcycle } from '../../types/database';
import { useTranslation } from '../../i18n';

export default function MyGarageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

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

  const openEditModal = (bike: Motorcycle) => {
    setEditingBike(bike);
    setEditNickname(bike.nickname || '');
    setEditBrand(bike.brand || '');
    setEditModel(bike.model || '');
    setEditYear(bike.year ? String(bike.year) : '');
    setEditPlate(bike.plate_number || '');
    setEditMileage(bike.current_mileage ? String(bike.current_mileage) : '');
    setEditEngineCc(bike.engine_cc ? String(bike.engine_cc) : '');
    setEditFuelType(bike.fuel_type || 'Petrol');
    setEditTransmission(bike.transmission || 'Manual');
    setEditEngineOil(bike.engine_oil_type || '10W-40');
    setEditFrontTyre(bike.front_tyre_size || '90/80-17');
    setEditRearTyre(bike.rear_tyre_size || '120/70-17');
    setEditPhotoUrl(bike.photo_url || '');
  };

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
        photo_url: editPhotoUrl.trim() || null,
      });

      setBikes(prev => prev.map(b => b.id === updated.id ? updated : b));
      setEditingBike(null);
      Alert.alert(t('common.success'), t('motorcycle.updateMotorcycle'));
    } catch (err: any) {
      Alert.alert(t('errors.updateFailed'), err?.message || t('errors.updateFailed'));
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
              setBikes(prev => prev.filter(b => b.id !== bikeId));
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
        subtitle={t('motorcycle.garage')}
        rightElement={
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => router.push('/(customer)/setup-motorcycle')}
            activeOpacity={0.8}
          >
            <Plus color={COLORS.primary} size={16} />
            <Text style={styles.addBtnText}>+ {t('motorcycle.registerNew')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchGarage();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
        ) : bikes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bike color={COLORS.textMuted} size={56} />
            <Text style={styles.emptyTitle}>{t('empty.noMotorcycles').toUpperCase()}</Text>
            <Text style={styles.emptySub}>
              {t('empty.noMotorcyclesSub')}
            </Text>
            <CustomButton
              title={`+ ${t('motorcycle.registerNew')}`}
              onPress={() => router.push('/(customer)/setup-motorcycle')}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          bikes.map((bike, index) => {
            const score = healthScores[bike.id] ?? 90;
            const isHealthy = score >= 80;
            const isPrimary = index === 0;

            return (
              <View key={bike.id} style={styles.bikeCard}>
                {/* HEADER & IMAGE */}
                <View style={styles.bikeCardHeader}>
                  <View style={styles.bikePhotoPlaceholder}>
                    {bike.photo_url ? (
                      <Image source={{ uri: bike.photo_url }} style={{ width: '100%', height: '100%', borderRadius: 14 }} resizeMode="cover" />
                    ) : (
                      <Bike color={COLORS.primary} size={32} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.titleBadgeRow}>
                      <Text style={styles.bikeNickname}>{bike.nickname || `${bike.brand} ${bike.model}`}</Text>
                      {isPrimary && (
                        <View style={styles.primaryTag}>
                          <Text style={styles.primaryTagText}>{t('motorcycle.primaryBadge').toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.bikeModelSub}>
                      {bike.brand} {bike.model} • {bike.year || '2024'}
                    </Text>
                    <Text style={styles.bikePlateText}>{t('motorcycle.plateNumber')}: {bike.plate_number}</Text>
                  </View>
                </View>

                {/* DETAILED TECHNICAL METRICS BAR */}
                <View style={styles.infoBar}>
                  <View style={styles.infoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Gauge color={COLORS.primary} size={12} />
                      <Text style={styles.infoLabel}>{t('motorcycle.currentOdometer').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.infoVal}>{bike.current_mileage.toLocaleString()} km</Text>
                  </View>

                  <View style={styles.infoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Zap color={COLORS.primary} size={12} />
                      <Text style={styles.infoLabel}>{t('motorcycle.engineOil').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.infoVal}>
                      {bike.engine_cc ? `${bike.engine_cc}cc` : 'N/A'} • {bike.engine_oil_type || '10W-40'}
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Disc color={COLORS.primary} size={12} />
                      <Text style={styles.infoLabel}>{t('motorcycle.tyreSize').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.infoVal}>
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
                        { backgroundColor: isHealthy ? COLORS.success : '#f59e0b' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.healthText,
                        { color: isHealthy ? COLORS.success : '#f59e0b' },
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
                  >
                    <Eye color={COLORS.textPrimary} size={14} />
                    <Text style={styles.actionBtnText}>{t('common.view')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: COLORS.dangerBg }]}
                    onPress={() => handleDelete(bike.id, bike.nickname || bike.model)}
                  >
                    <Trash2 color={COLORS.danger} size={14} />
                    <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* EDIT MOTORCYCLE MODAL */}
      <Modal
        visible={!!editingBike}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingBike(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>✏️ {t('motorcycle.edit')}</Text>
              <TouchableOpacity onPress={() => setEditingBike(null)}>
                <X color={COLORS.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.inputCategoryHeader}>{t('motorcycle.step1BasicInfo').toUpperCase()}</Text>
                <Text style={styles.inputLabel}>{t('motorcycle.nickname').toUpperCase()}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editNickname}
                  onChangeText={setEditNickname}
                  placeholder={t('motorcycle.nicknamePlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                />

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('motorcycle.brand').toUpperCase()} *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editBrand}
                      onChangeText={setEditBrand}
                      placeholder={t('motorcycle.selectBrand')}
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('motorcycle.model').toUpperCase()} *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editModel}
                      onChangeText={setEditModel}
                      placeholder={t('motorcycle.selectModel')}
                      placeholderTextColor={COLORS.textMuted}
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
                      placeholderTextColor={COLORS.textMuted}
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
                      placeholderTextColor={COLORS.textMuted}
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
                      placeholderTextColor={COLORS.textMuted}
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
                      placeholderTextColor={COLORS.textMuted}
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
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('motorcycle.transmission').toUpperCase()}</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editTransmission}
                      onChangeText={setEditTransmission}
                      placeholder={t('motorcycle.selectTransmission')}
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>{t('motorcycle.engineOilGrade').toUpperCase()}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editEngineOil}
                  onChangeText={setEditEngineOil}
                  placeholder="e.g. Fully Synthetic 10W-40"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Text style={[styles.inputCategoryHeader, { marginTop: 12 }]}>{t('motorcycle.tyreSize').toUpperCase()}</Text>
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('motorcycle.tyreFront').toUpperCase()}</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editFrontTyre}
                      onChangeText={setEditFrontTyre}
                      placeholder="e.g. 90/80-17"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('motorcycle.tyreRear').toUpperCase()}</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editRearTyre}
                      onChangeText={setEditRearTyre}
                      placeholder="e.g. 120/70-17"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                <Text style={[styles.inputCategoryHeader, { marginTop: 12 }]}>{t('motorcycle.photoAndDocs').toUpperCase()}</Text>
                <Text style={styles.inputLabel}>{t('motorcycle.photoUrl').toUpperCase()}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editPhotoUrl}
                  onChangeText={setEditPhotoUrl}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditingBike(null)}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <CustomButton
                title={savingEdit ? t('common.saving').toUpperCase() : t('common.save').toUpperCase()}
                onPress={handleSaveEdit}
                disabled={savingEdit}
                style={{ flex: 1 }}
              />
            </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  addBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
    gap: 12,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  bikeCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  bikeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bikePhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    overflow: 'hidden',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bikeNickname: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  primaryTag: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  primaryTagText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  bikeModelSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  bikePlateText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  infoBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  infoVal: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  healthScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontSize: 11,
    fontWeight: '800',
  },
  healthDetailSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: {
    color: COLORS.textPrimary,
    fontSize: 9,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  editModalCard: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  modalInputGroup: {
    gap: 10,
  },
  inputCategoryHeader: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
});
