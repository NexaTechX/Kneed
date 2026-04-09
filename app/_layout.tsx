import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import 'react-native-reanimated';

import { PushTokenRegistrar } from '@/components/PushTokenRegistrar';
import { lightTheme, navigationThemeColors } from '@/constants/theme';
import { useAuthBootstrap } from '@/hooks/useAuth';

export { ErrorBoundary } from 'expo-router';

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
