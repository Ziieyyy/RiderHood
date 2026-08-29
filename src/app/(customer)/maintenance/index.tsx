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
import { AppThemeColors } from '../../../constants/theme';
import { Header } from '../../../components/Header';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react-native';
import { getReminders } from '../../../services/maintenanceService';
import { getMotorcycles } from '../../../services/motorcycleService';
import { useAuth } from '../../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { MaintenanceReminder } from '../../../types/database';
import { useTranslation } from '../../../i18n';

export default function MaintenanceDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMaintenance = useCallback(async () => {
    if (!user) return;
    try {
      const userBikes = await getMotorcycles(user.id);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchMaintenance();
  };

  const overdueList = reminders.filter(r => r.status === 'overdue');
  const dueSoonList = reminders.filter(r => r.status === 'due');
  const upcomingList = reminders.filter(r => r.status === 'upcoming');

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('navigation.maintenance')}
        subtitle={`${reminders.length} Scheduled Service Items`}
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Summary Row */}
            <View style={styles.summaryBar}>
              <View style={[styles.summaryBox, { borderColor: colors.danger }]}>
                <Text style={[styles.summaryVal, { color: colors.danger }]}>{overdueList.length}</Text>
                <Text style={styles.summaryLabel}>{t('dashboard.serviceDue').toUpperCase()} 🔴</Text>
              </View>

              <View style={[styles.summaryBox, { borderColor: '#f59e0b' }]}>
                <Text style={[styles.summaryVal, { color: '#f59e0b' }]}>{dueSoonList.length}</Text>
                <Text style={styles.summaryLabel}>{t('dashboard.serviceDue').toUpperCase()} 🟠</Text>
              </View>

              <View style={[styles.summaryBox, { borderColor: colors.success }]}>
                <Text style={[styles.summaryVal, { color: colors.success }]}>{upcomingList.length}</Text>
                <Text style={styles.summaryLabel}>{t('dashboard.goodCondition').toUpperCase()} 🟢</Text>
              </View>
            </View>

            {/* Section 1: Overdue */}
            {overdueList.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.danger }]}>🔴 OVERDUE ({overdueList.length})</Text>
                {overdueList.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.remCard, { borderColor: colors.dangerBg }]}
                    onPress={() => router.push(`/(customer)/maintenance/${item.id}` as any)}
                  >
                    <View style={styles.iconBoxDanger}>
                      <AlertTriangle color={colors.danger} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.remTitle}>{item.title}</Text>
                      <Text style={styles.remSub}>
                        {item.next_service_mileage ? `Overdue by ${item.next_service_mileage} km` : 'Requires immediate service'}
                      </Text>
                    </View>
                    <ChevronRight color={colors.textMuted} size={16} />
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
                    <ChevronRight color={colors.textMuted} size={16} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Section 3: Upcoming */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.success }]}>🟢 UPCOMING ({upcomingList.length})</Text>

              {upcomingList.length === 0 && overdueList.length === 0 && dueSoonList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Wrench color={colors.textMuted} size={40} />
                  <Text style={styles.emptyTitle}>{t('dashboard.goodCondition').toUpperCase()}</Text>
                  <Text style={styles.emptySub}>{t('empty.noMaintenanceLogsSub')}</Text>
                </View>
              ) : (
                upcomingList.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.remCard}
                    onPress={() => router.push(`/(customer)/maintenance/${item.id}` as any)}
                  >
                    <View style={styles.iconBoxSuccess}>
                      <CheckCircle2 color={colors.success} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.remTitle}>{item.title}</Text>
                      <Text style={styles.remSub}>
                        Next service at {item.next_service_mileage ? `${item.next_service_mileage.toLocaleString()} km` : 'Scheduled'}
                      </Text>
                    </View>
                    <ChevronRight color={colors.textMuted} size={16} />
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

const createStyles = (colors: AppThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      backgroundColor: colors.surfaceContainer,
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
      color: colors.textMuted,
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
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    iconBoxDanger: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.dangerBg,
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
      backgroundColor: colors.successBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    remTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    remSub: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    emptyCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    emptySub: {
      color: colors.textSecondary,
      fontSize: 11,
    },
  });
