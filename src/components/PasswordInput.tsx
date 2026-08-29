import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { useThemedStyles } from '../context/ThemeContext';
import { DARK_COLORS } from '../constants/theme';

export interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  errorText?: string;
  disabled?: boolean;
}

export function calculatePasswordStrength(password: string, colors: typeof DARK_COLORS): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: '', color: 'transparent' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', color: colors.danger };
    case 2:
      return { score: 2, label: 'Fair', color: colors.warning };
    case 3:
      return { score: 3, label: 'Good', color: '#10B981' };
    case 4:
      return { score: 4, label: 'Strong', color: colors.success };
    default:
      return { score: 0, label: 'Too short', color: colors.danger };
  }
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder = '••••••••••••',
  showStrength = false,
  errorText,
  disabled = false,
  style,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const styles = useThemedStyles(createStyles);
  const strength = calculatePasswordStrength(value, styles.colorsToken);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputBox,
          errorText ? styles.inputBoxError : null,
          disabled ? styles.inputBoxDisabled : null,
        ]}
      >
        <Lock color={styles.iconLock.color} size={18} />

        <TextInput
          style={[styles.input, style]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          placeholder={placeholder}
          placeholderTextColor={styles.placeholder.color}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />

        <TouchableOpacity
          style={styles.eyeBtn}
          activeOpacity={0.7}
          onPress={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff color={styles.eyeActive.color} size={18} />
          ) : (
            <Eye color={styles.iconLock.color} size={18} />
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      {/* Password Strength Indicator */}
      {showStrength && value.length > 0 && !errorText ? (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBars}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.bar,
                  {
                    backgroundColor:
                      step <= strength.score ? strength.color : styles.barInactive.backgroundColor,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.strengthText, { color: strength.color }]}>
            {strength.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    colorsToken: colors as any,
    container: {
      gap: 6,
      width: '100%',
    },
    label: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconLock: {
      color: colors.textSecondary,
    },
    placeholder: {
      color: colors.textMuted,
    },
    eyeActive: {
      color: colors.primary,
    },
    inputBoxError: {
      borderColor: colors.danger,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.08)',
    },
    inputBoxDisabled: {
      opacity: 0.6,
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    eyeBtn: {
      padding: 6,
    },
    errorText: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    strengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      gap: 8,
    },
    strengthBars: {
      flex: 1,
      flexDirection: 'row',
      gap: 4,
    },
    bar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    barInactive: {
      backgroundColor: colors.border,
    },
    strengthText: {
      fontSize: 11,
      fontWeight: '700',
    },
  });
