import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, Sun, Moon, Laptop } from 'lucide-react-native';
import { useTranslation } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';

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
          <Image
            source={require('../../assets/images/riderhood-logo.png')}
            style={styles.headerLogoImg}
            resizeMode="contain"
          />
        )}
        
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>{subtitle}</Text>
          ) : (
            showTelemetryBadge && (
              <View style={styles.telemetryTag}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.telemetryText, { color: colors.primaryDim }]}>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerLogoImg: {
    width: 38,
    height: 38,
  },
  textContainer: {
    gap: 2,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 12,
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
