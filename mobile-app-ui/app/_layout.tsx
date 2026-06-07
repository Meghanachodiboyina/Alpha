import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Alert } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

function useProtectedRoute(isAuthenticated: boolean | null, hasCompletedOnboarding: boolean | null) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === null || hasCompletedOnboarding === null) return; // still loading

    const inAuthGroup = segments[0] === '(auth)';
    const isOnboarding = segments[0] === 'onboarding';

    if (!hasCompletedOnboarding) {
      if (!isOnboarding) {
        router.replace('/onboarding');
      }
      return;
    }

    if (!isAuthenticated && !inAuthGroup && !isOnboarding) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && (inAuthGroup || isOnboarding)) {
      router.replace('/(tabs)/dashboard');
    } else if (!isAuthenticated && isOnboarding) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, hasCompletedOnboarding, segments]);
}


function RootLayoutContent() {
  const { isAuthenticated, hasCompletedOnboarding } = useAuth();
  const { theme, isDarkMode } = useTheme();

  useProtectedRoute(isAuthenticated, hasCompletedOnboarding);

  if (isAuthenticated === null || hasCompletedOnboarding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 56, height: 56, borderRadius: 16,
          backgroundColor: theme.orange,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: theme.orange, shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4, shadowRadius: 20,
        }}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="focus-mode" />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
