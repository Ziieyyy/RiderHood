import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
} from 'react-native';
import { AppThemeColors } from '../constants/theme';
import { useThemedStyles } from '../context/ThemeContext';

interface VerificationCodeInputProps {
  code: string[];
  setCode: (code: string[]) => void;
  length?: number;
  hasError?: boolean;
  disabled?: boolean;
  onCodeComplete?: (fullCode: string) => void;
}

export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  code,
  setCode,
  length = 8,
  hasError = false,
  disabled = false,
  onCodeComplete,
}) => {
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const totalSlots = length || code.length || 8;
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    // Auto-focus first empty input on mount
    const firstEmptyIndex = code.findIndex((d) => !d);
    if (firstEmptyIndex !== -1) {
      inputsRef.current[firstEmptyIndex]?.focus();
    } else {
      inputsRef.current[0]?.focus();
    }
  }, []);

  const handleChangeText = (text: string, index: number) => {
    if (disabled) return;

    // Handle full paste (e.g., pasting "43322739" or "482913")
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.length > 1) {
      const newCode = Array.from({ length: totalSlots }, (_, i) => digitsOnly[i] || '');
      setCode(newCode);

      const enteredCode = newCode.filter(Boolean).join('');
      if (enteredCode.length >= 6) {
        const lastFilled = Math.min(enteredCode.length - 1, totalSlots - 1);
        inputsRef.current[lastFilled]?.focus();
        onCodeComplete?.(enteredCode);
      } else {
        const nextEmpty = newCode.findIndex((d) => !d);
        if (nextEmpty !== -1) {
          inputsRef.current[nextEmpty]?.focus();
        }
      }
      return;
    }

    // Single digit input
    const singleDigit = digitsOnly.slice(-1);
    const newCode = [...code];
    // Ensure array is totalSlots long
    while (newCode.length < totalSlots) newCode.push('');
    newCode[index] = singleDigit;
    setCode(newCode);

    if (singleDigit) {
      // Advance focus to next input
      if (index < totalSlots - 1) {
        inputsRef.current[index + 1]?.focus();
      } else {
        inputsRef.current[index]?.blur();
      }

      const enteredCode = newCode.filter(Boolean).join('');
      if (enteredCode.length === totalSlots || (index >= 5 && enteredCode.length >= 6)) {
        onCodeComplete?.(enteredCode);
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Move to previous box and clear
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputsRef.current[index - 1]?.focus();
      } else if (code[index]) {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSlots }).map((_, index) => {
        const digit = code[index] || '';
        const isFilled = Boolean(digit);

        return (
          <View
            key={index}
            style={[
              styles.boxWrapper,
              isFilled && styles.boxWrapperFilled,
              hasError && styles.boxWrapperError,
            ]}
          >
            <TextInput
              ref={(ref) => {
                inputsRef.current[index] = ref;
              }}
              style={[
                styles.input,
                isFilled && styles.inputFilled,
                hasError && styles.inputError,
              ]}
              value={digit}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={totalSlots}
              selectTextOnFocus
              editable={!disabled}
              textAlign="center"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
            />
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors: AppThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      gap: 6,
      marginVertical: 12,
      flexWrap: 'nowrap',
    },
    boxWrapper: {
      flex: 1,
      height: 50,
      maxWidth: 42,
      minWidth: 32,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        web: {
          outlineStyle: 'none',
        },
      }),
    },
    boxWrapperFilled: {
      borderColor: colors.primary,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)',
    },
    boxWrapperError: {
      borderColor: colors.danger,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
    },
    input: {
      width: '100%',
      height: '100%',
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
      padding: 0,
    },
    inputFilled: {
      color: colors.primary,
    },
    inputError: {
      color: colors.danger,
    },
  });
