import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { COLORS } from '../../constants/theme';
import { Home, Users, Wrench, BarChart3, Settings, LogOut, CalendarDays, Layers, Package, Star, Bell } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../context/ThemeContext';

export default function AdminDrawerLayout() {
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const { isPhone } = useResponsive();
  const { colors } = useTheme();

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surfaceContainer, borderBottomWidth: 1, borderBottomColor: colors.border },
        headerTintColor: colors.textPrimary,
        drawerActiveBackgroundColor: colors.primaryDark,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerType: isPhone ? 'front' : 'permanent',
        drawerStyle: { backgroundColor: colors.surface, width: 270 },
        sceneStyle: { backgroundColor: colors.background },

        headerRight: () => (
          <TouchableOpacity 
            style={{ marginRight: 16, width: 36, height: 36, borderRadius: 10, backgroundColor: colors.dangerBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.danger }}
            onPress={logout}
          >
            <LogOut color={colors.danger} size={16} />
          </TouchableOpacity>
        ),
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: t('superAdmin.commandCenter'),
          title: t('superAdmin.commandCenter'),
          drawerIcon: ({ color }) => <Home color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="users"
        options={{
          drawerLabel: t('superAdmin.userManagement'),
          title: t('superAdmin.userManagement'),
          drawerIcon: ({ color }) => <Users color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="workshops"
        options={{
          drawerLabel: t('navigation.workshops'),
          title: t('navigation.workshops'),
          drawerIcon: ({ color }) => <Wrench color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="bookings"
        options={{
          drawerLabel: t('navigation.bookings'),
          title: t('navigation.bookings'),
          drawerIcon: ({ color }) => <CalendarDays color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="services"
        options={{
          drawerLabel: t('navigation.services'),
          title: t('navigation.services'),
          drawerIcon: ({ color }) => <Layers color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="parts"
        options={{
          drawerItemStyle: { display: 'none' },
          drawerLabel: t('navigation.spareParts'),
          title: t('navigation.spareParts'),
          drawerIcon: ({ color }) => <Package color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="reviews"
        options={{
          drawerLabel: t('reviews.title'),
          title: t('reviews.title'),
          drawerIcon: ({ color }) => <Star color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          drawerLabel: t('navigation.notifications'),
          title: t('navigation.notifications'),
          drawerIcon: ({ color }) => <Bell color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          drawerLabel: t('navigation.reports'),
          title: t('navigation.reports'),
          drawerIcon: ({ color }) => <BarChart3 color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: t('settings.title'),
          title: t('settings.title'),
          drawerIcon: ({ color }) => <Settings color={color} size={20} />,
        }}
      />
    </Drawer>
  );
}
