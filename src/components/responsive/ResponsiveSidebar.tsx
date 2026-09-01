import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { AppThemeColors } from '../../constants/theme';
import { LAYOUT } from '../../constants/responsive';
import { AppLogo } from '../AppLogo';
import {
  Home,
  Wrench,
  Calendar,
  Clock,
  User,
  LayoutDashboard,
  CalendarDays,
  Package,
  Users,
  Star,
  Building2,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Globe,
  Moon,
  Sun,
  Laptop,
  Layers,
  Menu,
  ChevronLeft,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation, SupportedLanguage } from '../../i18n';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';

interface ResponsiveSidebarProps {
  role: 'customer' | 'workshop' | 'admin';
  workshopName?: string;
  isWorkshopOnline?: boolean;
  onToggleWorkshopStatus?: () => void;
  unreadCount?: number;
}

export const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({
  role,
  workshopName,
  isWorkshopOnline = true,
  onToggleWorkshopStatus,
  unreadCount = 0,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, logout } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const { themeMode, activeTheme, isDark, colors, toggleTheme } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Navigation Items by Role
  const customerNav = [
    { name: 'home', label: t('navigation.home'), icon: Home, route: '/(customer)/home' },
    { name: 'workshops', label: t('navigation.workshops'), icon: Wrench, route: '/(customer)/workshops' },
    { name: 'booking', label: t('navigation.bookings'), icon: Calendar, route: '/(customer)/booking' },
    { name: 'history', label: t('navigation.history'), icon: Clock, route: '/(customer)/history' },
    { name: 'garage', label: t('navigation.garage'), icon: Layers, route: '/(customer)/garage' },
    { name: 'parts', label: t('navigation.spareParts'), icon: Package, route: '/(customer)/parts' },
    { name: 'notifications', label: t('navigation.notifications'), icon: Bell, route: '/(customer)/notifications' },
    { name: 'profile', label: t('navigation.profile'), icon: User, route: '/(customer)/profile' },
  ];

  const workshopNav = [
    { name: 'dashboard', label: t('workshopAdmin.dashboard'), icon: LayoutDashboard, route: '/(workshop)/dashboard' },
    { name: 'bookings', label: t('workshopAdmin.bookingsQueue'), icon: CalendarDays, route: '/(workshop)/bookings' },
    { name: 'services', label: t('workshopAdmin.serviceCatalog'), icon: Wrench, route: '/(workshop)/services' },
    { name: 'parts', label: t('workshopAdmin.manageSpareParts'), icon: Package, route: '/(workshop)/parts' },
    { name: 'customers', label: t('workshopAdmin.customers'), icon: Users, route: '/(workshop)/customers' },
    { name: 'reviews', label: t('workshopAdmin.reviews'), icon: Star, route: '/(workshop)/reviews' },
    { name: 'notifications', label: t('navigation.notifications'), icon: Bell, route: '/(workshop)/notifications' },
    { name: 'reports', label: t('workshopAdmin.reports'), icon: BarChart3, route: '/(workshop)/reports' },
    { name: 'profile', label: t('workshopAdmin.workshopProfile'), icon: Building2, route: '/(workshop)/profile' },
    { name: 'settings', label: t('workshopAdmin.settings'), icon: Settings, route: '/(workshop)/settings' },
  ];

  const adminNav = [
    { name: 'index', label: t('superAdmin.commandCenter'), icon: Home, route: '/(admin)' },
    { name: 'users', label: t('superAdmin.userManagement'), icon: Users, route: '/(admin)/users' },
    { name: 'workshops', label: t('navigation.workshops'), icon: Wrench, route: '/(admin)/workshops' },
    { name: 'bookings', label: t('navigation.bookings'), icon: CalendarDays, route: '/(admin)/bookings' },
    { name: 'services', label: t('navigation.services'), icon: Layers, route: '/(admin)/services' },
    { name: 'parts', label: t('navigation.spareParts'), icon: Package, route: '/(admin)/parts' },
    { name: 'reviews', label: t('reviews.title'), icon: Star, route: '/(admin)/reviews' },
    { name: 'notifications', label: t('navigation.notifications'), icon: Bell, route: '/(admin)/notifications' },
    { name: 'reports', label: t('navigation.reports'), icon: BarChart3, route: '/(admin)/reports' },
    { name: 'settings', label: t('settings.title'), icon: Settings, route: '/(admin)/settings' },
  ];

  const activeNavList = role === 'workshop' ? workshopNav : role === 'admin' ? adminNav : customerNav;

  const roleLabel =
    role === 'workshop'
      ? t('workshopAdmin.workshopRole')
      : role === 'admin'
      ? t('superAdmin.superAdminRole')
      : 'Rider';

  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleLanguage = () => {
    const nextLang: SupportedLanguage = language === 'en-GB' ? 'ms-MY' : 'en-GB';
    setLanguage(nextLang);
  };

  return (
    <View
      style={[
        styles.sidebarContainer,
        isCollapsed && styles.sidebarContainerCollapsed,
      ]}
    >
      {/* Brand Header */}
      <View style={[styles.brandHeader, isCollapsed && styles.brandHeaderCollapsed]}>
        <View style={[styles.logoRow, isCollapsed && styles.logoRowCollapsed]}>
          <AppLogo
            size={isCollapsed ? 32 : 36}
            containerStyle={isCollapsed ? { paddingHorizontal: 4, paddingVertical: 4 } : undefined}
          />
          {!isCollapsed && (
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>RIDERHOOD</Text>
              <Text style={styles.brandSub}>{roleLabel.toUpperCase()}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.toggleMenuBtn}
            onPress={() => setIsCollapsed(!isCollapsed)}
            activeOpacity={0.7}
            accessibilityLabel={isCollapsed ? 'Open menu' : 'Close menu'}
          >
            {isCollapsed ? (
              <Menu color={colors.primary} size={18} />
            ) : (
              <ChevronLeft color={colors.textSecondary} size={18} />
            )}
          </TouchableOpacity>
        </View>

        {!isCollapsed && role === 'workshop' && workshopName && (
          <View style={styles.workshopStatusCard}>
            <Text style={styles.workshopNameText} numberOfLines={1}>
              {workshopName}
            </Text>
            {onToggleWorkshopStatus ? (
              <TouchableOpacity
                style={styles.statusToggleBtn}
                onPress={onToggleWorkshopStatus}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isWorkshopOnline ? colors.success : colors.danger },
                  ]}
                />
                <Text style={styles.statusToggleText}>
                  {isWorkshopOnline ? t('workshopAdmin.workshopOnline') : t('workshopAdmin.workshopOffline')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* Navigation Links */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={[styles.navScrollContent, isCollapsed && styles.navScrollContentCollapsed]}
        showsVerticalScrollIndicator={false}
      >
        {!isCollapsed && <Text style={styles.sectionHeader}>{t('common.overview').toUpperCase()}</Text>}
        {activeNavList.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.route === pathname ||
            (item.name !== 'index' && pathname.includes(item.name)) ||
            (item.name === 'index' && (pathname === '/(admin)' || pathname === '/(admin)/'));

          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isCollapsed && styles.navItemCollapsed,
              ]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
              accessibilityLabel={item.label}
            >
              <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                <Icon color={isActive ? colors.primary : colors.textSecondary} size={18} />
              </View>
              {!isCollapsed && (
                <>
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.activePill} />}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer: Theme Toggle & Language Switcher & Profile & Logout */}
      <View style={[styles.footerContainer, isCollapsed && styles.footerContainerCollapsed]}>
        {/* Theme Mode Toggle (Cycles Dark -> Light -> System) */}
        <TouchableOpacity
          style={[styles.langSwitchBtn, isCollapsed && styles.langSwitchBtnCollapsed, { marginBottom: 6 }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
          accessibilityLabel="Toggle Theme"
        >
          {themeMode === 'dark' ? (
            <Moon color={colors.primary} size={16} />
          ) : themeMode === 'light' ? (
            <Sun color={colors.primary} size={16} />
          ) : (
            <Laptop color={colors.primary} size={16} />
          )}
          {!isCollapsed && (
            <Text style={styles.langSwitchText}>
              {themeMode === 'dark'
                ? t('settings.darkMode')
                : themeMode === 'light'
                ? t('settings.lightMode')
                : `${t('settings.systemMode')} (${activeTheme === 'dark' ? 'Dark' : 'Light'})`}
            </Text>
          )}
        </TouchableOpacity>

        {/* Language Switcher */}
        <TouchableOpacity
          style={[styles.langSwitchBtn, isCollapsed && styles.langSwitchBtnCollapsed]}
          onPress={toggleLanguage}
          activeOpacity={0.7}
          accessibilityLabel="Switch language"
        >
          <Globe color={colors.primary} size={16} />
          {!isCollapsed && (
            <Text style={styles.langSwitchText}>
              {language === 'en-GB' ? '🇬🇧 English (UK)' : '🇲🇾 Bahasa Melayu'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Profile Row */}
        {isCollapsed ? (
          <View style={styles.profileColumnCollapsed}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(profile?.full_name || user?.full_name || 'R').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={logout}
              activeOpacity={0.7}
              accessibilityLabel={t('common.logout')}
            >
              <LogOut color={colors.danger} size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(profile?.full_name || user?.full_name || 'R').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile?.full_name || user?.full_name || 'RiderHood User'}
              </Text>
              <Text style={styles.profileRole} numberOfLines={1}>
                {profile?.email || user?.email || roleLabel}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={logout}
              activeOpacity={0.7}
              accessibilityLabel={t('common.logout')}
            >
              <LogOut color={colors.danger} size={16} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: AppThemeColors, isDark: boolean) =>
  StyleSheet.create({
    sidebarContainer: {
      width: LAYOUT.SIDEBAR_WIDTH_EXPANDED,
      backgroundColor: colors.secondaryBackground,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      height: '100%',
      flexDirection: 'column',
    },
    sidebarContainerCollapsed: {
      width: 76,
    },
    brandHeader: {
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    brandHeaderCollapsed: {
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 8,
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoRowCollapsed: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    },
    sidebarLogoImg: {
      width: 38,
      height: 38,
    },
    sidebarLogoImgCollapsed: {
      width: 34,
      height: 34,
    },
    toggleMenuBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.surfaceContainer,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    brandTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    brandSub: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    workshopStatusCard: {
      backgroundColor: colors.cards,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.borderHighlight,
      gap: 6,
    },
    workshopNameText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    statusToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusToggleText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    navScroll: {
      flex: 1,
    },
    navScrollContent: {
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    navScrollContentCollapsed: {
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    sectionHeader: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      paddingHorizontal: 10,
      marginBottom: 8,
      marginTop: 4,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 4,
      gap: 12,
      position: 'relative',
    },
    navItemCollapsed: {
      paddingHorizontal: 0,
      justifyContent: 'center',
      width: 48,
      height: 48,
    },
    navItemActive: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 107, 0, 0.3)' : 'rgba(255, 107, 0, 0.25)',
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceContainer,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconBoxActive: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.2)' : 'rgba(255, 107, 0, 0.12)',
    },
    navLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    navLabelActive: {
      color: colors.textPrimary,
      fontWeight: '800',
    },
    activePill: {
      position: 'absolute',
      right: 8,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    footerContainer: {
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
      backgroundColor: colors.surface,
    },
    footerContainerCollapsed: {
      padding: 10,
      alignItems: 'center',
      gap: 10,
    },
    langSwitchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surfaceContainer,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    langSwitchBtnCollapsed: {
      width: 38,
      height: 38,
      paddingVertical: 0,
      paddingHorizontal: 0,
      borderRadius: 10,
    },
    langSwitchText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    profileColumnCollapsed: {
      alignItems: 'center',
      gap: 10,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryDark,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    avatarText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '900',
    },
    profileName: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    profileRole: {
      color: colors.textMuted,
      fontSize: 11,
    },
    logoutBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: colors.dangerBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.4)',
    },
  });
