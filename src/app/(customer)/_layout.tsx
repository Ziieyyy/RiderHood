import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Wrench, Calendar, Clock, User } from 'lucide-react-native';
import { useTranslation } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../context/ThemeContext';
import { ResponsiveSidebar } from '../../components/responsive/ResponsiveSidebar';

const PRIMARY_TABS = [
  { name: 'home', icon: Home, labelKey: 'navigation.home' },
  { name: 'workshops', icon: Wrench, labelKey: 'navigation.workshops' },
  { name: 'booking', icon: Calendar, labelKey: 'navigation.bookings' },
  { name: 'history', icon: Clock, labelKey: 'navigation.history' },
  { name: 'profile', icon: User, labelKey: 'navigation.profile' },
] as const;

function CustomerBottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { isPhone } = useResponsive();
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (!isPhone) return null;

  const currentRoute = state.routes[state.index];
  const currentRouteName = currentRoute?.name;

  return (
    <View
      style={[
        bottomTabStyles.barContainer,
        {
          backgroundColor: colors.surfaceContainer,
          borderTopColor: colors.border,
        },
      ]}
    >
      {PRIMARY_TABS.map((tab) => {
        const isFocused = currentRouteName === tab.name;
        const Icon = tab.icon;
        const label = t(tab.labelKey as any);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: tab.name,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={onPress}
            style={bottomTabStyles.tabItem}
            activeOpacity={0.7}
          >
            <View style={bottomTabStyles.iconContainer}>
              <Icon
                color={isFocused ? colors.primary : colors.textMuted}
                size={22}
              />
            </View>
            <Text
              style={[
                bottomTabStyles.tabLabel,
                { color: isFocused ? colors.primary : colors.textMuted },
                isFocused && bottomTabStyles.tabLabelActive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CustomerTabsLayout() {
  const { t } = useTranslation();
  const { isPhone } = useResponsive();
  const { colors } = useTheme();

  const tabsContent = (
    <Tabs
      tabBar={(props) => <CustomerBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('navigation.home'),
        }}
      />
      <Tabs.Screen
        name="workshops"
        options={{
          title: t('navigation.workshops'),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: t('navigation.bookings'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('navigation.history'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('navigation.profile'),
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

const bottomTabStyles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    minHeight: Platform.OS === 'ios' ? 76 : 64,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconContainer: {
    marginBottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '800',
  },
});

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
