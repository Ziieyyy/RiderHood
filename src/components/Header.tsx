import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { ChevronLeft, Cpu, Bell } from 'lucide-react-native';
import { useTranslation } from '../i18n';

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
  const handleBackPress = onBack || (() => router.back());

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity onPress={handleBackPress} style={styles.iconButton} activeOpacity={0.7}>
            <ChevronLeft color={COLORS.textPrimary} size={24} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandIcon}>
            <Cpu color={COLORS.primary} size={22} />
          </View>
        )}
        
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitleText}>{subtitle}</Text>
          ) : (
            showTelemetryBadge && (
              <View style={styles.telemetryTag}>
                <View style={styles.liveDot} />
                <Text style={styles.telemetryText}>{t('common.telemetryLive')}</Text>
              </View>
            )
          )}
        </View>
      </View>

      {rightElement ? (
        rightElement
      ) : (
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/(customer)/notifications')}
          activeOpacity={0.7}
        >
          <Bell color={COLORS.textPrimary} size={20} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      )}
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
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  textContainer: {
    gap: 2,
  },
  titleText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitleText: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.success,
  },
  telemetryText: {
    color: COLORS.primaryDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});
