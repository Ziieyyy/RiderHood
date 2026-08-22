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
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../../services/notificationService';
import type { Notification } from '../../types/database';
import {
  Bell,
  Calendar,
  AlertTriangle,
  Star,
  ShieldAlert,
  CheckCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useTranslation } from '../../i18n';

const NOTIF_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  booking:     { icon: Calendar, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  workshop:    { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  inventory:   { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  review:      { icon: Star, color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
  system:      { icon: ShieldAlert, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  default:     { icon: Bell, color: COLORS.primary, bg: 'rgba(245, 158, 11, 0.15)' },
};

export default function WorkshopNotificationsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'booking' | 'inventory'>('all');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkRead = async (notifId: string) => {
    try {
      await markAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.is_read;
    if (activeFilter === 'booking') return n.type === 'booking';
    if (activeFilter === 'inventory') return n.type === 'workshop' || n.type === 'system';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('navigation.notifications')} subtitle={t('notifications.title')} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('navigation.notifications')} subtitle={t('notifications.title')} />
        <View style={styles.centered}>
          <RefreshCw color={COLORS.danger} size={40} />
          <Text style={styles.errorTitle}>{t('errors.genericTitle')}</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('navigation.notifications')}
        subtitle={unreadCount > 0 ? `${unreadCount} ${t('notifications.unread')}` : t('notifications.title')}
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
              <CheckCircle color={COLORS.primary} size={16} />
              <Text style={styles.markAllText}>{t('notifications.markAllAsRead')}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {[
          { key: 'all', label: `${t('common.all')} (${notifications.length})` },
          { key: 'unread', label: `${t('notifications.unread')} (${unreadCount})` },
          { key: 'booking', label: t('navigation.bookings') },
          { key: 'inventory', label: t('workshopAdmin.manageSpareParts') },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.activeFilterChip]}
            onPress={() => setActiveFilter(f.key as any)}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.activeFilterText]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>{t('notifications.noNotifications')}</Text>
            <Text style={styles.emptyDesc}>{t('notifications.noNotificationsDesc')}</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const config = NOTIF_ICONS[item.type] || NOTIF_ICONS.default;
            const IconComp = config.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.notifCard, !item.is_read && styles.unreadCard]}
                onPress={() => handleMarkRead(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
                  <IconComp color={config.color} size={20} />
                </View>
                <View style={styles.notifBody}>
                  <View style={styles.notifHeader}>
                    <Text style={[styles.notifTitle, !item.is_read && styles.unreadTitle]}>
                      {item.title}
                    </Text>
                    {!item.is_read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifMsg}>{item.message}</Text>
                  <Text style={styles.notifTime}>
                    {new Date(item.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  errorDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  markAllText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { backgroundColor: COLORS.surfaceContainer, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  activeFilterChip: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  activeFilterText: { color: COLORS.primary },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 280 },
  notifCard: { flexDirection: 'row', backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, gap: 12, alignItems: 'flex-start' },
  unreadCard: { borderColor: COLORS.primary, backgroundColor: 'rgba(245, 158, 11, 0.05)' },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  notifBody: { flex: 1, gap: 4 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  unreadTitle: { color: COLORS.primary, fontWeight: '800' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  notifMsg: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17 },
  notifTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
});
