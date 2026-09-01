import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, AppThemeColors } from '../../../constants/theme';
import { Header } from '../../../components/Header';
import { CustomButton } from '../../../components/CustomButton';
import {
  FileText,
  Download,
  Share2,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Bike,
  Wrench,
} from 'lucide-react-native';
import { getBooking } from '../../../services/bookingService';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import { AppLogo } from '../../../components/AppLogo';
import type { Booking } from '../../../types/database';
import { useTranslation } from '../../../i18n';

export default function CustomerInvoiceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBooking = useCallback(async () => {
    if (!id) return;
    try {
      const b = await getBooking(id);
      setBooking(b);
    } catch (err) {
      console.log('Error loading invoice:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleDownload = () => {
    Alert.alert(t('invoice.downloadInvoice'), `${t('invoice.invoiceNumber')} #${invoiceNo}`);
  };

  const handleShare = () => {
    Alert.alert(t('common.share'), t('common.share'));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('invoice.title')} showBack />
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('invoice.title')} showBack />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('errors.notFound').toUpperCase()}</Text>
          <CustomButton title={t('common.back').toUpperCase()} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const invoiceNo = `INV-${booking.id.substring(0, 8).toUpperCase()}`;
  const invoiceDate = new Date(booking.created_at || Date.now()).toLocaleDateString();
  const subtotal = Number(booking.total_amount || 0);
  const sstTax = subtotal * 0.06;
  const grandTotal = subtotal + sstTax;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('invoice.title')}
        subtitle={invoiceNo}
        showBack
        rightElement={
          <TouchableOpacity onPress={handleShare}>
            <Share2 color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Printable Receipt Paper Container */}
        <View style={styles.paperCard}>
          {/* Header & Logo */}
          <View style={styles.paperHeader}>
            <View style={styles.brandRow}>
              <AppLogo size={36} />
              <Text style={styles.brandTitle}>RIDERHOOD</Text>
            </View>
            <Text style={styles.brandTagline}>{t('invoice.title').toUpperCase()}</Text>

            <View style={styles.paidBadge}>
              <CheckCircle2 color={colors.success} size={12} />
              <Text style={styles.paidText}>{t('invoice.paid').toUpperCase()}</Text>
            </View>
          </View>

          {/* Dotted Divider */}
          <View style={styles.dottedDivider} />

          {/* Invoice Meta */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>{t('invoice.invoiceNumber').toUpperCase()}</Text>
              <Text style={styles.metaVal}>{invoiceNo}</Text>
            </View>

            <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.metaLabel}>{t('common.date').toUpperCase()}</Text>
              <Text style={styles.metaVal}>{invoiceDate}</Text>
            </View>
          </View>

          {/* Parties: Workshop & Rider */}
          <View style={styles.partiesGrid}>
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>{t('invoice.serviceProvider').toUpperCase()}</Text>
              <Text style={styles.partyVal}>{((booking.workshop as unknown as Record<string, any>)?.name as string) || 'RiderHood Partner Workshop'}</Text>
              <Text style={styles.partySub}>{((booking.workshop as unknown as Record<string, any>)?.address as string) || 'Kuala Lumpur, Malaysia'}</Text>
            </View>

            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>{t('invoice.billTo').toUpperCase()}</Text>
              <Text style={styles.partyVal}>{((booking.customer as unknown as Record<string, any>)?.full_name as string) || 'RiderHood Customer'}</Text>
              <Text style={styles.partySub}>
                {booking.motorcycle
                  ? `${(booking.motorcycle as any).make || (booking.motorcycle as any).brand || ''} ${(booking.motorcycle as any).model || ''} (${(booking.motorcycle as any).plate_number})`
                  : 'Motorcycle Service'}
              </Text>
            </View>
          </View>

          {/* Dotted Divider */}
          <View style={styles.dottedDivider} />

          {/* Items Table */}
          <Text style={styles.sectionHeading}>{t('booking.servicesList').toUpperCase()}</Text>

          <View style={styles.itemsTable}>
            {booking.booking_services && booking.booking_services.length > 0 ? (
              booking.booking_services.map((bs: any, idx: number) => (
                <View key={bs.id || idx} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{bs.service_name_snapshot || bs.service?.name || `Service Item #${idx + 1}`}</Text>
                    <Text style={styles.itemQty}>{t('invoice.qty')}: {bs.quantity || 1}</Text>
                  </View>
                  <Text style={styles.itemPrice}>RM {Number(bs.price_snapshot || bs.price || 0).toFixed(2)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>General Motorcycle Maintenance Service</Text>
                  <Text style={styles.itemQty}>{t('invoice.qty')}: 1</Text>
                </View>
                <Text style={styles.itemPrice}>RM {subtotal.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Dotted Divider */}
          <View style={styles.dottedDivider} />

          {/* Summary Breakdown */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('invoice.subtotal')}</Text>
              <Text style={styles.summaryVal}>RM {subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>SST (6%)</Text>
              <Text style={styles.summaryVal}>RM {sstTax.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('help.paymentMethods')}</Text>
              <Text style={styles.summaryVal}>Online Payment / FPX</Text>
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t('invoice.grandTotal').toUpperCase()}</Text>
              <Text style={styles.totalVal}>RM {grandTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Dotted Divider */}
          <View style={styles.dottedDivider} />

          {/* Footer Receipt Note */}
          <View style={styles.receiptFooter}>
            <ShieldCheck color={colors.primary} size={14} />
            <Text style={styles.footerText}>{t('invoice.title')}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <CustomButton
            title={`📥 ${t('invoice.downloadInvoice').toUpperCase()}`}
            onPress={handleDownload}
            style={{ flex: 1 }}
          />
          <CustomButton
            title={`🖨️ ${t('invoice.printInvoice').toUpperCase()}`}
            onPress={handleDownload}
            variant="secondary"
            style={{ flex: 1 }}
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
      gap: 16,
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
    paperCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.primaryGlow,
      gap: 12,
    },
    paperHeader: {
      alignItems: 'center',
      gap: 4,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    invoiceLogoImg: {
      width: 28,
      height: 28,
    },
    logoBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    brandTitle: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: 1.5,
    },
    brandTagline: {
      color: colors.textMuted,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1,
    },
    paidBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.successBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.success,
      marginTop: 4,
    },
    paidText: {
      color: colors.success,
      fontSize: 9,
      fontWeight: '900',
    },
    dottedDivider: {
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: 4,
    },
    metaGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metaCol: {},
    metaLabel: {
      color: colors.textMuted,
      fontSize: 8,
      fontWeight: '800',
    },
    metaVal: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 2,
    },
    partiesGrid: {
      gap: 8,
      backgroundColor: colors.surface,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    partyBox: {},
    partyLabel: {
      color: colors.primary,
      fontSize: 8,
      fontWeight: '900',
    },
    partyVal: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    partySub: {
      color: colors.textSecondary,
      fontSize: 10,
    },
    sectionHeading: {
      color: colors.textMuted,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    itemsTable: {
      gap: 8,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemName: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    itemQty: {
      color: colors.textMuted,
      fontSize: 10,
    },
    itemPrice: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    summaryGrid: {
      gap: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryLabel: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    summaryVal: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '800',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    totalLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '900',
    },
    totalVal: {
      color: colors.primary,
      fontSize: 20,
      fontWeight: '900',
    },
    receiptFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 6,
    },
    footerText: {
      color: colors.textMuted,
      fontSize: 10,
      textAlign: 'center',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
  });
