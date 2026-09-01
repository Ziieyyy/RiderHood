import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, AppThemeColors } from '../../constants/theme';
import {
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2,
  ShieldAlert,
  Clock,
  KeyRound,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { PasswordInput } from '../../components/PasswordInput';
import { VerificationCodeInput } from '../../components/VerificationCodeInput';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { AppLogo } from '../../components/AppLogo';
import { supabase } from '../../lib/supabase';
import {
  requestResetCode,
  verifyResetCode,
  completePasswordReset,
} from '../../services/passwordResetService';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';

type ResetStep = 'email' | 'verify' | 'new_password' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Wizard state
  const [step, setStep] = useState<ResetStep>('email');

  // Form Data
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI / Error State
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [requestsRemaining, setRequestsRemaining] = useState<number | null>(null);

  // Rate Limiting & Cooldown Timers
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeExpirySeconds, setCodeExpirySeconds] = useState(0);
  const [rateLimitBlockMinutes, setRateLimitBlockMinutes] = useState<number | null>(null);

  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for Supabase password recovery link click or URL tokens
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
        setStep('new_password');
      }
    });

    if (typeof window !== 'undefined' && window.location) {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token')) {
        setStep('new_password');
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Resend Cooldown Countdown (60 seconds)
  useEffect(() => {
    if (resendCooldown > 0) {
      resendTimerRef.current = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    };
  }, [resendCooldown]);

  // Code Expiry Countdown (5 minutes)
  useEffect(() => {
    if (codeExpirySeconds > 0) {
      expiryTimerRef.current = setTimeout(() => {
        setCodeExpirySeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [codeExpirySeconds]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Step 1: Request Verification Code ──────────────────────────────
  const handleRequestCode = async (isResend = false) => {
    setErrorText('');
    setInfoText('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorText(t('auth.invalidEmail'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorText(t('auth.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      const res = await requestResetCode(trimmedEmail);

      if (!res.success) {
        if (res.error === 'rate_limited') {
          const minutes = res.remaining_minutes || Math.ceil((res.retry_after_seconds || 900) / 60);
          setRateLimitBlockMinutes(minutes);
          setErrorText(
            `${t('auth.tooManyRequests')} ${t('auth.tryAgainInMinutes', { minutes })}`
          );
        } else if (res.error === 'resend_cooldown') {
          setResendCooldown(res.retry_after_seconds || 60);
          setErrorText(res.message || 'Please wait before requesting another code.');
        } else {
          setErrorText(res.message || t('auth.generalErrorMsg'));
        }
        return;
      }

      // Success
      setMaskedEmail(res.masked_email || trimmedEmail);
      setResendCooldown(res.cooldown_seconds || 60);
      setCodeExpirySeconds(res.expires_in_seconds || 300);
      setRateLimitBlockMinutes(null);
      if (typeof res.requests_remaining === 'number') {
        setRequestsRemaining(res.requests_remaining);
      }

      if (isResend) {
        setCodeDigits(['', '', '', '', '', '', '', '']);
        setInfoText(t('auth.codeSentTo') + ' ' + (res.masked_email || trimmedEmail));
      } else {
        setStep('verify');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify 6 or 8 Digit Code ──────────────────────────────
  const handleVerifyCode = async (codeToVerify?: string) => {
    setErrorText('');
    setInfoText('');

    const fullCode = (codeToVerify || codeDigits.filter(Boolean).join('')).trim();
    if (fullCode.length < 6) {
      setErrorText('Please enter the verification code.');
      return;
    }

    if (codeExpirySeconds <= 0) {
      setErrorText(t('auth.codeExpired'));
      return;
    }

    setLoading(true);
    try {
      const res = await verifyResetCode(email, fullCode);

      if (!res.success) {
        if (res.error === 'code_expired') {
          setErrorText(t('auth.codeExpired'));
        } else if (res.error === 'too_many_attempts') {
          setErrorText(t('auth.tooManyAttempts'));
        } else if (res.error === 'incorrect_code') {
          setErrorText(res.message || 'Incorrect verification code.');
        } else {
          setErrorText(res.message || 'Verification failed. Please try again.');
        }
        return;
      }

      // Code Verified -> Store Reset Token & Advance to Password Step
      setResetToken(res.reset_token || '');
      setStep('new_password');
    } finally {
      setLoading(false);
    }
  };

  // ─── Password Strength Calculations ─────────────────────────────────
  const hasMinLength = newPassword.length >= 12;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);

  const passedRules = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(
    Boolean
  ).length;

  let strengthLabel = t('auth.strengthWeak');
  let strengthColor = COLORS.danger;
  let strengthProgress = 0.2;

  if (passedRules === 5 && newPassword.length >= 14) {
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

  // ─── Step 3: Complete Password Reset ─────────────────────────────────
  const handleSaveNewPassword = async () => {
    setErrorText('');

    if (!isPasswordValid) {
      setErrorText('Please satisfy all password security requirements.');
      return;
    }

    setLoading(true);
    try {
      const res = await completePasswordReset(email, resetToken, newPassword);

      if (!res.success) {
        if (res.error === 'weak_password') {
          setErrorText(res.message || 'Password does not meet security requirements.');
        } else if (res.error === 'session_expired' || res.error === 'invalid_session') {
          setErrorText(res.message || 'Reset session expired. Please request a new code.');
        } else {
          setErrorText(res.message || 'Failed to update password. Please try again.');
        }
        return;
      }

      // Password Changed Successfully
      setStep('success');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ResponsiveContainer maxWidth={480}>
          {/* Back Button */}
          {step !== 'success' ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (step === 'verify') setStep('email');
                else if (step === 'new_password') setStep('verify');
                else router.replace('/(auth)/welcome');
              }}
            >
              <ArrowLeft color={colors.textPrimary} size={20} />
              <Text style={styles.backText}>{t('navigation.backToLogin')}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <AppLogo size={52} containerStyle={{ marginBottom: 10 }} />
            <Text style={styles.brandTitle}>RIDERHOOD</Text>
            <Text style={styles.brandSubtitle}>Premium Motor Care</Text>
          </View>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 1: ENTER REGISTERED EMAIL                             */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 'email' && (
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>{t('auth.forgotPassword')}</Text>
                <Text style={styles.subtitle}>{t('auth.resetPasswordSub')}</Text>
              </View>

              <View style={styles.card}>
                {rateLimitBlockMinutes ? (
                  <View style={styles.rateLimitBanner}>
                    <ShieldAlert color={colors.danger} size={20} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rateLimitTitle}>{t('auth.tooManyRequests')}</Text>
                      <Text style={styles.rateLimitSub}>
                        {t('auth.tryAgainInMinutes', { minutes: rateLimitBlockMinutes })}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('auth.registeredEmail').toUpperCase()}</Text>
                  <View style={[styles.inputBox, errorText ? styles.inputBoxError : null]}>
                    <Mail color={colors.textSecondary} size={18} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (errorText) setErrorText('');
                      }}
                      placeholder="your.email@riderhood.app"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!loading}
                    />
                  </View>
                  {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                </View>

                <CustomButton
                  title={loading ? t('auth.sendingRequest') : t('auth.sendResetLink')}
                  onPress={() => handleRequestCode(false)}
                  icon={loading ? <ActivityIndicator color={isDark ? '#000' : '#FFF'} size="small" /> : <Send color={isDark ? '#000' : '#FFF'} size={18} />}
                  disabled={loading || Boolean(rateLimitBlockMinutes)}
                  style={{ marginTop: 6 }}
                />
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 2: ENTER 6-DIGIT VERIFICATION CODE                    */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 'verify' && (
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>{t('auth.verifyCodeTitle')}</Text>
                <Text style={styles.subtitle}>
                  {t('auth.codeSentTo')}{' '}
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{maskedEmail}</Text>
                </Text>
              </View>

              <View style={styles.card}>
                {rateLimitBlockMinutes ? (
                  <View style={styles.rateLimitBanner}>
                    <ShieldAlert color={colors.danger} size={20} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rateLimitTitle}>{t('auth.tooManyRequests')}</Text>
                      <Text style={styles.rateLimitSub}>
                        {t('auth.tryAgainInMinutes', { minutes: rateLimitBlockMinutes })}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {infoText ? (
                  <View style={styles.infoBanner}>
                    <CheckCircle2 color={colors.success} size={16} />
                    <Text style={styles.infoText}>{infoText}</Text>
                  </View>
                ) : null}

                {/* OTP Verification Boxes (Supports 6 to 8 digits) */}
                <VerificationCodeInput
                  code={codeDigits}
                  length={8}
                  setCode={(newDigits) => {
                    setCodeDigits(newDigits);
                    if (errorText) setErrorText('');
                  }}
                  hasError={Boolean(errorText)}
                  disabled={loading}
                  onCodeComplete={(completedCode) => handleVerifyCode(completedCode)}
                />

                {/* Code Expiry Timer */}
                <View style={styles.timerRow}>
                  <Clock color={codeExpirySeconds > 60 ? colors.textSecondary : colors.danger} size={15} />
                  <Text
                    style={[
                      styles.timerText,
                      codeExpirySeconds <= 60 && { color: colors.danger, fontWeight: '800' },
                    ]}
                  >
                    {t('auth.codeExpiresIn')}:{' '}
                    <Text style={{ fontWeight: '800' }}>{formatTime(codeExpirySeconds)}</Text>
                  </Text>
                </View>

                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

                {/* Verify Button */}
                <CustomButton
                  title={loading ? t('auth.verifyingCode') : t('auth.verifyCode')}
                  onPress={() => handleVerifyCode()}
                  icon={loading ? <ActivityIndicator color={isDark ? '#000' : '#FFF'} size="small" /> : <KeyRound color={isDark ? '#000' : '#FFF'} size={18} />}
                  disabled={loading || codeDigits.filter(Boolean).length < 6 || codeExpirySeconds <= 0}
                  style={{ marginTop: 4 }}
                />

                {/* Direct Link or OTP Tip */}
                <View style={styles.magicLinkTip}>
                  <ExternalLink color={colors.primary} size={15} />
                  <Text style={styles.magicLinkTipText}>
                    Received an 8-digit code or link in your email? Enter your verification code above, or click the email link.
                  </Text>
                </View>

                {/* Resend Code Section with Cooldown */}
                <View style={styles.resendSection}>
                  {resendCooldown > 0 ? (
                    <Text style={styles.cooldownText}>
                      {t('auth.resendIn')}{' '}
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>{resendCooldown}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={() => handleRequestCode(true)}
                      disabled={loading || Boolean(rateLimitBlockMinutes)}
                    >
                      <RotateCcw color={colors.primary} size={15} />
                      <Text style={styles.resendBtnText}>{t('auth.resendCode')}</Text>
                    </TouchableOpacity>
                  )}

                  {requestsRemaining !== null ? (
                    <Text style={styles.requestsLeftText}>
                      {t('auth.requestsRemaining', { count: requestsRemaining })}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 3: CREATE NEW 12+ CHAR PASSWORD                      */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 'new_password' && (
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>{t('auth.createNewPassword')}</Text>
                <Text style={styles.subtitle}>{t('auth.createNewPasswordSub')}</Text>
              </View>

              <View style={styles.card}>
                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('settings.newPassword').toUpperCase()}</Text>
                  <PasswordInput
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (errorText) setErrorText('');
                    }}
                    placeholder={t('auth.newPasswordPlaceholder')}
                    editable={!loading}
                  />
                </View>

                {/* Strength Meter */}
                {newPassword ? (
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

                {/* Confirm Password */}
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

                {/* Security Requirements Checklist */}
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
                  onPress={handleSaveNewPassword}
                  icon={loading ? <ActivityIndicator color={isDark ? '#000' : '#FFF'} size="small" /> : <Sparkles color={isDark ? '#000' : '#FFF'} size={18} />}
                  disabled={loading || !isPasswordValid}
                  style={{ marginTop: 4 }}
                />
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 4: PASSWORD UPDATED SUCCESSFULLY                      */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 'success' && (
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 color={colors.success} size={48} />
              </View>

              <Text style={styles.successTitle}>{t('auth.passwordUpdatedSuccess')}</Text>
              <Text style={styles.successSub}>{t('auth.passwordUpdatedSuccessDesc')}</Text>

              <CustomButton
                title={t('auth.backToLogin')}
                onPress={async () => {
                  try {
                    await supabase.auth.signOut();
                  } catch {}
                  router.replace('/(auth)/welcome');
                }}
                style={{ width: '100%', marginTop: 24 }}
              />
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>
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
    inputBoxError: {
      borderColor: colors.danger,
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 2,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.15)',
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.4)',
    },
    infoText: {
      color: colors.success,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    rateLimitBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.15)',
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.5)',
    },
    rateLimitTitle: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '800',
    },
    rateLimitSub: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    timerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginVertical: 4,
    },
    timerText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    magicLinkTip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(255, 122, 0, 0.08)' : 'rgba(255, 107, 0, 0.1)',
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 122, 0, 0.25)' : 'rgba(255, 107, 0, 0.3)',
      marginVertical: 4,
    },
    magicLinkTipText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '600',
      flex: 1,
      lineHeight: 15,
    },
    resendSection: {
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    resendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    resendBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    cooldownText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    requestsLeftText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '500',
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
    successContainer: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 24,
      padding: 28,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    successIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.18)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.4)',
    },
    successTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 8,
    },
    successSub: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: 12,
    },
  });
