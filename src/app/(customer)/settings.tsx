import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { PasswordInput } from '../../components/PasswordInput';
import { PasswordSecurityModal, PasswordModalMode } from '../../components/PasswordSecurityModal';
import { updatePassword } from '../../services/authService';
import { Bell, Lock, Shield, Moon, ArrowLeft, LogOut, Globe } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { LanguageSelector } from '../../components/LanguageSelector';

export default function CustomerSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [telemetrySync, setTelemetrySync] = useState(true);

  // Change Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [updating, setUpdating] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<PasswordModalMode>('password_changed');

  const handleChangePassword = async () => {
    setPasswordError('');
    setConfirmError('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      return;
    }

    setUpdating(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setModalMode('password_changed');
      setModalVisible(true);
    } catch {
      setModalMode('wrong_password');
      setModalVisible(true);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={COLORS.textPrimary} size={18} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        {/* Language Selection Card */}
        <LanguageSelector variant="card" />

        {/* Change Password Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Lock color={COLORS.primary} size={18} />
            <Text style={styles.cardSectionTitle}>{t('settings.security').toUpperCase()}</Text>
          </View>

          <PasswordInput
            label={t('auth.password').toUpperCase()}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('auth.passwordPlaceholder')}
            showStrength
            errorText={passwordError}
            disabled={updating}
          />

          <PasswordInput
            label={t('auth.confirmPassword').toUpperCase()}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.confirmPassword')}
            errorText={confirmError}
            disabled={updating}
          />

          <CustomButton
            title={updating ? t('common.submitting') : t('settings.saveChanges')}
            onPress={handleChangePassword}
            disabled={updating || !newPassword}
            style={{ marginTop: 6 }}
          />
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>{t('settings.notifications').toUpperCase()}</Text>
          <View style={styles.row}>
            <Bell color={COLORS.primary} size={20} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t('dashboard.serviceReminder')}</Text>
              <Text style={styles.rowSub}>{t('dashboard.serviceReminderDesc')}</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#374151', true: COLORS.primaryDark }}
              thumbColor={notifications ? COLORS.primary : '#9ca3af'}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut color={COLORS.danger} size={18} />
          <Text style={styles.logoutBtnText}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <PasswordSecurityModal
        visible={modalVisible}
        mode={modalMode}
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
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.dangerBg,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
