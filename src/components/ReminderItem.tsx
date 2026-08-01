import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import { MaintenanceReminder } from '../types/database';
import { Droplet, Disc, Link2, ShieldAlert, CheckCircle2 } from 'lucide-react-native';

interface ReminderItemProps {
  item: MaintenanceReminder;
}

export const ReminderItem: React.FC<ReminderItemProps> = ({ item }) => {
  const getIcon = () => {
    switch ((item.type || '').toLowerCase()) {
      case 'oil':
      case 'engine oil & filter':
        return <Droplet color={COLORS.primary} size={18} />;
      case 'brake':
      case 'front & rear brake pads':
        return <Disc color={item.status === 'due' || item.status === 'overdue' ? COLORS.warning : COLORS.primary} size={18} />;
      case 'chain':
      case 'drive chain & sprocket':
        return <Link2 color={COLORS.primary} size={18} />;
      default:
        return <CheckCircle2 color={COLORS.primary} size={18} />;
    }
  };

  const getStatusBadge = () => {
    if (item.status === 'due' || item.status === 'overdue') {
      return (
        <View style={[styles.badge, { backgroundColor: COLORS.warningBg, borderColor: COLORS.warning }]}>
          <ShieldAlert color={COLORS.warning} size={12} />
          <Text style={[styles.badgeText, { color: COLORS.warning }]}>CHECK SOON</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, { backgroundColor: COLORS.successBg, borderColor: COLORS.success }]}>
        <CheckCircle2 color={COLORS.success} size={12} />
        <Text style={[styles.badgeText, { color: COLORS.success }]}>OK</Text>
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
              {item.type} • Next: {item.next_service_mileage ? `${item.next_service_mileage} KM` : 'Due soon'}
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
                backgroundColor: item.status === 'due' || item.status === 'overdue' ? COLORS.warning : COLORS.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.percentText}>{percentage}%</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textContainer: {
    flex: 1,
  },
  nameText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryText: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surfaceHighest,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  percentText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
});
