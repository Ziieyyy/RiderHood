import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, AppThemeColors } from '../../constants/theme';
import { ArrowLeft, CheckCircle2, KeyRound, Sparkles } from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { PasswordInput } from '../../components/PasswordInput';
import { PasswordSecurityModal, type PasswordModalMode } from '../../components/PasswordSecurityModal';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { AppLogo } from '../../components/AppLogo';
import { supabase } from '../../lib/supabase';
import { updatePassword } from '../../services/authService';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<PasswordModalMode>('password_changed');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        // Session active and ready for password update
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Password validation checks (12+ chars, uppercase, lowercase, number, symbol, matching)
  const hasMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isMatch = Boolean(password && confirmPassword && password === confirmPassword);

  const passedRules = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(
    Boolean
  ).length;

  let strengthLabel = t('auth.strengthWeak');
  let strengthColor = COLORS.danger;
  let strengthProgress = 0.2;

  if (passedRules === 5 && password.length >= 14) {
    strengthLabel = t('auth.strengthVeryStrong');
    strengthColor = COLORS.success;
    strengthProgress = 1.0;
  } else if (passedRules >= 4) {
    strengthLabel = t('auth.strengthStrong');
    strengthColor = COLORS.success;
    strengthProgress = 0.8;
  } else if (passedRules >= 3) {
    strengthLabel = t('auth.strengthFair');
    strengthColor = '#f59e0b';
    strengthProgress = 0.55;
  }

  const isPasswordValid = passedRules === 5 && isMatch;

  const handleUpdatePassword = async () => {
    setErrorText('');

    if (!isPasswordValid) {
      setErrorText('Please satisfy all password requirements.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setModalMode('password_changed');
      setModalVisible(true);
    } catch (err: any) {
      setErrorText(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer maxWidth={480}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/welcome')}>
            <ArrowLeft color={colors.textPrimary} size={20} />
            <Text style={styles.backText}>{t('navigation.backToLogin')}</Text>
          </TouchableOpacity>

          <View style={styles.brandHeader}>
            <AppLogo size={52} containerStyle={{ marginBottom: 10 }} />
            <Text style={styles.brandTitle}>RIDERHOOD</Text>
            <Text style={styles.brandSubtitle}>Premium Motor Care</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.createNewPassword')}</Text>
            <Text style={styles.subtitle}>{t('auth.createNewPasswordSub')}</Text>
          </View>

          <View style={styles.card}>
            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('settings.newPassword').toUpperCase()}</Text>
              <PasswordInput
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorText) setErrorText('');
                }}
                placeholder={t('auth.newPasswordPlaceholder')}
                editable={!loading}
              />
            </View>

            {/* Strength Meter */}
            {password ? (
              <View style={styles.strengthWrapper}>
                <View style={styles.strengthHeader}>
                  <Text style={styles.strengthTitle}>Password Strength:</Text>
                  <Text style={[styles.strengthBadge, { color: strengthColor }]}>
                    {strengthLabel}
                  </Text>
                </View>
                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthBar,
                      {
                        width: `${strengthProgress * 100}%`,
                        backgroundColor: strengthColor,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}

            {/* Confirm New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('settings.confirmNewPassword').toUpperCase()}</Text>
              <PasswordInput
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  if (errorText) setErrorText('');
                }}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                editable={!loading}
              />
            </View>

            {/* Password Checklist */}
            <View style={styles.checklistCard}>
              <View style={styles.checkItem}>
                <CheckCircle2 color={hasMinLength ? colors.success : colors.textMuted} size={15} />
                <Text style={[styles.checkText, hasMinLength && styles.checkTextActive]}>
                  {t('auth.ruleMinLength')}
                </Text>
              </View>
              <View style={styles.checkItem}>
                <CheckCircle2 color={hasUppercase ? colors.success : colors.textMuted} size={15} />
                <Text style={[styles.checkText, hasUppercase && styles.checkTextActive]}>
                  {t('auth.ruleUppercase')}
                </Text>
              </View>
              <View style={styles.checkItem}>
                <CheckCircle2 color={hasLowercase ? colors.success : colors.textMuted} size={15} />
                <Text style={[styles.checkText, hasLowercase && styles.checkTextActive]}>
                  {t('auth.ruleLowercase')}
                </Text>
              </View>
              <View style={styles.checkItem}>
                <CheckCircle2 color={hasNumber ? colors.success : colors.textMuted} size={15} />
                <Text style={[styles.checkText, hasNumber && styles.checkTextActive]}>
                  {t('auth.ruleNumber')}
                </Text>
              </View>
              <View style={styles.checkItem}>
                <CheckCircle2 color={hasSpecial ? colors.success : colors.textMuted} size={15} />
                <Text style={[styles.checkText, hasSpecial && styles.checkTextActive]}>
                  {t('auth.ruleSpecial')}
                </Text>
              </View>
              <View style={styles.checkItem}>
                <CheckCircle2 color={isMatch ? colors.success : colors.textMuted} size={15} />
                <Text style={[styles.checkText, isMatch && styles.checkTextActive]}>
                  {t('auth.ruleMatch')}
                </Text>
              </View>
            </View>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <CustomButton
              title={loading ? t('auth.savingNewPassword') : t('auth.saveNewPassword')}
              onPress={handleUpdatePassword}
              icon={loading ? <ActivityIndicator color={isDark ? '#000' : '#FFF'} size="small" /> : <Sparkles color={isDark ? '#000' : '#FFF'} size={18} />}
              disabled={loading || !isPasswordValid}
              style={{ marginTop: 4 }}
            />
          </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Password Changed Modal */}
      <PasswordSecurityModal
        visible={modalVisible}
        mode={modalMode}
        onClose={async () => {
          setModalVisible(false);
          try {
            await supabase.auth.signOut();
          } catch {}
          router.replace('/(auth)/welcome');
        }}
        onAction={async () => {
          setModalVisible(false);
          try {
            await supabase.auth.signOut();
          } catch {}
          router.replace('/(auth)/welcome');
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: AppThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 24,
      minHeight: '100%',
      justifyContent: 'center',
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    backText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    brandHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    brandLogoImg: {
      width: 60,
      height: 60,
      marginBottom: 8,
    },
    brandTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 1,
    },
    brandSubtitle: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      marginTop: 4,
      textAlign: 'center',
      lineHeight: 18,
    },
    card: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    strengthWrapper: {
      backgroundColor: colors.surface,
      padding: 10,
      borderRadius: 12,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    strengthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    strengthTitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    strengthBadge: {
      fontSize: 11,
      fontWeight: '800',
    },
    strengthTrack: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    strengthBar: {
      height: '100%',
      borderRadius: 2,
    },
    checklistCard: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    checkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    checkText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    checkTextActive: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 2,
    },
  });
