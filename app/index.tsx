import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useEntryRedirect } from '@/hooks/useEntryRedirect';

export default function Index() {
  const { href, isLoading } = useEntryRedirect();
  const t = useAppTheme();

  if (isLoading || !href) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={href as never} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
