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
  Wrench,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  Gauge,
} from 'lucide-react-native';
import { updateReminderStatus } from '../../../services/maintenanceService';
import { supabase } from '../../../lib/supabase';
import type { MaintenanceReminder } from '../../../types/database';
import { useTranslation } from '../../../i18n';

export default function MaintenanceDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

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
      setReminder((prev: MaintenanceReminder | null) => (prev ? { ...prev, status: 'completed' } : null));
      Alert.alert(t('common.success'), t('maintenance.completed'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('errors.updateFailed'));
    }
  };

  const handleBookService = () => {
    router.push('/(customer)/booking');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Maintenance Item" showBack />
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!reminder) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('maintenance.title')} showBack />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('errors.notFound').toUpperCase()}</Text>
          <CustomButton title={t('navigation.maintenance')} onPress={() => router.replace('/(customer)/maintenance' as any)} />
        </View>
      </SafeAreaView>
    );
  }

  const isOverdue = reminder.status === 'overdue';
  const isDue = reminder.status === 'due';
  const isCompleted = reminder.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={reminder.title}
        subtitle={t('maintenance.subtitle')}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header */}
        <View style={styles.statusCard}>
          <View style={styles.titleRow}>
            <Wrench color={COLORS.primary} size={24} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{reminder.title}</Text>
              <Text style={styles.itemCat}>{t('maintenance.title')}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isOverdue ? COLORS.dangerBg : isDue ? '#fef3c7' : COLORS.successBg,
                  borderColor: isOverdue ? COLORS.danger : isDue ? '#f59e0b' : COLORS.success,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isOverdue ? COLORS.danger : isDue ? '#d97706' : COLORS.success },
                ]}
              >
                ● {reminder.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {reminder.notes ? <Text style={styles.notesText}>{reminder.notes}</Text> : null}
        </View>

        {/* Milestone Breakdown */}
        <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>{t('motorcycle.specs').toUpperCase()}</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t('maintenance.dueInKm').toUpperCase()}</Text>
            <Text style={[styles.metricVal, { color: COLORS.primary }]}>
              {reminder.next_service_mileage ? `${reminder.next_service_mileage.toLocaleString()} km` : 'Scheduled'}
            </Text>
          </View>

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
              style={{ backgroundColor: COLORS.success }}
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
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  statusCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  itemCat: {
    color: COLORS.textSecondary,
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
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  detailCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  detailCardTitle: {
    color: COLORS.textMuted,
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
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  metricVal: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  actionColumn: {
    gap: 10,
    marginTop: 8,
  },
});
