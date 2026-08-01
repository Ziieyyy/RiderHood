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
import { COLORS } from '../constants/theme';

export interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  errorText?: string;
  disabled?: boolean;
}

export function calculatePasswordStrength(password: string): {
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
      return { score: 1, label: 'Weak', color: COLORS.danger };
    case 2:
      return { score: 2, label: 'Fair', color: COLORS.warning };
    case 3:
      return { score: 3, label: 'Good', color: '#6EE7B7' };
    case 4:
      return { score: 4, label: 'Strong', color: COLORS.success };
    default:
      return { score: 0, label: 'Too short', color: COLORS.danger };
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
  const strength = calculatePasswordStrength(value);

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
        <Lock color={COLORS.textSecondary} size={18} />

        <TextInput
          style={[styles.input, style]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
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
            <EyeOff color={COLORS.primary} size={18} />
          ) : (
            <Eye color={COLORS.textSecondary} size={18} />
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
                      step <= strength.score ? strength.color : COLORS.border,
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

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: '100%',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputBoxError: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  inputBoxDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  errorText: {
    color: COLORS.danger,
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
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
