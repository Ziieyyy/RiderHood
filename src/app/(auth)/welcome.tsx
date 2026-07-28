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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Cpu, Mail, ArrowRight, ShieldCheck, Wrench } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { PasswordInput } from '../../components/PasswordInput';
import {
  PasswordSecurityModal,
  PasswordModalMode,
} from '../../components/PasswordSecurityModal';
import { resendConfirmationEmail } from '../../services/authService';

export default function WelcomeScreen() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();

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
      setModalTitle('Verification Sent');
      setModalMessage(`A new confirmation link has been sent to ${email.trim()}. Please check your inbox.`);
      setSecondaryText(undefined);
      setSecondaryAction(undefined);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setModalMode('general_error');
      setModalTitle('Unable to Resend');
      setModalMessage(error?.message || 'Could not send verification email. Please try again later.');
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
      setModalTitle('Missing Email');
      setModalMessage('Please enter your registered email address.');
      setModalVisible(true);
      return;
    }

    if (!emailRegex.test(email.trim())) {
      setModalMode('invalid_email');
      setModalTitle('Invalid Email Format');
      setModalMessage('Please enter a valid email address (e.g., rider@example.com).');
      setModalVisible(true);
      return;
    }

    if (!password) {
      setModalMode('wrong_password');
      setModalTitle('Missing Password');
      setModalMessage('Please enter your password to sign in.');
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
            setModalTitle('Email Confirmation Required');
            setModalMessage(
              result.errorMessage ||
                'Your email address has not been confirmed yet. Please check your inbox and verify your email before logging in.'
            );
            setSecondaryText('Resend Confirmation Email');
            setSecondaryAction(() => handleResendConfirmation);
            break;
          case 'suspended':
            setModalMode('account_suspended');
            setModalTitle('Account Suspended');
            setModalMessage(
              result.errorMessage ||
                'Your account has been suspended. Please contact RiderHood support.'
            );
            break;
          case 'pending':
            setModalMode('account_pending');
            setModalTitle('Application Pending');
            setModalMessage(
              result.errorMessage ||
                'Your account is still awaiting approval.'
            );
            break;
          case 'deleted':
            setModalMode('general_error');
            setModalTitle('Account Unavailable');
            setModalMessage(
              result.errorMessage ||
                'This account has been deleted. Please contact support.'
            );
            break;
          case 'rate_limit':
            setModalMode('rate_limit');
            setModalTitle('Too Many Attempts');
            setModalMessage(
              result.errorMessage ||
                'Security rate limit reached. Please wait a few moments before trying again.'
            );
            break;
          case 'invalid_email':
            setModalMode('invalid_email');
            setModalTitle('Invalid Email');
            setModalMessage(
              result.errorMessage || 'Please enter a valid email address.'
            );
            break;
          case 'network_error':
            setModalMode('general_error');
            setModalTitle('Connection Error');
            setModalMessage(
              'Unable to reach RiderHood authentication server. Please check your internet connection.'
            );
            break;
          default:
            setModalMode('wrong_password');
            setModalTitle('Incorrect Credentials');
            setModalMessage(
              'Incorrect email or password. Please check your details and try again.'
            );
            break;
        }
        setModalVisible(true);
      }
    } catch {
      setModalMode('general_error');
      setModalTitle('Authentication Error');
      setModalMessage('An unexpected error occurred. Please try again.');
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
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Cpu color={COLORS.primary} size={36} />
          </View>
          <Text style={styles.brandTitle}>RIDERHOOD</Text>
          <Text style={styles.brandSubtitle}>Premium Moto Care</Text>

          <View style={styles.subHeaderBox}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSub}>Sign in to continue to RiderHood</Text>
          </View>
        </View>

        {/* Unified Login Form */}
        <View style={styles.formCard}>
          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Mail color={COLORS.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                accessibilityLabel="Email address"
              />
            </View>
          </View>

          {/* Password Field */}
          <PasswordInput
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            showStrength={false}
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityLabel="Forgot password"
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInBtn, (loading || authLoading) && styles.disabledBtn]}
            activeOpacity={0.8}
            onPress={handleSignIn}
            disabled={loading || authLoading}
            accessibilityLabel="Sign in"
          >
            {loading || authLoading ? (
              <ActivityIndicator color={COLORS.primaryDark} size="small" />
            ) : (
              <>
                <Text style={styles.signInBtnText}>SIGN IN</Text>
                <ArrowRight color={COLORS.primaryDark} size={18} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Registration & Action Links */}
        <View style={styles.footerLinks}>
          <View style={styles.registerRow}>
            <Text style={styles.noAccountText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.createAccountText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Workshop Partner Register Link */}
          <TouchableOpacity
            style={styles.workshopRegBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/workshop-registration')}
            accessibilityLabel="Register workshop partner account"
          >
            <Wrench color="#f59e0b" size={14} />
            <Text style={styles.workshopRegText}>Register Workshop Partner Account</Text>
          </TouchableOpacity>
        </View>

        {/* Security Footer Banner */}
        <View style={styles.securityBanner}>
          <ShieldCheck color={COLORS.primary} size={14} />
          <Text style={styles.securityText}>Your motorcycle companion.</Text>
        </View>
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
