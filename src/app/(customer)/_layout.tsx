import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Home, Wrench, Calendar, Clock, User } from 'lucide-react-native';
import { useTranslation } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../context/ThemeContext';
import { ResponsiveSidebar } from '../../components/responsive/ResponsiveSidebar';

export default function CustomerTabsLayout() {
  const { t } = useTranslation();
  const { isPhone } = useResponsive();
  const { colors } = useTheme();

  const tabsContent = (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: isPhone
          ? {
              backgroundColor: colors.surfaceContainer,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              height: 64,
              paddingTop: 4,
              paddingBottom: 6,
            }
          : {
              display: 'none',
            },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          lineHeight: 12,
          marginTop: 1,
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color }) => <Home color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="workshops"
        options={{
          title: t('navigation.workshops'),
          tabBarIcon: ({ color }) => <Wrench color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: t('navigation.bookings'),
          tabBarIcon: ({ color }) => <Calendar color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('navigation.history'),
          tabBarIcon: ({ color }) => <Clock color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('navigation.profile'),
          tabBarIcon: ({ color }) => <User color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="parts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="setup-motorcycle"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="workshop-details"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notification-settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="report-problem"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="motorcycle/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="workshop/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="booking/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="invoice/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="maintenance/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="maintenance/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );

  if (isPhone) {
    return tabsContent;
  }

  return (
    <View style={[styles.desktopLayoutContainer, { backgroundColor: colors.background }]}>
      <ResponsiveSidebar role="customer" />
      <View style={[styles.desktopMainContent, { backgroundColor: colors.background }]}>{tabsContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopLayoutContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  desktopMainContent: {
    flex: 1,
    height: '100%',
  },
});
