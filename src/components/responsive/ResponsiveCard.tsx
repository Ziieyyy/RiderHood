import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../context/ThemeContext';

interface ResponsiveCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  active?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  glow?: boolean;
}

/**
 * ResponsiveCard
 * Theme-compliant card component with responsive padding and hover/active states.
 */
export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  style,
  elevated = false,
  active = false,
  onPress,
  accessibilityLabel,
  glow = false,
}) => {
  const { cardPadding } = useResponsive();
  const { colors } = useTheme();

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      padding: cardPadding,
      backgroundColor: elevated ? colors.elevatedCards : colors.cards,
      borderColor: active ? colors.primary : colors.border,
    },
    glow && SHADOWS.orangeGlow,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
