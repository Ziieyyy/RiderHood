import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppThemeColors } from '../../../constants/theme';
import { Header } from '../../../components/Header';
import { CustomButton } from '../../../components/CustomButton';
import {
  Wrench,
} from 'lucide-react-native';
import { updateReminderStatus } from '../../../services/maintenanceService';
import { supabase } from '../../../lib/supabase';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import type { MaintenanceReminder } from '../../../types/database';
import { useTranslation } from '../../../i18n';

export default function MaintenanceDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [reminder, setReminder] = useState<MaintenanceReminder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReminder = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('maintenance_reminders')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setReminder(data);
    } catch (err) {
      console.log('Error loading reminder detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReminder();
  }, [loadReminder]);

  const handleMarkCompleted = async () => {
    if (!reminder) return;
    try {
      await updateReminderStatus(reminder.id, 'completed');
      Alert.alert(t('common.success'), t('maintenance.completed'));
      router.back();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Failed to update reminder');
    }
  };

  const handleBookService = () => {
    router.push({
      pathname: '/(customer)/booking',
      params: {
        motorcycleId: reminder?.motorcycle_id || undefined,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('navigation.maintenance')} showBack />
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!reminder) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('navigation.maintenance')} showBack />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('empty.noMaintenanceLogs').toUpperCase()}</Text>
          <CustomButton title={t('common.back').toUpperCase()} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = reminder.status === 'completed';
  const isOverdue = reminder.status === 'overdue';

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={reminder.title}
        subtitle={`${t('common.status').toUpperCase()}: ${reminder.status.toUpperCase()}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.titleRow}>
            <Wrench color={isCompleted ? colors.success : isOverdue ? colors.danger : colors.primary} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{reminder.title}</Text>
              <Text style={styles.itemCat}>{reminder.service_category || reminder.type || 'General Maintenance'}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isCompleted
                    ? colors.successBg
                    : isOverdue
                    ? colors.dangerBg
                    : isDark ? 'rgba(255,107,0,0.15)' : 'rgba(255,107,0,0.2)',
                  borderColor: isCompleted
                    ? colors.success
                    : isOverdue
                    ? colors.danger
                    : colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isCompleted
                      ? colors.success
                      : isOverdue
                      ? colors.danger
                      : colors.primary,
                  },
                ]}
              >
                {reminder.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {reminder.notes ? (
            <Text style={styles.notesText}>"{reminder.notes}"</Text>
          ) : null}
        </View>

        {/* Schedule & Milestones */}
        <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>{t('maintenance.nextService').toUpperCase()}</Text>

          {reminder.next_service_mileage ? (
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>{t('dashboard.currentMileage').toUpperCase()}</Text>
              <Text style={styles.metricVal}>{reminder.next_service_mileage.toLocaleString()} km</Text>
            </View>
          ) : null}

          {reminder.next_service_date ? (
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>{t('common.date').toUpperCase()}</Text>
              <Text style={styles.metricVal}>{reminder.next_service_date}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionColumn}>
          {!isCompleted && (
            <CustomButton
              title={`✓ ${t('workshopAdmin.complete').toUpperCase()}`}
              onPress={handleMarkCompleted}
              style={{ backgroundColor: colors.success }}
            />
          )}

          <CustomButton
            title={`📅 ${t('booking.bookAppointment').toUpperCase()}`}
            onPress={handleBookService}
            variant="secondary"
          />
        </View>
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
      gap: 14,
    },
    emptyCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    statusCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    itemTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    itemCat: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '900',
    },
    notesText: {
      color: colors.textMuted,
      fontSize: 12,
      fontStyle: 'italic',
    },
    detailCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    detailCardTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    metricLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    metricVal: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    actionColumn: {
      gap: 10,
      marginTop: 8,
    },
  });
