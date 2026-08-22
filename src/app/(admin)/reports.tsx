import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';
import { TrendingUp, Users, Building2, Calendar, Activity, Star } from 'lucide-react-native';
import { getPlatformStats } from '../../services/adminService';
import { useTranslation } from '../../i18n';

export default function AdminReportsScreen() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const data = await getPlatformStats();
      setStats(data);
    } catch (err) {
      console.log('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Compute breakdowns from stats data
  const activeUsers = stats?.users?.filter((u: any) => u.status === 'active').length ?? 0;
  const suspendedUsers = stats?.users?.filter((u: any) => u.status === 'suspended').length ?? 0;
  const approvedWorkshops = stats?.workshops?.filter((w: any) => w.verification_status === 'approved').length ?? 0;
  const pendingWorkshops = stats?.workshops?.filter((w: any) => w.verification_status === 'pending').length ?? 0;
  const completedBookings = stats?.bookings?.filter((b: any) => b.status === 'completed').length ?? 0;
  const pendingBookings = stats?.bookings?.filter((b: any) => b.status === 'pending').length ?? 0;
  const cancelledBookings = stats?.bookings?.filter((b: any) => b.status === 'cancelled').length ?? 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* Platform Overview */}
            <Text style={styles.sectionTitle}>{t('superAdmin.platformStatistics').toUpperCase()}</Text>
            <View style={styles.grid}>
              <View style={styles.statCard}>
                <Users color={COLORS.primary} size={24} />
                <Text style={styles.statValue}>{stats?.totalUsers ?? 0}</Text>
                <Text style={styles.statLabel}>{t('superAdmin.totalUsers')}</Text>
              </View>
              <View style={styles.statCard}>
                <Building2 color="#f59e0b" size={24} />
                <Text style={styles.statValue}>{stats?.totalWorkshops ?? 0}</Text>
                <Text style={styles.statLabel}>{t('superAdmin.totalWorkshops')}</Text>
              </View>
              <View style={styles.statCard}>
                <Calendar color={COLORS.success} size={24} />
                <Text style={styles.statValue}>{stats?.totalBookings ?? 0}</Text>
                <Text style={styles.statLabel}>{t('superAdmin.allBookings')}</Text>
              </View>
              <View style={styles.statCard}>
                <Activity color={COLORS.primary} size={24} />
                <Text style={styles.statValue}>{activeUsers}</Text>
                <Text style={styles.statLabel}>{t('superAdmin.activeUsers')}</Text>
              </View>
            </View>

            {/* User Breakdown */}
            <Text style={styles.sectionTitle}>{`${t('superAdmin.userManagement').toUpperCase()} ${t('common.status').toUpperCase()}`}</Text>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.breakdownLabel}>{t('common.active')}</Text>
                <Text style={styles.breakdownValue}>{activeUsers}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
                <Text style={styles.breakdownLabel}>{t('common.suspended')}</Text>
                <Text style={styles.breakdownValue}>{suspendedUsers}</Text>
              </View>
            </View>

            {/* Workshop Breakdown */}
            <Text style={styles.sectionTitle}>{`${t('navigation.workshops').toUpperCase()} ${t('common.status').toUpperCase()}`}</Text>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.breakdownLabel}>{t('superAdmin.approved')}</Text>
                <Text style={styles.breakdownValue}>{approvedWorkshops}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.breakdownLabel}>{t('superAdmin.pending')}</Text>
                <Text style={styles.breakdownValue}>{pendingWorkshops}</Text>
              </View>
            </View>

            {/* Booking Breakdown */}
            <Text style={styles.sectionTitle}>{`${t('navigation.bookings').toUpperCase()} ${t('common.status').toUpperCase()}`}</Text>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.breakdownLabel}>{t('booking.bookingCompleted')}</Text>
                <Text style={styles.breakdownValue}>{completedBookings}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.breakdownLabel}>{t('booking.pendingApproval')}</Text>
                <Text style={styles.breakdownValue}>{pendingBookings}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
                <Text style={styles.breakdownLabel}>{t('booking.bookingCancelled')}</Text>
                <Text style={styles.breakdownValue}>{cancelledBookings}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
});
