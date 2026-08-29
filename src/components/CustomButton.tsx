import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useThemedStyles } from '../context/ThemeContext';
import { DARK_COLORS } from '../constants/theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  textStyle,
  disabled = false,
}) => {
  const styles = useThemedStyles(createStyles);

  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'danger':
        return styles.dangerContainer;
      default:
        return styles.primaryContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.baseButton, getContainerStyle(), disabled && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {icon}
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    baseButton: {
      height: 52,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      gap: 8,
    },
    primaryContainer: {
      backgroundColor: colors.primary,
    },
    primaryText: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    secondaryContainer: {
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    outlineContainer: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    outlineText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
    dangerContainer: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    dangerText: {
      color: colors.danger,
      fontSize: 15,
      fontWeight: '700',
    },
    disabled: {
      opacity: 0.5,
    },
  });
