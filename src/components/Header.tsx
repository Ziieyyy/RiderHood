import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, Sun, Moon, Laptop } from 'lucide-react-native';
import { useTranslation } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { AppLogo } from './AppLogo';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showTelemetryBadge?: boolean;
  rightElement?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'RiderHood',
  subtitle,
  showBack = false,
  onBack,
  showTelemetryBadge = true,
  rightElement,
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, themeMode, toggleTheme } = useTheme();
  const { isPhone } = useResponsive();
  const handleBackPress = onBack || (() => router.back());

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBackPress}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <ChevronLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
        ) : (
          <AppLogo size={36} />
        )}
        
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitleText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>
          ) : (
            showTelemetryBadge && (
              <View style={styles.telemetryTag}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.telemetryText, { color: colors.primaryDim }]} numberOfLines={1}>
                  {t('common.telemetryLive')}
                </Text>
              </View>
            )
          )}
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Theme Toggle Button for Mobile View */}
        {isPhone && (
          <TouchableOpacity
            style={[
              styles.themeToggleButton,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.border,
              },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityLabel="Switch color theme mode"
          >
            {themeMode === 'dark' ? (
              <Moon color={colors.textPrimary} size={18} />
            ) : themeMode === 'light' ? (
              <Sun color={colors.textPrimary} size={18} />
            ) : (
              <Laptop color={colors.textPrimary} size={18} />
            )}
          </TouchableOpacity>
        )}

        {rightElement ? (
          rightElement
        ) : (
          <TouchableOpacity
            style={[
              styles.notificationButton,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.border,
              },
            ]}
            onPress={() => router.push('/(customer)/notifications')}
            activeOpacity={0.7}
            accessibilityLabel="View notifications"
          >
            <Bell color={colors.textPrimary} size={20} />
            <View style={[styles.notificationBadge, { backgroundColor: colors.primary }]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerLogoImg: {
    width: 36,
    height: 36,
  },
  textContainer: {
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  telemetryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  telemetryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  themeToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
