import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { User, Mail, Phone, Bike, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { PasswordInput } from '../../components/PasswordInput';
import { PasswordSecurityModal, PasswordModalMode } from '../../components/PasswordSecurityModal';
import { signUp } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [confirmError, setConfirmError] = useState('');

  // Security Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<PasswordModalMode>('wrong_password');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const handleRegister = async () => {
    setErrorText('');
    setConfirmError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) {
      setModalMode('general_error');
      setModalTitle('Missing Information');
      setModalMessage('Please enter your full name.');
      setModalVisible(true);
      return;
    }
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setModalMode('invalid_email');
      setModalTitle('Invalid Email');
      setModalMessage('Please enter a valid email address.');
      setModalVisible(true);
      return;
    }
    if (!password || password.length < 6) {
      setModalMode('wrong_password');
      setModalTitle('Weak Password');
      setModalMessage('Password must be at least 6 characters long.');
      setModalVisible(true);
      return;
    }
    if (password !== confirmPassword) {
      setModalMode('wrong_password');
      setModalTitle('Passwords Do Not Match');
      setModalMessage('The passwords you entered do not match. Please verify and try again.');
      setModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        full_name: name.trim(),
        phone: phone.trim() || undefined,
      });

      // Attempt login post signup
      const result = await login(email.trim(), password);
      if (!result.success) {
        if (result.errorType === 'email_not_confirmed') {
          setModalMode('email_not_confirmed');
          setModalTitle('Verification Email Sent');
          setModalMessage('Account registered successfully! Please check your email inbox to verify your account before logging in.');
          setModalVisible(true);
        } else {
          setModalMode('reset_email_sent');
          setModalTitle('Account Created');
          setModalMessage('Your account has been registered successfully! You can now sign in.');
          setModalVisible(true);
        }
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('user_already_exists') || msg.includes('already exists')) {
        setModalMode('general_error');
        setModalTitle('Account Already Exists');
        setModalMessage('An account with this email address already exists. Please sign in instead.');
      } else if (msg.includes('invalid email') || msg.includes('email format')) {
        setModalMode('invalid_email');
        setModalTitle('Invalid Email Format');
        setModalMessage('Please enter a valid email address.');
      } else if (msg.includes('weak') || msg.includes('password')) {
        setModalMode('wrong_password');
        setModalTitle('Weak Password');
        setModalMessage('Please choose a stronger password.');
      } else if (msg.includes('rate limit')) {
        setModalMode('general_error');
        setModalTitle('Email Rate Limit Exceeded');
        setModalMessage('Supabase default email rate limit reached.\n\nWorkaround:\n1. Disable "Confirm email" in Supabase Auth settings.\n2. Or wait ~1 hour before attempting registration again.');
      } else {
        setModalMode('general_error');
        setModalTitle('Registration Failed');
        setModalMessage(err?.message || 'Unable to complete account registration. Please try again.');
      }
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ArrowLeft color={COLORS.textPrimary} size={20} />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.brandHeader}>
            <Text style={styles.brandTitle}>Create Rider Account</Text>
            <Text style={styles.brandSubtitle}>Join the RiderHood Telemetry & Service Network</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View style={styles.inputBox}>
                <User color={COLORS.textSecondary} size={18} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Alex Rivera"
                  placeholderTextColor={COLORS.textMuted}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputBox}>
                <Mail color={COLORS.textSecondary} size={18} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="alex@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER (OPTIONAL)</Text>
              <View style={styles.inputBox}>
                <Phone color={COLORS.textSecondary} size={18} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+60 12-345 6789"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password input with strength indicator */}
            <PasswordInput
              label="PASSWORD"
              value={password}
              onChangeText={setPassword}
              placeholder="create password"
              showStrength
              errorText={errorText}
              disabled={loading}
            />

            {/* Confirm Password input */}
            <PasswordInput
              label="CONFIRM PASSWORD"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="re-enter password"
              errorText={confirmError}
              disabled={loading}
            />

            <CustomButton
              title={loading ? 'CREATING ACCOUNT...' : 'CREATE & ENTER DASHBOARD'}
              onPress={handleRegister}
              icon={<ArrowRight color="#000" size={18} />}
              disabled={loading}
              style={{ marginTop: 10 }}
            />
          </View>

          <View style={styles.bottomActions}>
            <Text style={styles.existingText}>Already registered?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/welcome')}>
              <Text style={styles.loginText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PasswordSecurityModal
        visible={modalVisible}
        mode={modalMode}
        customTitle={modalTitle}
        customMessage={modalMessage}
        onClose={() => setModalVisible(false)}
        onAction={() => {
          if (modalMode === 'email_not_confirmed' || modalMode === 'reset_email_sent') {
            router.replace('/(auth)/welcome');
          }
        }}
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '900',
  },
  brandSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
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
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  existingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  loginText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
