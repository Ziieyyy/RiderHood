import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, AppThemeColors } from '../constants/theme';
import { Cpu, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { AppLogo } from '../components/AppLogo';

export default function SplashScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <View style={styles.content}>
        {/* Glow Logo */}
        <AppLogo
          size={120}
          containerStyle={{ marginBottom: 20 }}
          alwaysDarkBg={!isDark}
        />

        {/* Brand Name */}
        <Text style={styles.title}>RIDERHOOD</Text>
        
        {/* Tagline */}
        <Text style={styles.tagline}>“Ride Smart, Service Easy.”</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <ShieldCheck color={colors.primary} size={16} />
        <Text style={styles.footerText}>Your motorcycle companion.</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: AppThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    splashLogoImg: {
      width: 130,
      height: 130,
      marginBottom: 20,
    },
    logoBadge: {
      width: 120,
      height: 120,
      borderRadius: 36,
      backgroundColor: colors.primaryDark,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
      marginBottom: 24,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 12,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: 2,
      marginBottom: 8,
    },
    tagline: {
      color: colors.primary,
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
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
  });
