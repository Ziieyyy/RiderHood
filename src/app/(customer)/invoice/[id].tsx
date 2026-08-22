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
import type { Booking } from '../../../types/database';
import { useTranslation } from '../../../i18n';

export default function CustomerInvoiceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

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
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('invoice.title')} showBack />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('errors.notFound').toUpperCase()}</Text>
          <CustomButton title={t('navigation.bookings')} onPress={() => router.replace('/(customer)/history')} />
        </View>
      </SafeAreaView>
    );
  }

  const invoiceNo = `RH-${booking.id.substring(0, 8).toUpperCase()}`;
  const totalAmount = Number(booking.total_amount);
  const discount = 0;
  const subtotal = totalAmount + discount;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('invoice.title')}
        subtitle={`${t('invoice.invoiceNumber')} #${invoiceNo}`}
        showBack
        rightElement={
          <TouchableOpacity style={styles.shareBtnHeader} onPress={handleShare}>
            <Share2 color={COLORS.primary} size={16} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Receipt Paper Card */}
        <View style={styles.paperCard}>
          {/* Header Branding */}
          <View style={styles.paperHeader}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Wrench color="#000" size={18} />
              </View>
              <Text style={styles.brandTitle}>RIDERHOOD</Text>
            </View>
            <Text style={styles.brandTagline}>PREMIUM MOTO CARE</Text>
            <View style={styles.paidBadge}>
              <CheckCircle2 color={COLORS.success} size={12} />
              <Text style={styles.paidText}>{t('invoice.paid').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.dottedDivider} />

          {/* Invoice Meta */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>{t('invoice.invoiceNumber').toUpperCase()}</Text>
              <Text style={styles.metaVal}>#{invoiceNo}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>{`${t('common.date').toUpperCase()} & ${t('common.time').toUpperCase()}`}</Text>
              <Text style={styles.metaVal}>{booking.booking_date} {booking.booking_time}</Text>
            </View>
          </View>

          {/* Workshop & Customer info */}
          <View style={styles.partiesGrid}>
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>{t('dashboard.workshop').toUpperCase()}</Text>
              <Text style={styles.partyVal}>
                {((booking.workshop as unknown as Record<string, unknown>)?.name as string) || 'RiderHood Moto Lab'}
              </Text>
              <Text style={styles.partySub}>
                {((booking.workshop as unknown as Record<string, unknown>)?.address as string) || 'Kuala Lumpur'}
              </Text>
            </View>

            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>{`${t('auth.customerLogin').toUpperCase()} & ${t('dashboard.myMotorcycle').toUpperCase()}`}</Text>
              <Text style={styles.partyVal}>
                {((booking.customer as unknown as Record<string, unknown>)?.full_name as string) || 'Customer'}
              </Text>
              <Text style={styles.partySub}>
                {((booking.motorcycle as unknown as Record<string, unknown>)?.nickname as string) || 'Yamaha Y15ZR'} (
                {((booking.motorcycle as unknown as Record<string, unknown>)?.plate_number as string) || 'ABC 1234'})
              </Text>
            </View>
          </View>

          <View style={styles.dottedDivider} />

          {/* Items Table */}
          <Text style={styles.sectionHeading}>{t('invoice.itemDescription').toUpperCase()}</Text>

          <View style={styles.itemsTable}>
            {booking.booking_services && booking.booking_services.length > 0 ? (
              booking.booking_services.map(svc => (
                <View key={svc.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{svc.service_name_snapshot}</Text>
                    <Text style={styles.itemQty}>{t('invoice.qty')}: {svc.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>RM {Number(svc.price_snapshot * svc.quantity).toFixed(2)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>General Motorcycle Care & Maintenance</Text>
                <Text style={styles.itemPrice}>RM {totalAmount.toFixed(2)}</Text>
              </View>
            )}
          </View>

          <View style={styles.dottedDivider} />

          {/* Summary Breakdown */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('invoice.subtotal')}</Text>
              <Text style={styles.summaryVal}>RM {subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('common.price')}</Text>
              <Text style={styles.summaryVal}>RM {totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.dottedDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoice.grandTotal').toUpperCase()}</Text>
              <Text style={styles.totalVal}>RM {totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Footer Note */}
          <View style={styles.receiptFooter}>
            <ShieldCheck color={COLORS.primary} size={16} />
            <Text style={styles.footerText}>{t('reviews.verifiedReview')}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <CustomButton title={t('invoice.downloadInvoice').toUpperCase()} onPress={handleDownload} icon={<Download color="#000" size={16} />} style={{ flex: 1 }} />
          <CustomButton title={t('common.share').toUpperCase()} variant="secondary" onPress={handleShare} icon={<Share2 color={COLORS.primary} size={16} />} style={{ flex: 1 }} />
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
    gap: 16,
  },
  shareBtnHeader: {
    padding: 8,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  paperCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
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
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandTagline: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.success,
    marginTop: 4,
  },
  paidText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: '900',
  },
  dottedDivider: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {},
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  metaVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  partiesGrid: {
    gap: 8,
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  partyBox: {},
  partyLabel: {
    color: COLORS.primary,
    fontSize: 8,
    fontWeight: '900',
  },
  partyVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  partySub: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  sectionHeading: {
    color: COLORS.textMuted,
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
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  itemQty: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  itemPrice: {
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  summaryVal: {
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  totalVal: {
    color: COLORS.primary,
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
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
