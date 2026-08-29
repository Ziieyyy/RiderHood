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
import { COLORS, DARK_COLORS } from '../../constants/theme';
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
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../../services/notificationService';
import type { Notification } from '../../types/database';
import { useTranslation } from '../../i18n';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

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
      Alert.alert(t('notifications.title'), t('notifications.markAllRead'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('errors.updateFailed'));
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
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        showBack
        rightElement={
          <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead} activeOpacity={0.8}>
            <CheckCheck color={COLORS.primary} size={16} />
            <Text style={styles.markReadText}>{t('notifications.markAllRead')}</Text>
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
            <Text style={styles.emptyTitle}>{t('empty.noNotifications').toUpperCase()}</Text>
            <Text style={styles.emptySub}>{t('empty.noNotificationsSub')}</Text>
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

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      backgroundColor: colors.primaryDark,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    markReadText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primary,
    },
    filterChipText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
    },
    filterChipTextActive: {
      color: colors.primary,
    },
    emptyCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 20,
      gap: 8,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    emptySub: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
    },
    notifCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    unreadCard: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    notifTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    notifMessage: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
      lineHeight: 16,
    },
    notifTime: {
      color: colors.textMuted,
      fontSize: 10,
      marginTop: 4,
    },
  });
