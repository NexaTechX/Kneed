import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { PushTokenRegistrar } from '@/components/PushTokenRegistrar';
import { Button } from '@/components/ui/Button';
import { lightTheme, navigationThemeColors } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAuthBootstrap } from '@/hooks/useAuth';

/** Friendly full-screen fallback shown if a screen throws during render. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = lightTheme;
  return (
    <View style={[boundaryStyles.wrap, { backgroundColor: t.background }]}>
      <Text style={[boundaryStyles.title, { color: t.text }]}>Something went wrong</Text>
      <Text style={[boundaryStyles.body, { color: t.textSecondary }]}>
        The screen ran into an unexpected error. You can try again.
      </Text>
      <Text style={[boundaryStyles.detail, { color: t.textTertiary }]} numberOfLines={4}>
        {error.message}
      </Text>
      <Button title="Try again" onPress={() => void retry()} style={boundaryStyles.btn} />
    </View>
  );
}

const boundaryStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  detail: { fontSize: 12, textAlign: 'center', marginTop: spacing.xs },
  btn: { marginTop: spacing.md, alignSelf: 'stretch' },
});

const queryClient = new QueryClient();

export default function RootLayout() {
  useAuthBootstrap();
  const navigationTheme = useMemo(() => {
    const base = DefaultTheme;
    const t = lightTheme;
    return {
      ...base,
      colors: { ...base.colors, ...navigationThemeColors(t) },
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <PushTokenRegistrar />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
