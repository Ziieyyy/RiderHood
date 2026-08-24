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
import { COLORS } from '../../constants/theme';
import { Wrench, Mail, User, Phone, MapPin, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { PasswordInput } from '../../components/PasswordInput';
import { supabase } from '../../lib/supabase';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import {
  PasswordSecurityModal,
  PasswordModalMode,
} from '../../components/PasswordSecurityModal';
import { useTranslation } from '../../i18n';


export default function WorkshopRegistrationScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);

  // Security Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<PasswordModalMode>('account_pending');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !workshopName.trim()) {
      setModalMode('wrong_password');
      setModalTitle(t('auth.fillAllFields'));
      setModalMessage(t('auth.fillAllFields'));
      setModalVisible(true);
      return;
    }

    if (password !== confirmPassword) {
      setModalMode('wrong_password');
      setModalTitle(t('auth.passwordsMustMatch'));
      setModalMessage(t('auth.passwordsMustMatch'));
      setModalVisible(true);
      return;
    }

    if (password.length < 8) {
      setModalMode('wrong_password');
      setModalTitle(t('auth.passwordTooShort'));
      setModalMessage(t('auth.passwordTooShort'));
      setModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'workshop_admin',
          },
        },
      });

      if (authError) throw authError;

      const userId = authData.user?.id;

      if (userId) {
        // 2. Set profile status to 'active' for Workshop Admin
        await (supabase.from('profiles') as any)
          .update({
            status: 'active',
            role: 'workshop_admin',
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          })
          .eq('id', userId);

        // 3. Create Workshop record with 'approved' status
        await (supabase.from('workshops') as any).upsert({
          owner_id: userId,
          name: workshopName.trim(),
          phone: phone.trim() || null,
          email: email.trim(),
          district: district.trim() || 'Kuala Lumpur',
          verification_status: 'approved',
          status: 'active',
        });

        // 4. Navigate directly to Workshop Dashboard upon successful setup
        router.replace('/(workshop)/dashboard');
        return;
      }
    } catch (err: any) {
      const isRateLimit = (err?.message || '').toLowerCase().includes('rate limit');
      setModalMode('wrong_password');
      setModalTitle(isRateLimit ? 'Email Rate Limit Exceeded' : 'Registration Failed');
      setModalMessage(
        isRateLimit
          ? 'Supabase default email rate limit reached.\n\nWorkaround:\n1. Go to Supabase Dashboard -> Authentication -> Providers -> Email.\n2. Turn OFF "Confirm email".\n3. Retry registration.'
          : err?.message || 'Unable to complete workshop registration. Please check your information.'
      );
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    if (modalMode === 'account_pending') {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer maxWidth={480}>
          {/* Header */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft color={COLORS.textSecondary} size={20} />
            <Text style={styles.backText}>{t('navigation.backToLogin')}</Text>
          </TouchableOpacity>

        <View style={styles.brandHeader}>
          <Image
            source={require('../../../assets/images/riderhood-logo.png')}
            style={styles.brandLogoImg}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>{t('auth.workshopPartnerApp').toUpperCase()}</Text>
          <Text style={styles.brandSubtitle}>
            {t('auth.joinRiderHood')}
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeading}>{t('auth.businessDetails').toUpperCase()}</Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.ownerManager').toUpperCase()}</Text>
            <View style={styles.inputWrapper}>
              <User color={COLORS.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Azizi Workshop Lead"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {/* Workshop Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.workshopName').toUpperCase()}</Text>
            <View style={styles.inputWrapper}>
              <Wrench color={COLORS.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={workshopName}
                onChangeText={setWorkshopName}
                placeholder={t('auth.workshopNamePlaceholder')}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.workshopEmail').toUpperCase()}</Text>
            <View style={styles.inputWrapper}>
              <Mail color={COLORS.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="workshop@riderhood.app"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.workshopPhone').toUpperCase()}</Text>
            <View style={styles.inputWrapper}>
              <Phone color={COLORS.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('auth.phonePlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* District / Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.workshopDistrict').toUpperCase()}</Text>
            <View style={styles.inputWrapper}>
              <MapPin color={COLORS.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={district}
                onChangeText={setDistrict}
                placeholder={t('auth.workshopDistrictPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {/* Password */}
          <PasswordInput
            label={t('auth.adminPassword').toUpperCase()}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            showStrength={true}
          />

          {/* Confirm Password */}
          <PasswordInput
            label={t('auth.confirmPassword').toUpperCase()}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            showStrength={false}
          />

          {/* Submit Application Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.disabledBtn]}
            activeOpacity={0.8}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>{t('auth.submitApplication')}</Text>
                <CheckCircle2 color="#000" size={18} />
              </>
            )}
          </TouchableOpacity>
        </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Security Feedback Modal */}
      <PasswordSecurityModal
        visible={modalVisible}
        mode={modalMode}
        customTitle={modalTitle}
        customMessage={modalMessage}
        onClose={handleModalClose}
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
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandLogoImg: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#3b2f10',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    marginBottom: 12,
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3b2f10',
    gap: 14,
    marginBottom: 24,
  },
  sectionHeading: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
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
    height: 50,
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
  submitBtn: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
