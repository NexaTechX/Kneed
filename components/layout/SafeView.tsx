import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';

export function SafeView({ style, ...rest }: ViewProps) {
  const t = useAppTheme();
  return <SafeAreaView style={[styles.safe, { backgroundColor: t.background }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
});
