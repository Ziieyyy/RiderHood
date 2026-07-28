import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import {
  Bell,
  CheckCheck,
  Calendar,
  Wrench,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../../services/notificationService';
import type { Notification } from '../../types/database';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'BOOKINGS' | 'MAINTENANCE' | 'SYSTEM'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.log('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      Alert.alert('Notifications', 'All notifications marked as read.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to mark all as read.');
    }
  };

  const handlePressNotification = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await markAsRead(notif.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.log('Error marking read:', err);
      }
    }

    if (notif.data?.booking_id) {
      router.push(`/(customer)/booking/${notif.data.booking_id}` as any);
    } else if (notif.data?.reminder_id) {
      router.push(`/(customer)/maintenance/${notif.data.reminder_id}` as any);
    } else if (notif.data?.workshop_id) {
      router.push(`/(customer)/workshop/${notif.data.workshop_id}` as any);
    } else {
      router.push('/(customer)/maintenance' as any);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'BOOKINGS') return n.type === 'booking';
    if (filter === 'MAINTENANCE') return n.type === 'maintenance';
    if (filter === 'SYSTEM') return n.type === 'system';
    return true;
  });

  const getIconForType = (type?: string) => {
    switch (type) {
      case 'booking':
        return <Calendar color={COLORS.primary} size={20} />;
      case 'maintenance':
        return <Wrench color="#f59e0b" size={20} />;
      default:
        return <Info color={COLORS.primaryDim} size={20} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Notifications"
        subtitle="Stay updated on booking status & service reminders"
        showBack
        rightElement={
          <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead} activeOpacity={0.8}>
            <CheckCheck color={COLORS.primary} size={16} />
            <Text style={styles.markReadText}>Mark All Read</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'BOOKINGS', 'MAINTENANCE', 'SYSTEM'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchNotifications();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bell color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>NO NOTIFICATIONS</Text>
            <Text style={styles.emptySub}>You have no unread updates or reminders in this category.</Text>
          </View>
        ) : (
          filteredNotifications.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.notifCard, !item.is_read && styles.unreadCard]}
              onPress={() => handlePressNotification(item)}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircle}>{getIconForType(item.type)}</View>

              <View style={{ flex: 1 }}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  {!item.is_read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifMessage}>{item.message}</Text>
                <Text style={styles.notifTime}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>

              <ChevronRight color={COLORS.textMuted} size={16} />
            </TouchableOpacity>
          ))
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
    gap: 10,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  markReadText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  unreadCard: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  notifMessage: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  notifTime: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
});
