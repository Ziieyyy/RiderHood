import React from 'react';
import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Home, Wrench, Calendar, Clock, User } from 'lucide-react-native';
import { useTranslation } from '../../i18n';

export default function CustomerTabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surfaceContainer,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="workshops"
        options={{
          title: t('navigation.workshops'),
          tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: t('navigation.bookings'),
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('navigation.history'),
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
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
}
