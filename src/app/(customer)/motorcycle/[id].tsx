import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../constants/theme';
import { Header } from '../../../components/Header';
import { CustomButton } from '../../../components/CustomButton';
import {
  Bike,
  Wrench,
  Clock,
  FileText,
  Trash2,
  Edit,
  Plus,
  Heart,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Gauge,
  CheckCircle2,
} from 'lucide-react-native';
import {
  getMotorcycle,
  updateMotorcycle,
  deleteMotorcycle,
} from '../../../services/motorcycleService';
import {
  getReminders,
  getMaintenanceRecords,
  calculateHealthScore,
  updateReminderStatus,
} from '../../../services/maintenanceService';
import { getCustomerDocuments } from '../../../services/documentService';
import { useAuth } from '../../../context/AuthContext';
import type {
  Motorcycle,
  MaintenanceReminder,
  MaintenanceRecord,
  Document as RiderDoc,
} from '../../../types/database';

export default function MotorcycleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [bike, setBike] = useState<Motorcycle | null>(null);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [documents, setDocuments] = useState<RiderDoc[]>([]);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MAINTENANCE' | 'HISTORY' | 'DOCUMENTS'>('OVERVIEW');

  const loadBikeDetails = useCallback(async () => {
    if (!id) return;
    try {
      const [m, rems, recs, score, docs] = await Promise.all([
        getMotorcycle(id),
        getReminders(id),
        getMaintenanceRecords(id),
        calculateHealthScore(id),
        user?.id ? getCustomerDocuments(user.id) : Promise.resolve([]),
      ]);

      setBike(m);
      setReminders(rems);
      setRecords(recs);
      setHealthScore(score);
      setDocuments(docs.filter((d: RiderDoc) => d.motorcycle_id === id));
    } catch (err) {
      console.log('Error loading bike details:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadBikeDetails();
  }, [loadBikeDetails]);

  const handleDeleteBike = () => {
    if (!bike) return;
    Alert.alert('Delete Motorcycle?', `Are you sure you want to remove ${bike.brand} ${bike.model} (${bike.plate_number}) from your garage?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMotorcycle(bike.id);
            Alert.alert('Deleted', 'Motorcycle removed from garage.');
            router.replace('/(customer)/garage');
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete motorcycle.');
          }
        },
      },
    ]);
  };

  const handleMarkCompleted = async (reminderId: string, title: string) => {
    try {
      await updateReminderStatus(reminderId, 'completed');
      setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, status: 'completed' } : r));
      Alert.alert('Completed', `${title} status updated.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update reminder.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Motorcycle Detail" showBack />
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!bike) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Motorcycle Detail" showBack />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>MOTORCYCLE NOT FOUND</Text>
          <CustomButton title="Back to Garage" onPress={() => router.replace('/(customer)/garage')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={bike.nickname || `${bike.brand} ${bike.model}`}
        subtitle={`${bike.plate_number} • ${bike.year || '2024'} model`}
        showBack
        rightElement={
          <TouchableOpacity style={styles.iconHeaderBtn} onPress={handleDeleteBike}>
            <Trash2 color={COLORS.danger} size={18} />
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['OVERVIEW', 'MAINTENANCE', 'HISTORY', 'DOCUMENTS'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, activeTab === t && styles.tabItemActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <>
            <View style={styles.card}>
              <View style={styles.bikeImagePlaceholder}>
                <Bike color={COLORS.primary} size={56} />
              </View>

              <View style={styles.healthScoreBanner}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreVal}>{healthScore}</Text>
                  <Text style={styles.scoreUnit}>/100</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.scoreTitle}>MOTORCYCLE HEALTH SCORE</Text>
                  <Text style={styles.scoreSub}>
                    {healthScore >= 80 ? 'Excellent condition. All service items current.' : 'Service required. Check maintenance tab.'}
                  </Text>
                </View>
              </View>

              <View style={styles.specsGrid}>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>BRAND & MODEL</Text>
                  <Text style={styles.specVal}>{bike.brand} {bike.model}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>PLATE NUMBER</Text>
                  <Text style={styles.specVal}>{bike.plate_number}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>ENGINE CAPACITY</Text>
                  <Text style={styles.specVal}>{bike.engine_cc ? `${bike.engine_cc} cc` : 'N/A'}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>CURRENT ODOMETER</Text>
                  <Text style={styles.specVal}>
                    {bike.current_mileage ? `${bike.current_mileage.toLocaleString()} km` : '0 km'}
                  </Text>
                </View>
              </View>
            </View>

            <CustomButton
              title="📅 BOOK WORKSHOP SERVICE"
              onPress={() => router.push('/(customer)/booking')}
            />
          </>
        )}

        {/* MAINTENANCE TAB */}
        {activeTab === 'MAINTENANCE' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SERVICE REMINDERS ({reminders.length})</Text>

            {reminders.length === 0 ? (
              <View style={styles.emptyCard}>
                <CheckCircle2 color={COLORS.success} size={40} />
                <Text style={styles.emptyTitle}>NO PENDING SERVICE</Text>
                <Text style={styles.emptySub}>All maintenance intervals are up to date.</Text>
              </View>
            ) : (
              reminders.map(rem => (
                <View key={rem.id} style={styles.remCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.remTitle}>{rem.title}</Text>
                    <Text style={styles.remSub}>
                      Target: {rem.next_service_mileage ? `${rem.next_service_mileage.toLocaleString()} km` : 'Scheduled'}
                    </Text>
                  </View>

                  {rem.status !== 'completed' && (
                    <TouchableOpacity
                      style={styles.doneBtn}
                      onPress={() => handleMarkCompleted(rem.id, rem.title)}
                    >
                      <Text style={styles.doneBtnText}>✓ DONE</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'HISTORY' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SERVICE HISTORY ({records.length})</Text>

            {records.length === 0 ? (
              <View style={styles.emptyCard}>
                <Clock color={COLORS.textMuted} size={40} />
                <Text style={styles.emptyTitle}>NO SERVICE RECORDS</Text>
                <Text style={styles.emptySub}>Book a service with a RiderHood partner workshop to build your digital service log.</Text>
              </View>
            ) : (
              records.map(rec => (
                <View key={rec.id} style={styles.remCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.remTitle}>{rec.description || 'Routine Maintenance'}</Text>
                    <Text style={styles.remSub}>
                      {rec.service_date} • {rec.mileage ? `${rec.mileage.toLocaleString()} km` : 'N/A'}
                    </Text>
                  </View>
                  <Text style={styles.costText}>RM {rec.total_cost ? Number(rec.total_cost).toFixed(2) : '0.00'}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'DOCUMENTS' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BIKE DOCUMENTS ({documents.length})</Text>

            {documents.length === 0 ? (
              <View style={styles.emptyCard}>
                <FileText color={COLORS.textMuted} size={40} />
                <Text style={styles.emptyTitle}>NO DOCUMENTS</Text>
                <Text style={styles.emptySub}>Upload road tax, grant, or insurance files in Documents Vault.</Text>
                <CustomButton title="Go to Documents Vault" onPress={() => router.push('/(customer)/documents')} />
              </View>
            ) : (
              documents.map(doc => (
                <View key={doc.id} style={styles.remCard}>
                  <FileText color={COLORS.primary} size={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.remTitle}>{doc.title}</Text>
                    <Text style={styles.remSub}>{doc.type.toUpperCase()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
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
  iconHeaderBtn: {
    padding: 8,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.dangerBg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  bikeImagePlaceholder: {
    height: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  healthScoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    gap: 12,
  },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  scoreVal: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  scoreUnit: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  scoreTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  scoreSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  specsGrid: {
    gap: 10,
  },
  specBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  specLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  specVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  remCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  remTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  remSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  doneBtn: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  doneBtnText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '900',
  },
  costText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
  },
});
