import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { DARK_COLORS } from '../../constants/theme';
import {
  TrendingUp,
  RefreshCw,
  Wrench,
  DollarSign,
  CheckCircle2,
  Package,
  Calendar,
  FileText,
  Percent,
} from 'lucide-react-native';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { getMyWorkshop } from '../../services/workshopService';
import {
  getWorkshopReports,
  WorkshopReportMetrics,
  ReportTimeframe,
} from '../../services/reportService';
import { exportReportToPdf } from '../../utils/reportPdfGenerator';
import { useTranslation } from '../../i18n';
import type { Workshop } from '../../types/database';

export default function WorkshopReportsScreen() {
  const { t, language } = useTranslation();
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time Period Filter
  const [timeRange, setTimeRange] = useState<ReportTimeframe>('30days');

  // Workshop & Report Data
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [report, setReport] = useState<WorkshopReportMetrics | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (!ws) {
        setLoading(false);
        return;
      }
      setWorkshop(ws);
      const data = await getWorkshopReports(ws.id, timeRange);
      setReport(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load report metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id, timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportReport = () => {
    if (!report) return;

    const isMalay = language.startsWith('ms');

    const rangeLabel =
      timeRange === '7days'
        ? isMalay
          ? '7 Hari Lepas'
          : 'Last 7 Days'
        : timeRange === '30days'
        ? isMalay
          ? '30 Hari Lepas'
          : 'Last 30 Days'
        : timeRange === '1year'
        ? isMalay
          ? 'Tahun Terkini (YTD)'
          : 'Year to Date'
        : isMalay
        ? 'Sepanjang Masa'
        : 'All Time';

    const success = exportReportToPdf({
      workshopName: workshop?.name || 'Wan Legacy Motor',
      workshopAddress: workshop?.address || 'Kulim, Kedah',
      workshopPhone: workshop?.phone || '',
      timeRangeLabel: rangeLabel,
      report,
      language,
    });

    if (!success) {
      Alert.alert(
        t('workshopAdmin.exportReport'),
        isMalay
          ? 'Laporan PDF sedia untuk dimuat turun / dicetak.'
          : 'PDF Report is ready for download / print.'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={colors.danger} size={40} />
        <Text style={styles.errorTitle}>{t('errors.genericTitle')}</Text>
        <Text style={styles.errorDesc}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalAllBookings =
    (report?.completedBookingsCount || 0) +
    (report?.pendingBookingsCount || 0) +
    (report?.cancelledBookingsCount || 0);

  const completionRate =
    totalAllBookings > 0
      ? ((report?.completedBookingsCount || 0) / totalAllBookings) * 100
      : 0;

  return (
    <View style={styles.screenContainer}>
      <WorkshopAdminHeader
        title={t('workshopAdmin.revenueAndReports')}
        subtitle={t('dashboard.revenue')}
      />

      {/* Time Range Filter Bar & Export PDF Button */}
      <View style={styles.topBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeChipsContainer}
        >
          {(
            [
              { id: '7days', label: '7 DAYS' },
              { id: '30days', label: '30 DAYS' },
              { id: '1year', label: 'YTD' },
              { id: 'all', label: t('common.all').toUpperCase() },
            ] as const
          ).map((item) => {
            const isSel = timeRange === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.rangeChip, isSel && styles.activeRangeChip]}
                onPress={() => setTimeRange(item.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.rangeChipText, isSel && styles.activeRangeChipText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.exportBtn} onPress={handleExportReport} activeOpacity={0.8}>
          <FileText color={isDark ? '#000000' : '#FFFFFF'} size={14} />
          <Text style={styles.exportText}>{t('workshopAdmin.exportReport')} (PDF)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Main Revenue Card */}
        <View style={styles.heroRevenueCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBox}>
              <TrendingUp color={colors.primary} size={22} />
            </View>
            <Text style={styles.heroLabel}>{t('dashboard.revenue').toUpperCase()}</Text>
          </View>
          <Text style={styles.heroVal}>
            RM {(report?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.heroSubText}>
            {report?.completedBookingsCount ?? 0} {t('booking.bookingCompleted')}
          </Text>
        </View>

        {/* 4 KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Calendar color={colors.primary} size={14} />
              <Text style={styles.kpiLabel}>{t('workshopAdmin.totalBookingsCount').toUpperCase()}</Text>
            </View>
            <Text style={styles.kpiValue}>{totalAllBookings}</Text>
            <Text style={styles.kpiSub}>{t('navigation.bookings')}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <CheckCircle2 color={colors.success} size={14} />
              <Text style={styles.kpiLabel}>{t('workshopAdmin.completedServices').toUpperCase()}</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.success }]}>
              {report?.completedBookingsCount ?? 0}
            </Text>
            <Text style={styles.kpiSub}>{t('booking.bookingCompleted')}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Percent color={colors.secondaryOrange} size={14} />
              <Text style={styles.kpiLabel}>{t('workshopAdmin.completedCount').toUpperCase()} %</Text>
            </View>
            <Text style={styles.kpiValue}>{completionRate.toFixed(1)}%</Text>
            <Text style={styles.kpiSub}>{t('common.status')}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <DollarSign color={colors.primary} size={14} />
              <Text style={styles.kpiLabel}>{t('workshopAdmin.totalAmount').toUpperCase()}</Text>
            </View>
            <Text style={styles.kpiValue}>
              RM {(report?.averageBookingValue ?? 0).toFixed(0)}
            </Text>
            <Text style={styles.kpiSub}>{t('common.price')}</Text>
          </View>
        </View>

        {/* Popular Services Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderLine}>
            <Wrench color={colors.primary} size={18} />
            <Text style={styles.sectionTitleText}>{t('workshopAdmin.manageServices').toUpperCase()}</Text>
          </View>

          {!report?.popularServices || report.popularServices.length === 0 ? (
            <Text style={styles.noneText}>No completed service package data available for this range.</Text>
          ) : (
            report.popularServices.map((svc: { service_name: string; count: number; revenue: number }, idx: number) => (
              <View key={svc.service_name} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {idx + 1}. {svc.service_name}
                  </Text>
                  <Text style={styles.itemSub}>{svc.count} {t('booking.bookingCompleted')}</Text>
                </View>
                <Text style={styles.itemRevenue}>RM {svc.revenue.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Inventory Parts Usage Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderLine}>
            <Package color={colors.primary} size={18} />
            <Text style={styles.sectionTitleText}>{t('workshopAdmin.manageSpareParts').toUpperCase()}</Text>
          </View>

          {!report?.inventoryUsage || report.inventoryUsage.length === 0 ? (
            <Text style={styles.noneText}>No inventory parts recorded for this period.</Text>
          ) : (
            report.inventoryUsage.map((part: { part_id: string; part_name: string; quantity_used: number; times_used: number }, idx: number) => (
              <View key={part.part_id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {idx + 1}. {part.part_name}
                  </Text>
                  <Text style={styles.itemSub}>{part.quantity_used} Units Consumed ({part.times_used} times)</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
    errorTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 8,
    },
    errorDesc: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    retryText: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontWeight: '800',
      fontSize: 13,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 6,
      gap: 10,
    },
    rangeChipsContainer: {
      gap: 6,
    },
    rangeChip: {
      backgroundColor: colors.cards,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeRangeChip: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)',
      borderColor: colors.primary,
    },
    rangeChipText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '800',
    },
    activeRangeChipText: {
      color: colors.primary,
    },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      height: 36,
      borderRadius: 10,
    },
    exportText: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
      gap: 16,
    },
    heroRevenueCard: {
      backgroundColor: colors.cards,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    heroIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    heroVal: {
      color: colors.primary,
      fontSize: 34,
      fontWeight: '900',
    },
    heroSubText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    kpiCard: {
      width: '48%',
      backgroundColor: colors.cards,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    kpiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    kpiLabel: {
      color: colors.textMuted,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    kpiValue: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
    },
    kpiSub: {
      color: colors.textSecondary,
      fontSize: 10,
    },
    sectionCard: {
      backgroundColor: colors.cards,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    sectionHeaderLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
    },
    sectionTitleText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    noneText: {
      color: colors.textMuted,
      fontSize: 12,
      fontStyle: 'italic',
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.secondaryBackground,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemName: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    itemSub: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    itemRevenue: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '900',
    },
  });
