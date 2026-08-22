import React, { useEffect, useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { COLORS } from '../../constants/theme';
import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  Package,
  Users,
  Star,
  Building2,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { getMyWorkshop } from '../../services/workshopService';
import type { Workshop } from '../../types/database';

function CustomWorkshopDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, profile } = useAuth();
  const { t } = useTranslation();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);

  useEffect(() => {
    if (profile?.id) {
      getMyWorkshop(profile.id).then(setWorkshop).catch(() => {});
    }
  }, [profile?.id]);

  const navItems = [
    { name: 'dashboard', label: t('workshopAdmin.dashboard'), icon: LayoutDashboard, route: '/(workshop)/dashboard' },
    { name: 'bookings', label: t('workshopAdmin.bookingsQueue'), icon: CalendarDays, route: '/(workshop)/bookings' },
    { name: 'services', label: t('workshopAdmin.serviceCatalog'), icon: Wrench, route: '/(workshop)/services' },
    { name: 'customers', label: t('workshopAdmin.customers'), icon: Users, route: '/(workshop)/customers' },
    { name: 'reviews', label: t('workshopAdmin.reviews'), icon: Star, route: '/(workshop)/reviews' },
    { name: 'notifications', label: t('navigation.notifications'), icon: Bell, route: '/(workshop)/notifications' },
    { name: 'profile', label: t('workshopAdmin.workshopProfile'), icon: Building2, route: '/(workshop)/profile' },
    { name: 'reports', label: t('workshopAdmin.reports'), icon: BarChart3, route: '/(workshop)/reports' },
    { name: 'settings', label: t('workshopAdmin.settings'), icon: Settings, route: '/(workshop)/settings' },
  ];

  return (
    <View style={sidebarStyles.container}>
      {/* Brand Header */}
      <View style={sidebarStyles.brandCard}>
        <View style={sidebarStyles.logoRow}>
          <View style={sidebarStyles.logoBadge}>
            <Zap color="#FFFFFF" size={18} />
          </View>
          <View>
            <Text style={sidebarStyles.brandTitle}>RIDERHOOD</Text>
            <Text style={sidebarStyles.brandSub}>WORKSHOP ADMIN</Text>
          </View>
        </View>

        <View style={sidebarStyles.workshopInfoCard}>
          <Text style={sidebarStyles.wsName} numberOfLines={1}>
            {workshop?.name || t('common.loading')}
          </Text>
          <View style={sidebarStyles.statusRow}>
            <View style={[sidebarStyles.statusDot, { backgroundColor: workshop?.is_open ? COLORS.success : COLORS.danger }]} />
            <Text style={sidebarStyles.statusText}>
              {workshop?.is_open ? t('workshopAdmin.workshopOnline') : t('workshopAdmin.workshopOffline')}
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation List */}
      <ScrollView style={sidebarStyles.navScroll} showsVerticalScrollIndicator={false}>
        <Text style={sidebarStyles.navSectionTitle}>{t('workshopAdmin.dashboard').toUpperCase()}</Text>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.includes(item.name);
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                sidebarStyles.navItem,
                isActive && sidebarStyles.navItemActive,
              ]}
              onPress={() => {
                props.navigation.closeDrawer();
                router.push(item.route as any);
              }}
              activeOpacity={0.7}
              accessibilityLabel={item.label}
            >
              <View style={[sidebarStyles.iconContainer, isActive && sidebarStyles.iconActive]}>
                <Icon color={isActive ? COLORS.primary : COLORS.textSecondary} size={18} />
              </View>
              <Text style={[sidebarStyles.navLabel, isActive && sidebarStyles.navLabelActive]}>
                {item.label}
              </Text>
              {isActive && <View style={sidebarStyles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Profile & Logout */}
      <View style={sidebarStyles.footer}>
        <View style={sidebarStyles.profileRow}>
          <View style={sidebarStyles.profileAvatar}>
            <Text style={sidebarStyles.avatarInitials}>
              {(profile?.full_name || 'Admin').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sidebarStyles.profileName} numberOfLines={1}>
              {profile?.full_name || 'Admin'}
            </Text>
            <Text style={sidebarStyles.profileEmail} numberOfLines={1}>
              {profile?.email || 'admin@riderhood.com'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={sidebarStyles.logoutBtn}
          onPress={() => {
            props.navigation.closeDrawer();
            logout();
          }}
          activeOpacity={0.8}
          accessibilityLabel={t('common.logout')}
        >
          <LogOut color={COLORS.danger} size={16} />
          <Text style={sidebarStyles.logoutText}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
export default function WorkshopDrawerLayout() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user || !profile || (profile.role !== 'workshop_admin' && profile.role !== 'super_admin')) {
        Alert.alert('Access Denied', 'You must be logged in as an authorized Workshop Admin to access management tools.');
        router.replace('/' as any);
      }
    }
  }, [user, profile, isLoading, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!user || !profile || (profile.role !== 'workshop_admin' && profile.role !== 'super_admin')) {
    return null;
  }

  return (
    <Drawer
      drawerContent={(props) => <CustomWorkshopDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: COLORS.secondaryBackground,
          width: 290,
        },
        sceneStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="bookings" options={{ title: 'Bookings Management' }} />
      <Drawer.Screen name="services" options={{ title: 'Service Catalog' }} />
      <Drawer.Screen name="parts" options={{ title: 'Parts Inventory', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="customers" options={{ title: 'Customer Directory' }} />
      <Drawer.Screen name="reviews" options={{ title: 'Customer Reviews' }} />
      <Drawer.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Drawer.Screen name="profile" options={{ title: 'Workshop Profile' }} />
      <Drawer.Screen name="reports" options={{ title: 'Reports & Revenue' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}

const sidebarStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondaryBackground,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  brandCard: {
    backgroundColor: COLORS.cards,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    marginBottom: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandSub: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  workshopInfoCard: {
    backgroundColor: COLORS.elevatedCards,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    gap: 4,
  },
  wsName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  navScroll: {
    flex: 1,
  },
  navSectionTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  iconContainer: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconActive: {
    // highlighted
  },
  navLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  navLabelActive: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  profileEmail: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 10,
    borderRadius: 10,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '800',
  },
});
