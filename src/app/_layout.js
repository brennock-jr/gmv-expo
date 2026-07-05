import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      // Se não estiver logado, vai para a tela de login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // Se logado e perfil carregado
      if (profile) {
        // Proteção da área administrativa
        if (segments[1] === 'admin' && profile.role !== 'administrador') {
          router.replace('/(app)/dashboard');
          return;
        }

        if (!profile.approved) {
          // Se não estiver aprovado, força a tela de aprovação pendente
          if (segments[1] !== 'pending') {
            router.replace('/(app)/pending');
          }
        } else if (!profile.onboarded) {
          // Se aprovado mas com ficha médica pendente, força o preenchimento
          if (segments[1] !== 'onboarding') {
            router.replace('/(app)/onboarding');
          }
        } else {
          // Se aprovado e preencheu a ficha médica, vai para o dashboard
          if (inAuthGroup || segments[1] === 'onboarding' || segments[1] === 'pending') {
            router.replace('/(app)/dashboard');
          }
        }
      }
    }
  }, [user, profile, loading, segments, router]);

  if (loading || (user && !profile)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />
      <Stack.Screen name="(app)/pending" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(app)/onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(app)/dashboard" />
      <Stack.Screen name="(app)/admin" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
