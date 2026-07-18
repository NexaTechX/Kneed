import { Stack } from 'expo-router';

export default function ClientGroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-post" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="kyc" />
      <Stack.Screen name="edit-post" />
      <Stack.Screen name="post-comments" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="search" />
      <Stack.Screen name="creator/[id]" />
      <Stack.Screen name="social-connections" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="wallet" />
    </Stack>
  );
}
