import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/constants/colors';
import { useEntryRedirect } from '@/hooks/useEntryRedirect';

export default function Index() {
  const { href, isLoading } = useEntryRedirect();

  if (isLoading || !href) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.coral} size="large" />
      </View>
    );
  }

  return <Redirect href={href as never} />;
}
