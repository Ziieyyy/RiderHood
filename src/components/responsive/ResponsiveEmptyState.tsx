import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';
import { CustomButton } from '../CustomButton';

interface ResponsiveEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ResponsiveEmptyState: React.FC<ResponsiveEmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actionRow}>
          {secondaryActionLabel && onSecondaryAction && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onSecondaryAction}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>{secondaryActionLabel}</Text>
            </TouchableOpacity>
          )}

          {actionLabel && onAction && (
            <CustomButton
              title={actionLabel}
              onPress={onAction}
              style={{ minWidth: 160 }}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cards,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginVertical: 12,
    width: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 420,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
