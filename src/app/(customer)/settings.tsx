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
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { PasswordInput } from '../../components/PasswordInput';
import { PasswordSecurityModal, PasswordModalMode } from '../../components/PasswordSecurityModal';
import { updatePassword } from '../../services/authService';
import { Bell, Lock, Shield, Moon, Sun, Laptop, ArrowLeft, LogOut, Globe, Sparkles, Check } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';
import { LanguageSelector } from '../../components/LanguageSelector';

export default function CustomerSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const { themeMode, activeTheme, isDark, colors, setThemeMode } = useTheme();

  const [notifications, setNotifications] = useState(true);

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
      setModalMode('password_changed');
      setModalVisible(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setPasswordError(error?.message || 'Failed to update password.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.textPrimary} size={18} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>{t('common.back')}</Text>
        </TouchableOpacity>

        {/* ─── 1. Appearance / Theme Mode Selection Card ──────── */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            {isDark ? <Moon color={colors.primary} size={18} /> : <Sun color={colors.primary} size={18} />}
            <Text style={[styles.cardSectionTitle, { color: colors.textSecondary }]}>
              {t('settings.appearance').toUpperCase()}
            </Text>
          </View>

          <View style={styles.themeToggleRow}>
            {/* 1. Dark Mode */}
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                {
                  backgroundColor: themeMode === 'dark' ? 'rgba(255, 107, 0, 0.12)' : colors.surfaceElevated,
                  borderColor: themeMode === 'dark' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setThemeMode('dark')}
              activeOpacity={0.8}
            >
              <Moon color={themeMode === 'dark' ? colors.primary : colors.textSecondary} size={20} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeOptionTitle, { color: themeMode === 'dark' ? colors.primary : colors.textPrimary }]}>
                  {t('settings.darkMode')}
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textSecondary }]}>
                  {t('settings.darkModeDesc')}
                </Text>
              </View>
              {themeMode === 'dark' && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                  <Check color="#FFFFFF" size={12} strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>

            {/* 2. Light Mode */}
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                {
                  backgroundColor: themeMode === 'light' ? 'rgba(255, 107, 0, 0.12)' : colors.surfaceElevated,
                  borderColor: themeMode === 'light' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setThemeMode('light')}
              activeOpacity={0.8}
            >
              <Sun color={themeMode === 'light' ? colors.primary : colors.textSecondary} size={20} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeOptionTitle, { color: themeMode === 'light' ? colors.primary : colors.textPrimary }]}>
                  {t('settings.lightMode')}
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textSecondary }]}>
                  {t('settings.lightModeDesc')}
                </Text>
              </View>
              {!isDark && themeMode === 'light' && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                  <Check color="#FFFFFF" size={12} strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>

            {/* 3. System / Auto Mode */}
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                {
                  backgroundColor: themeMode === 'system' ? 'rgba(255, 107, 0, 0.12)' : colors.surfaceElevated,
                  borderColor: themeMode === 'system' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setThemeMode('system')}
              activeOpacity={0.8}
            >
              <Laptop color={themeMode === 'system' ? colors.primary : colors.textSecondary} size={20} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeOptionTitle, { color: themeMode === 'system' ? colors.primary : colors.textPrimary }]}>
                  {t('settings.systemMode')}
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textSecondary }]}>
                  {t('settings.systemModeDesc')} ({activeTheme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')})
                </Text>
              </View>
              {themeMode === 'system' && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                  <Check color="#FFFFFF" size={12} strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. Language Selection Card ────────────────────── */}
        <LanguageSelector variant="card" />

        {/* ─── 3. Change Password Card ──────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Lock color={colors.primary} size={18} />
            <Text style={[styles.cardSectionTitle, { color: colors.textSecondary }]}>
              {t('settings.security').toUpperCase()}
            </Text>
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

        {/* ─── 4. Notifications Preferences ─────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
          <Text style={[styles.cardSectionTitle, { color: colors.textSecondary }]}>
            {t('settings.notifications').toUpperCase()}
          </Text>
          <View style={styles.row}>
            <Bell color={colors.primary} size={20} />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('dashboard.serviceReminder')}</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{t('dashboard.serviceReminderDesc')}</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primaryDark }}
              thumbColor={notifications ? colors.primary : '#9ca3af'}
            />
          </View>
        </View>

        {/* ─── 5. Logout Button ─────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.dangerBg,
            },
          ]}
          onPress={logout}
          activeOpacity={0.8}
        >
          <LogOut color={colors.danger} size={18} />
          <Text style={[styles.logoutBtnText, { color: colors.danger }]}>{t('common.logout')}</Text>
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
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  themeToggleRow: {
    gap: 8,
  },
  themeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  themeOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  themeOptionSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
