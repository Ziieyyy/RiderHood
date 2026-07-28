import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../../constants/theme';
import { Header } from '../../../components/Header';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Bike,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { getMotorcycles } from '../../../services/motorcycleService';
import { getReminders } from '../../../services/maintenanceService';
import type { MaintenanceReminder, Motorcycle } from '../../../types/database';

export default function MaintenanceDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMaintenance = useCallback(async () => {
    if (!user?.id) return;
    try {
      const userBikes = await getMotorcycles(user.id);
      setBikes(userBikes);

      const allReminders: MaintenanceReminder[] = [];
      for (const b of userBikes) {
        const rems = await getReminders(b.id);
        allReminders.push(...rems);
      }
      setReminders(allReminders);
    } catch (err) {
      console.log('Error loading maintenance dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMaintenance();
  }, [fetchMaintenance]);

  const overdueList = reminders.filter(r => r.status === 'overdue');
  const dueSoonList = reminders.filter(r => r.status === 'due');
  const upcomingList = reminders.filter(r => r.status === 'upcoming');

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Maintenance Schedule"
        subtitle="Track oil changes, brake pads, tyres & filters"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchMaintenance();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Summary Row */}
            <View style={styles.summaryBar}>
              <View style={[styles.summaryBox, { borderColor: COLORS.danger }]}>
                <Text style={[styles.summaryVal, { color: COLORS.danger }]}>{overdueList.length}</Text>
                <Text style={styles.summaryLabel}>OVERDUE 🔴</Text>
              </View>

              <View style={[styles.summaryBox, { borderColor: '#f59e0b' }]}>
                <Text style={[styles.summaryVal, { color: '#f59e0b' }]}>{dueSoonList.length}</Text>
                <Text style={styles.summaryLabel}>DUE SOON 🟠</Text>
              </View>

              <View style={[styles.summaryBox, { borderColor: COLORS.success }]}>
                <Text style={[styles.summaryVal, { color: COLORS.success }]}>{upcomingList.length}</Text>
                <Text style={styles.summaryLabel}>UPCOMING 🟢</Text>
              </View>
            </View>

            {/* Section 1: Overdue */}
            {overdueList.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>🔴 OVERDUE ({overdueList.length})</Text>
                {overdueList.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.remCard, { borderColor: COLORS.dangerBg }]}
                    onPress={() => router.push(`/(customer)/maintenance/${item.id}` as any)}
                  >
                    <View style={styles.iconBoxDanger}>
                      <AlertTriangle color={COLORS.danger} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.remTitle}>{item.title}</Text>
                      <Text style={styles.remSub}>
                        {item.next_service_mileage ? `Overdue by ${item.next_service_mileage} km` : 'Requires immediate service'}
                      </Text>
                    </View>
                    <ChevronRight color={COLORS.textMuted} size={16} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Section 2: Due Soon */}
            {dueSoonList.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>🟠 DUE SOON ({dueSoonList.length})</Text>
                {dueSoonList.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.remCard, { borderColor: '#fef3c7' }]}
                    onPress={() => router.push(`/(customer)/maintenance/${item.id}` as any)}
                  >
                    <View style={styles.iconBoxWarning}>
                      <Clock color="#d97706" size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.remTitle}>{item.title}</Text>
                      <Text style={styles.remSub}>
                        Due target: {item.next_service_mileage ? `${item.next_service_mileage.toLocaleString()} km` : 'Upcoming'}
                      </Text>
                    </View>
                    <ChevronRight color={COLORS.textMuted} size={16} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Section 3: Upcoming */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: COLORS.success }]}>🟢 UPCOMING ({upcomingList.length})</Text>

              {upcomingList.length === 0 && overdueList.length === 0 && dueSoonList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Wrench color={COLORS.textMuted} size={40} />
                  <Text style={styles.emptyTitle}>ALL SYSTEMS HEALTHY</Text>
                  <Text style={styles.emptySub}>No maintenance due. Ride safely!</Text>
                </View>
              ) : (
                upcomingList.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.remCard}
                    onPress={() => router.push(`/(customer)/maintenance/${item.id}` as any)}
                  >
                    <View style={styles.iconBoxSuccess}>
                      <CheckCircle2 color={COLORS.success} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.remTitle}>{item.title}</Text>
                      <Text style={styles.remSub}>
                        Next service at {item.next_service_mileage ? `${item.next_service_mileage.toLocaleString()} km` : 'Scheduled'}
                      </Text>
                    </View>
                    <ChevronRight color={COLORS.textMuted} size={16} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
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
    gap: 16,
  },
  summaryBar: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  remCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  iconBoxDanger: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxWarning: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxSuccess: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});
