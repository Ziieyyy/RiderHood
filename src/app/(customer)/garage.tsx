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
  CheckCircle2,
  MoreVertical,
  ShieldCheck,
  Gauge,
  Wrench,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getMotorcycles, deleteMotorcycle } from '../../services/motorcycleService';
import { calculateHealthScore } from '../../services/maintenanceService';
import type { Motorcycle } from '../../types/database';

export default function MyGarageScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [healthScores, setHealthScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleDelete = (bikeId: string, name: string) => {
    Alert.alert(
      'Delete Motorcycle?',
      `Are you sure you want to remove ${name} from your garage? This may remove access to its future maintenance tracking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMotorcycle(bikeId);
              setBikes(prev => prev.filter(b => b.id !== bikeId));
              Alert.alert('Deleted', `${name} removed from garage.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete motorcycle.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="My Garage"
        subtitle="Manage your registered motorcycles & specs"
        rightElement={
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => router.push('/(customer)/setup-motorcycle')}
            activeOpacity={0.8}
          >
            <Plus color={COLORS.primary} size={16} />
            <Text style={styles.addBtnText}>+ Add Motorcycle</Text>
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
            <Text style={styles.emptyTitle}>NO MOTORCYCLES IN GARAGE</Text>
            <Text style={styles.emptySub}>
              Register your motorcycle to track service reminders, oil changes & digital documents.
            </Text>
            <CustomButton
              title="+ Register New Motorcycle"
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
                <View style={styles.bikeCardHeader}>
                  <View style={styles.bikePhotoPlaceholder}>
                    <Bike color={COLORS.primary} size={32} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.titleBadgeRow}>
                      <Text style={styles.bikeNickname}>{bike.nickname || `${bike.brand} ${bike.model}`}</Text>
                      {isPrimary && (
                        <View style={styles.primaryTag}>
                          <Text style={styles.primaryTagText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.bikeModelSub}>
                      {bike.brand} {bike.model} ({bike.year})
                    </Text>
                    <Text style={styles.bikePlateText}>Plate: {bike.plate_number}</Text>
                  </View>
                </View>

                <View style={styles.infoBar}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>ODOMETER</Text>
                    <Text style={styles.infoVal}>{bike.current_mileage.toLocaleString()} km</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>HEALTH</Text>
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
                        {isHealthy ? 'Healthy' : 'Needs Attention'} ({score}%)
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push(`/(customer)/motorcycle/${bike.id}` as any)}
                  >
                    <Eye color={COLORS.textPrimary} size={14} />
                    <Text style={styles.actionBtnText}>VIEW</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push('/(customer)/profile')}
                  >
                    <FileText color={COLORS.textPrimary} size={14} />
                    <Text style={styles.actionBtnText}>DOCUMENTS</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: COLORS.dangerBg }]}
                    onPress={() => handleDelete(bike.id, bike.nickname || bike.model)}
                  >
                    <Trash2 color={COLORS.danger} size={14} />
                    <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>DELETE</Text>
                  </TouchableOpacity>
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
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
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
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  infoVal: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
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
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
});
