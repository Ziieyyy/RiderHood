import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { Cpu, ShieldCheck, KeyRound, ArrowRight, Fingerprint, Lock } from 'lucide-react-native';
import { CustomButton } from '../components/CustomButton';

export default function LoginScreen() {
  const router = useRouter();
  const [accessKey, setAccessKey] = useState('azizi@riderhood.app');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/(tabs)');
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Badge */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Cpu color={COLORS.primary} size={32} />
            </View>
            <Text style={styles.brandTitle}>RiderHood</Text>
            <Text style={styles.brandSubtitle}>Telemetry & Maintenance Access</Text>
            
            <View style={styles.liveChip}>
              <View style={styles.greenPulse} />
              <Text style={styles.chipText}>TELEMETRY CORE V2.4 ONLINE</Text>
            </View>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Lock color={COLORS.primary} size={18} />
              <Text style={styles.cardTitle}>SECURE RIDER AUTHENTICATION</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RIDER ACCESS ID / EMAIL</Text>
              <View style={styles.inputBox}>
                <KeyRound color={COLORS.textSecondary} size={18} />
                <TextInput
                  style={styles.input}
                  value={accessKey}
                  onChangeText={setAccessKey}
                  placeholder="enter access key"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SECURITY CODE</Text>
              <View style={styles.inputBox}>
                <Lock color={COLORS.textSecondary} size={18} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="enter passkey"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.forgotLink} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Recover Access Passkey?</Text>
            </TouchableOpacity>

            <CustomButton
              title={isLoading ? "CONNECTING CORE..." : "ACCESS TELEMETRY DASHBOARD"}
              onPress={handleLogin}
              icon={<ArrowRight color="#000" size={18} />}
              disabled={isLoading}
              style={{ marginTop: 10 }}
            />

            <View style={styles.orDivider}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR BIOMETRIC</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity
              style={styles.biometricBtn}
              activeOpacity={0.8}
              onPress={handleLogin}
            >
              <Fingerprint color={COLORS.primary} size={24} />
              <Text style={styles.biometricText}>Quick Rider Biometric Login</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Telemetry Banner */}
          <View style={styles.telemetryBanner}>
            <ShieldCheck color={COLORS.success} size={18} />
            <Text style={styles.bannerText}>256-Bit Encrypted Telemetry Link Active</Text>
          </View>

          <Text style={styles.versionText}>RiderHood Premium Moto Care v2.4.0 • Build 2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 16,
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 14,
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  chipText: {
    color: COLORS.primaryDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
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
  forgotLink: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: COLORS.primaryDim,
    fontSize: 12,
    fontWeight: '600',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  orText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  biometricText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  telemetryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  bannerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
  },
});
