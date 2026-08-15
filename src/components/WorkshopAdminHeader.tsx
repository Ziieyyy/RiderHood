import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { COLORS } from '../constants/theme';
import { Bell, User, Settings, LogOut, Key, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getMyWorkshop, updateWorkshop } from '../services/workshopService';
import { getUnreadCount } from '../services/notificationService';
import type { Workshop } from '../types/database';

interface WorkshopAdminHeaderProps {
  title: string;
  subtitle?: string;
  onToggleDrawer?: () => void;
}

export const WorkshopAdminHeader: React.FC<WorkshopAdminHeaderProps> = ({
  title,
  subtitle,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const loadHeaderState = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [ws, count] = await Promise.all([
        getMyWorkshop(profile.id),
        getUnreadCount(profile.id),
      ]);
      setWorkshop(ws);
      setUnreadCount(count);
    } catch (err) {
      console.warn('Failed to load header state:', err);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadHeaderState();
  }, [loadHeaderState]);

  const handleToggleOpenStatus = async () => {
    if (!workshop || togglingStatus) return;
    setTogglingStatus(true);
    const newStatus = !workshop.is_open;
    try {
      const updated = await updateWorkshop(workshop.id, { is_open: newStatus });
      setWorkshop(updated);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title & Breadcrumb */}
      <View style={styles.titleSection}>
        <Text style={styles.breadcrumbText}>RiderHood Admin &gt; {title}</Text>
        <Text style={styles.titleText}>{title}</Text>
        {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
      </View>

      {/* Right Controls */}
      <View style={styles.actionsSection}>
        {/* Dynamic Workshop Status Switch */}
        {workshop && (
          <TouchableOpacity
            style={[
              styles.statusChip,
              {
                backgroundColor: workshop.is_open ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                borderColor: workshop.is_open ? COLORS.success : COLORS.danger,
              },
            ]}
            onPress={handleToggleOpenStatus}
            disabled={togglingStatus}
            activeOpacity={0.7}
            accessibilityLabel={`Toggle workshop status, currently ${workshop.is_open ? 'OPEN' : 'CLOSED'}`}
          >
            {togglingStatus ? (
              <ActivityIndicator size="small" color={workshop.is_open ? COLORS.success : COLORS.danger} />
            ) : (
              <>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: workshop.is_open ? COLORS.success : COLORS.danger },
                  ]}
                />
                <Text
                  style={[
                    styles.statusChipText,
                    { color: workshop.is_open ? COLORS.success : COLORS.danger },
                  ]}
                >
                  {workshop.is_open ? '● OPEN' : '● CLOSED'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Notifications Icon with Badge */}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            pathname.includes('notifications') && { borderColor: COLORS.primary, backgroundColor: COLORS.elevatedCards },
          ]}
          onPress={() => router.push('/(workshop)/notifications')}
          accessibilityLabel="View Notifications"
        >
          <Bell color={pathname.includes('notifications') ? COLORS.primary : COLORS.textSecondary} size={18} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Profile Dropdown Menu Trigger */}
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => setShowProfileMenu(true)}
          accessibilityLabel="Admin Profile Options"
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(profile?.full_name || 'Admin').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfoMobileHide}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile?.full_name || 'Workshop Admin'}
            </Text>
            <Text style={styles.profileRole} numberOfLines={1}>
              {workshop?.name || 'RiderHood Workshop'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Profile Dropdown Modal */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowProfileMenu(false)}>
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderName}>{profile?.full_name || 'Admin'}</Text>
              <Text style={styles.menuHeaderEmail}>{profile?.email || 'admin@riderhood.com'}</Text>
              <View style={styles.roleBadge}>
                <ShieldCheck color={COLORS.primary} size={12} />
                <Text style={styles.roleBadgeText}>WORKSHOP ADMIN</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowProfileMenu(false);
                router.push('/(workshop)/profile');
              }}
            >
              <User color={COLORS.textSecondary} size={16} />
              <Text style={styles.menuItemText}>My Profile & Hours</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowProfileMenu(false);
                router.push('/(workshop)/settings');
              }}
            >
              <Settings color={COLORS.textSecondary} size={16} />
              <Text style={styles.menuItemText}>Account Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowProfileMenu(false);
                router.push('/(workshop)/settings');
              }}
            >
              <Key color={COLORS.textSecondary} size={16} />
              <Text style={styles.menuItemText}>Change Password</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: COLORS.dangerBg }]}
              onPress={() => {
                setShowProfileMenu(false);
                logout();
              }}
            >
              <LogOut color={COLORS.danger} size={16} />
              <Text style={[styles.menuItemText, { color: COLORS.danger, fontWeight: '700' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondaryBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  titleSection: {
    gap: 2,
    flex: 1,
  },
  breadcrumbText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titleText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitleText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.cards,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cards,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  profileInfoMobileHide: {
    maxWidth: 130,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  profileRole: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  menuCard: {
    width: 240,
    backgroundColor: COLORS.elevatedCards,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    padding: 12,
    gap: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  menuHeader: {
    padding: 6,
    gap: 2,
  },
  menuHeaderName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  menuHeaderEmail: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  roleBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
  },
  menuItemText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
});
