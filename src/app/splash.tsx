import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { Cpu, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isInitialized) {
        if (user) {
          router.replace('/(customer)/home');
        } else {
          router.replace('/(auth)/welcome');
        }
      } else {
        router.replace('/(auth)/welcome');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [isInitialized, user, router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <View style={styles.content}>
        {/* Glow Badge */}
        <View style={styles.logoBadge}>
          <Cpu color={COLORS.primary} size={64} />
        </View>

        {/* Brand Name */}
        <Text style={styles.title}>RIDERHOOD</Text>
        
        {/* Tagline */}
        <Text style={styles.tagline}>“Ride Smart, Service Easy.”</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <ShieldCheck color={COLORS.primary} size={16} />
        <Text style={styles.footerText}>Your motorcycle companion.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  tagline: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
