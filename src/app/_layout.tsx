import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../i18n';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

function RouteGuard() {
  const { user, isLoading, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait until the session has been restored from storage before redirecting
    if (!isInitialized || isLoading) return;

    const currentGroup = segments[0];
    const currentScreen = segments[1];

    // Do not redirect away if the user is in the middle of a password reset flow
    if (
      currentGroup === '(auth)' &&
      (currentScreen === 'forgot-password' || currentScreen === 'reset-password')
    ) {
      return;
    }

    if (!user) {
      if (currentGroup !== '(auth)') {
        router.replace('/(auth)/welcome');
      }
    } else {
      if (user.role === 'customer' && currentGroup !== '(customer)') {
        router.replace('/(customer)/home');
      } else if (user.role === 'workshop_admin' && currentGroup !== '(workshop)') {
        router.replace('/(workshop)/dashboard');
      } else if (user.role === 'super_admin' && currentGroup !== '(admin)') {
        router.replace('/(admin)');
      }
    }
  }, [user, isLoading, isInitialized, segments]);

  return null;
}

function ThemedAppContainer() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <RouteGuard />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(workshop)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemedAppContainer />
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
