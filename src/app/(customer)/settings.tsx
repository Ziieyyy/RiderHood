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
import { Bell, Lock, Shield, Moon, ArrowLeft, LogOut } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function CustomerSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
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
      <Header title="Rider Settings" subtitle="Preferences & Security Controls" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={COLORS.textPrimary} size={18} />
          <Text style={styles.backText}>Back to Profile</Text>
        </TouchableOpacity>

        {/* Change Password Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Lock color={COLORS.primary} size={18} />
            <Text style={styles.cardSectionTitle}>CHANGE SECURITY PASSWORD</Text>
          </View>

          <PasswordInput
            label="NEW PASSWORD"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="enter new password"
            showStrength
            errorText={passwordError}
            disabled={updating}
          />

          <PasswordInput
            label="CONFIRM NEW PASSWORD"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="confirm new password"
            errorText={confirmError}
            disabled={updating}
          />

          <CustomButton
            title={updating ? 'UPDATING...' : 'CHANGE PASSWORD'}
            onPress={handleChangePassword}
            disabled={updating || !newPassword}
            style={{ marginTop: 6 }}
          />
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>NOTIFICATION PREFERENCES</Text>
          <View style={styles.row}>
            <Bell color={COLORS.primary} size={20} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Service Reminders & Alerts</Text>
              <Text style={styles.rowSub}>Push alerts for upcoming oil changes & inspections</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#374151', true: COLORS.primaryDark }}
              thumbColor={notifications ? COLORS.primary : '#9ca3af'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>TELEMETRY & DISPLAY</Text>
          <View style={styles.row}>
            <Moon color={COLORS.primary} size={20} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>High-Contrast Cyber Dark Theme</Text>
              <Text style={styles.rowSub}>Optimized for OLED displays & night riding</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#374151', true: COLORS.primaryDark }}
              thumbColor={darkMode ? COLORS.primary : '#9ca3af'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Shield color={COLORS.primary} size={20} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Live ECU Telemetry Sync</Text>
              <Text style={styles.rowSub}>Automatic background telemetry upload</Text>
            </View>
            <Switch
              value={telemetrySync}
              onValueChange={setTelemetrySync}
              trackColor={{ false: '#374151', true: COLORS.primaryDark }}
              thumbColor={telemetrySync ? COLORS.primary : '#9ca3af'}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut color={COLORS.danger} size={18} />
          <Text style={styles.logoutBtnText}>Logout Customer Session</Text>
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
