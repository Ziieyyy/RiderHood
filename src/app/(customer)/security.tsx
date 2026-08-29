import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppThemeColors, COLORS, DARK_COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { PasswordInput } from '../../components/PasswordInput';
import {
  ShieldCheck,
  KeyRound,
  Smartphone,
  CheckCircle2,
  LogOut,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { updatePassword, resetPassword } from '../../services/authService';
import { useTranslation } from '../../i18n';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';

export default function SecurityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(t('auth.passwordTooShort'), t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('auth.passwordsMustMatch'), t('auth.passwordsMustMatch'));
      return;
    }

    setLoading(true);
    try {
      await updatePassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(t('common.success'), t('settings.passwordChangedDesc'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('errors.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      Alert.alert(t('auth.resetLinkSent'), t('auth.resetLinkSentDesc'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('errors.genericMessage'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('dialogs.logoutTitle'), t('dialogs.logoutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('settings.security')}
        subtitle={t('settings.security')}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Box */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck color={colors.success} size={20} />
            <Text style={styles.cardTitle}>{t('common.status').toUpperCase()}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.emailText}>{user?.email}</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>● {t('common.active')}</Text>
            </View>
          </View>
        </View>

        {/* Change Password Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <KeyRound color={colors.primary} size={20} />
            <Text style={styles.cardTitle}>{t('settings.changePassword').toUpperCase()}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('settings.newPassword').toUpperCase()}</Text>
            <PasswordInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('settings.newPassword')}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('settings.confirmNewPassword').toUpperCase()}</Text>
            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('settings.confirmNewPassword')}
            />
          </View>

          <CustomButton
            title={loading ? t('settings.updatingPassword').toUpperCase() : t('settings.updatePassword').toUpperCase()}
            onPress={handleChangePassword}
            disabled={loading}
          />

          <TouchableOpacity style={styles.forgotBtn} onPress={handleSendResetLink}>
            <Text style={styles.forgotText}>{t('auth.sendResetLink')}</Text>
          </TouchableOpacity>
        </View>

        {/* Active Sessions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Smartphone color={colors.primary} size={20} />
            <Text style={styles.cardTitle}>{t('settings.activeSessions').toUpperCase()}</Text>
          </View>

          <View style={styles.sessionRow}>
            <Smartphone color={colors.textPrimary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>{t('settings.sessionInfo')}</Text>
              <Text style={styles.sessionSub}>{t('common.active')} • RiderHood Client</Text>
            </View>
            <CheckCircle2 color={colors.success} size={16} />
          </View>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color={colors.danger} size={18} />
          <Text style={styles.logoutText}>{t('common.logout').toUpperCase()}</Text>
        </TouchableOpacity>
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
      padding: 16,
      paddingBottom: 40,
      gap: 14,
    },
    card: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    emailText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    activeBadge: {
      backgroundColor: colors.successBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.success,
    },
    activeText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: '900',
    },
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
    },
    forgotBtn: {
      alignItems: 'center',
      paddingVertical: 4,
    },
    forgotText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      textDecorationLine: 'underline',
    },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    sessionTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    sessionSub: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.dangerBg,
      marginTop: 8,
    },
    logoutText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '900',
    },
  });
