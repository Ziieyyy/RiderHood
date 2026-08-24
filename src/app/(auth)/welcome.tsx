import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Cpu, Mail, ArrowRight, Wrench, ShieldCheck } from 'lucide-react-native';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { LanguageSelector } from '../../components/LanguageSelector';
import { PasswordInput } from '../../components/PasswordInput';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import {
  PasswordSecurityModal,
  PasswordModalMode,
} from '../../components/PasswordSecurityModal';
import { resendConfirmationEmail } from '../../services/authService';


export default function WelcomeScreen() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Security Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<PasswordModalMode>('wrong_password');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [secondaryText, setSecondaryText] = useState<string | undefined>(undefined);
  const [secondaryAction, setSecondaryAction] = useState<(() => void) | undefined>(undefined);

  const handleResendConfirmation = async () => {
    try {
      await resendConfirmationEmail(email.trim());
      setModalMode('reset_email_sent');
      setModalTitle(t('auth.resetLinkSent'));
      setModalMessage(t('auth.resetLinkSentDesc'));
      setSecondaryText(undefined);
      setSecondaryAction(undefined);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setModalMode('general_error');
      setModalTitle(t('errors.genericTitle'));
      setModalMessage(error?.message || t('errors.genericMessage'));
      setSecondaryText(undefined);
      setSecondaryAction(undefined);
    }
  };

  const handleSignIn = async () => {
    setSecondaryText(undefined);
    setSecondaryAction(undefined);

    // Basic client-side email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setModalMode('invalid_email');
      setModalTitle(t('errors.requiredField'));
      setModalMessage(t('auth.fillAllFields'));
      setModalVisible(true);
      return;
    }

    if (!emailRegex.test(email.trim())) {
      setModalMode('invalid_email');
      setModalTitle(t('auth.invalidEmail'));
      setModalMessage(t('auth.invalidEmail'));
      setModalVisible(true);
      return;
    }

    if (!password) {
      setModalMode('wrong_password');
      setModalTitle(t('errors.requiredField'));
      setModalMessage(t('auth.fillAllFields'));
      setModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);

      if (result.success && result.profile) {
        // Redirection handled by RouteGuard in _layout.tsx
        // This is a safety fallback
        const role = result.profile.role;
        if (role === 'customer') {
          router.replace('/(customer)/home');
        } else if (role === 'workshop_admin') {
          router.replace('/(workshop)/dashboard');
        } else if (role === 'super_admin') {
          router.replace('/(admin)');
        }
      } else {
        // Handle all error cases with themed popups
        switch (result.errorType) {
          case 'email_not_confirmed':
            setModalMode('email_not_confirmed');
            setModalTitle(t('auth.resetPasswordTitle'));
            setModalMessage(
              result.errorMessage ||
                t('auth.resetLinkSentDesc')
            );
            setSecondaryText(t('auth.sendResetLink'));
            setSecondaryAction(() => handleResendConfirmation);
            break;
          case 'suspended':
            setModalMode('account_suspended');
            setModalTitle(t('errors.unauthorized'));
            setModalMessage(
              result.errorMessage ||
                t('auth.accountDisabled')
            );
            break;
          case 'pending':
            setModalMode('account_pending');
            setModalTitle(t('superAdmin.pending'));
            setModalMessage(
              result.errorMessage ||
                t('booking.pendingApproval')
            );
            break;
          case 'deleted':
            setModalMode('general_error');
            setModalTitle(t('errors.notFound'));
            setModalMessage(
              result.errorMessage ||
                t('auth.accountNotFound')
            );
            break;
          case 'rate_limit':
            setModalMode('rate_limit');
            setModalTitle(t('errors.tryAgainLater'));
            setModalMessage(
              result.errorMessage ||
                t('errors.tryAgainLater')
            );
            break;
          case 'invalid_email':
            setModalMode('invalid_email');
            setModalTitle(t('auth.invalidEmail'));
            setModalMessage(
              result.errorMessage || t('auth.invalidEmail')
            );
            break;
          case 'network_error':
            setModalMode('general_error');
            setModalTitle(t('errors.networkError'));
            setModalMessage(
              result.errorMessage ||
                t('errors.networkError')
            );
            break;
          case 'invalid_credentials':
          default:
            setModalMode('wrong_password');
            setModalTitle(t('errors.loginFailed'));
            setModalMessage(
              result.errorMessage ||
                t('auth.incorrectPassword')
            );
            break;
        }
        setModalVisible(true);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setModalMode('general_error');
      setModalTitle(t('errors.genericTitle'));
      setModalMessage(error?.message || t('errors.genericMessage'));
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ResponsiveContainer maxWidth={480}>
          {/* Language Switcher Bar */}
          <View style={{ marginBottom: 12 }}>
            <LanguageSelector variant="inline" />
          </View>

        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../../../assets/images/riderhood-logo.png')}
            style={styles.brandLogoImg}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>RIDERHOOD</Text>
          <Text style={styles.brandSubtitle}>Premium Moto Care</Text>

          <View style={styles.subHeaderBox}>
            <Text style={styles.welcomeTitle}>{t('auth.welcomeTitle')}</Text>
            <Text style={styles.welcomeSub}>{t('auth.welcomeSub')}</Text>
          </View>
        </View>

        {/* Unified Login Form */}
        <View style={styles.formCard}>
          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.emailAddress').toUpperCase()}</Text>
            <View style={styles.inputWrapper}>
              <Mail color={COLORS.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                accessibilityLabel={t('auth.emailAddress')}
              />
            </View>
          </View>

          {/* Password Field */}
          <PasswordInput
            label={t('auth.password').toUpperCase()}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            showStrength={false}
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityLabel={t('auth.forgotPassword')}
          >
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInBtn, (loading || authLoading) && styles.disabledBtn]}
            activeOpacity={0.8}
            onPress={handleSignIn}
            disabled={loading || authLoading}
            accessibilityLabel={t('auth.login')}
          >
            {loading || authLoading ? (
              <ActivityIndicator color={COLORS.primaryDark} size="small" />
            ) : (
              <>
                <Text style={styles.signInBtnText}>{t('auth.login').toUpperCase()}</Text>
                <ArrowRight color={COLORS.primaryDark} size={18} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Registration & Action Links */}
        <View style={styles.footerLinks}>
          <View style={styles.registerRow}>
            <Text style={styles.noAccountText}>{t('auth.dontHaveAccount')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.createAccountText}>{t('auth.createAccount')}</Text>
            </TouchableOpacity>
          </View>

          {/* Workshop Partner Register Link */}
          <TouchableOpacity
            style={styles.workshopRegBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/workshop-registration')}
            accessibilityLabel={t('auth.registerWorkshopPartner')}
          >
            <Wrench color="#f59e0b" size={14} />
            <Text style={styles.workshopRegText}>{t('auth.registerWorkshopPartner')}</Text>
          </TouchableOpacity>
        </View>

        {/* Security Footer Banner */}
        <View style={styles.securityBanner}>
          <ShieldCheck color={COLORS.primary} size={14} />
          <Text style={styles.securityText}>{t('auth.welcomeSub')}</Text>
        </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Password & Security Feedback Modal */}
      <PasswordSecurityModal
        visible={modalVisible}
        mode={modalMode}
        customTitle={modalTitle}
        customMessage={modalMessage}
        secondaryButtonText={secondaryText}
        onSecondaryAction={secondaryAction}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
    minHeight: '100%',
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogoImg: {
    width: 84,
    height: 84,
    marginBottom: 12,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 14,
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubtitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  subHeaderBox: {
    alignItems: 'center',
    marginTop: 16,
  },
  welcomeTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  welcomeSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  signInBtn: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  signInBtnText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  footerLinks: {
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noAccountText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  createAccountText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  workshopRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#261e0b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  workshopRegText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
