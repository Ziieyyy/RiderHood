import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaintenanceReminder } from '../types/database';
import { Droplet, Disc, Link2, ShieldAlert, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from '../i18n';
import { useThemedStyles } from '../context/ThemeContext';
import { DARK_COLORS } from '../constants/theme';

interface ReminderItemProps {
  item: MaintenanceReminder;
}

export const ReminderItem: React.FC<ReminderItemProps> = ({ item }) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const getIcon = () => {
    switch ((item.type || '').toLowerCase()) {
      case 'oil':
      case 'engine oil & filter':
        return <Droplet color={styles.iconPrimary.color} size={18} />;
      case 'brake':
      case 'front & rear brake pads':
        return <Disc color={item.status === 'due' || item.status === 'overdue' ? styles.badgeWarning.borderColor : styles.iconPrimary.color} size={18} />;
      case 'chain':
      case 'drive chain & sprocket':
        return <Link2 color={styles.iconPrimary.color} size={18} />;
      default:
        return <CheckCircle2 color={styles.iconPrimary.color} size={18} />;
    }
  };

  const getStatusBadge = () => {
    if (item.status === 'due' || item.status === 'overdue') {
      return (
        <View style={[styles.badge, styles.badgeWarning]}>
          <ShieldAlert color={styles.badgeWarningText.color} size={12} />
          <Text style={[styles.badgeText, styles.badgeWarningText]}>{t('maintenance.dueSoon').toUpperCase()}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeSuccess]}>
        <CheckCircle2 color={styles.badgeSuccessText.color} size={12} />
        <Text style={[styles.badgeText, styles.badgeSuccessText]}>{t('maintenance.upToDate').toUpperCase()}</Text>
      </View>
    );
  };

  const percentage = Math.min(100, Math.max(10, Math.round(((item.current_mileage || 0) / (item.next_service_mileage || 1)) * 100)));

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8} onPress={() => {}}>
      <View style={styles.topLine}>
        <View style={styles.iconTitleRow}>
          <View style={styles.iconCircle}>{getIcon()}</View>
          <View style={styles.textContainer}>
            <Text style={styles.nameText}>{item.title}</Text>
            <Text style={styles.categoryText}>
              {item.type} • {t('maintenance.nextService')}: {item.next_service_mileage ? `${item.next_service_mileage} KM` : t('maintenance.dueSoon')}
            </Text>
          </View>
        </View>
        {getStatusBadge()}
      </View>

      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${percentage}%`,
                backgroundColor: item.status === 'due' || item.status === 'overdue' ? styles.badgeWarning.borderColor : styles.iconPrimary.color,
              },
            ]}
          />
        </View>
        <Text style={styles.percentText}>{percentage}%</Text>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      gap: 12,
    },
    topLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconPrimary: {
      color: colors.primary,
    },
    textContainer: {
      flex: 1,
    },
    nameText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    categoryText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '500',
      marginTop: 2,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    badgeWarning: {
      backgroundColor: colors.warningBg,
      borderColor: colors.warning,
    },
    badgeWarningText: {
      color: colors.warning,
    },
    badgeSuccess: {
      backgroundColor: colors.successBg,
      borderColor: colors.success,
    },
    badgeSuccessText: {
      color: colors.success,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    track: {
      flex: 1,
      height: 6,
      backgroundColor: isDark ? colors.surfaceHighest : '#E2E8F0',
      borderRadius: 3,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 3,
    },
    percentText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
      width: 36,
      textAlign: 'right',
    },
  });
