import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'react-native';
import { COLORS } from '../constants/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../i18n';

function RouteGuard() {
  const { user, isLoading, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait until the session has been restored from storage before redirecting
    if (!isInitialized || isLoading) return;

    const currentGroup = segments[0];

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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
          <RouteGuard />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(customer)" options={{ headerShown: false }} />
            <Stack.Screen name="(workshop)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
