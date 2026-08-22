import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';
import { Clock, Calendar, ChevronRight, User, Wrench } from 'lucide-react-native';
import { getAllBookings } from '../../services/bookingService';
import type { Booking } from '../../types/database';
import { useTranslation } from '../../i18n';

export default function AdminBookingsScreen() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      const data = await getAllBookings();
      setBookings(data ?? []);
    } catch (err) {
      console.log('Error loading bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : (
          bookings.map((booking) => {
            const displayId = booking.id ? (booking.id.length > 8 ? `B-${booking.id.substring(0, 6).toUpperCase()}` : booking.id) : 'B-1000';
            const userName = booking.customer?.full_name || booking.user || t('auth.customerLogin');
            const shopName = booking.workshop?.name || booking.shop || t('dashboard.workshop');
            const dateStr = booking.booking_date || booking.date || t('common.today');
            const statusStr = (booking.status || 'pending').toLowerCase();
            const serviceStr = booking.service || t('services.servicePackage');

            return (
              <TouchableOpacity key={booking.id} style={styles.card} activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                  <Text style={styles.bookingId}>{displayId}</Text>
                  <View style={[styles.badge, (styles as any)[`badge_${statusStr}`] || styles.badge_pending]}>
                    <Text style={[styles.badgeText, (styles as any)[`badgeText_${statusStr}`] || styles.badgeText_pending]}>
                      {statusStr === 'pending'
                        ? t('booking.pendingApproval').toUpperCase()
                        : statusStr === 'confirmed'
                        ? t('booking.bookingConfirmed').toUpperCase()
                        : statusStr === 'completed'
                        ? t('booking.bookingCompleted').toUpperCase()
                        : statusStr === 'cancelled'
                        ? t('booking.bookingCancelled').toUpperCase()
                        : statusStr.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.serviceName}>{serviceStr}</Text>
                
                <View style={styles.footer}>
                  <View style={styles.footerItem}>
                    <Calendar color={COLORS.textMuted} size={14} />
                    <Text style={styles.footerText}>{dateStr}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Clock color={COLORS.textMuted} size={14} />
                    <Text style={styles.footerText}>{shopName}</Text>
                  </View>
                </View>
                
                <View style={styles.chevron}>
                  <ChevronRight color={COLORS.textMuted} size={20} />
                </View>
              </TouchableOpacity>
            );
          })
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
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingId: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badge_upcoming: { backgroundColor: COLORS.primaryDark },
  badge_pending: { backgroundColor: COLORS.primaryDark },
  badge_completed: { backgroundColor: COLORS.successBg },
  badge_cancelled: { backgroundColor: COLORS.dangerBg },
  
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeText_upcoming: { color: COLORS.primary },
  badgeText_pending: { color: COLORS.primary },
  badgeText_completed: { color: COLORS.success },
  badgeText_cancelled: { color: COLORS.danger },

  userName: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  serviceName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: 45,
  },
});
