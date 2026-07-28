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
import { COLORS } from '../../constants/theme';
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

export default function SecurityScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully ✓');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      Alert.alert('Check Your Email', `Password reset instructions sent to ${user.email}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send reset link.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out?', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Security & Account"
        subtitle="Manage authentication, password & active sessions"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Box */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck color={COLORS.success} size={20} />
            <Text style={styles.cardTitle}>ACCOUNT STATUS</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.emailText}>{user?.email}</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>● Active Rider</Text>
            </View>
          </View>
        </View>

        {/* Change Password Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <KeyRound color={COLORS.primary} size={20} />
            <Text style={styles.cardTitle}>CHANGE PASSWORD</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NEW PASSWORD</Text>
            <PasswordInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
            />
          </View>

          <CustomButton
            title={loading ? 'UPDATING...' : 'CHANGE PASSWORD'}
            onPress={handleChangePassword}
            disabled={loading}
          />

          <TouchableOpacity style={styles.forgotBtn} onPress={handleSendResetLink}>
            <Text style={styles.forgotText}>Send password reset email to my inbox</Text>
          </TouchableOpacity>
        </View>

        {/* Active Sessions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Smartphone color={COLORS.primary} size={20} />
            <Text style={styles.cardTitle}>ACTIVE SESSIONS</Text>
          </View>

          <View style={styles.sessionRow}>
            <Smartphone color={COLORS.textPrimary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>This Device (Mobile App)</Text>
              <Text style={styles.sessionSub}>Active Now • Expo SDK 57 Client</Text>
            </View>
            <CheckCircle2 color={COLORS.success} size={16} />
          </View>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color={COLORS.danger} size={18} />
          <Text style={styles.logoutText}>LOG OUT OF RIDERHOOD</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: COLORS.textMuted,
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
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  activeBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  activeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '900',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  forgotBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  sessionTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  sessionSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.dangerBg,
    marginTop: 8,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '900',
  },
});
