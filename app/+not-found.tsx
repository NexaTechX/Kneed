import { Link, Stack } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function NotFoundScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: true, headerStyle: { backgroundColor: t.surface } }} />
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <Text style={[styles.title, { color: t.text }]}>This screen does not exist.</Text>
        <Text style={[styles.sub, { color: t.textSecondary }]}>The link may be outdated or mistyped.</Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: t.link }]}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}

function createStyles(_t: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    sub: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 280,
    },
    link: {
      marginTop: 28,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    linkText: {
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
