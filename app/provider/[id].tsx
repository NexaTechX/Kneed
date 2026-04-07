import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ProviderDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pid = typeof id === 'string' ? id : id?.[0];
  if (!pid) return null;
  return <Redirect href={`/(client)/provider/${pid}`} />;
}
