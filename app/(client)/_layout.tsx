import { Stack } from 'expo-router';

export default function ClientGroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-post" />
      <Stack.Screen name="edit-post" />
      <Stack.Screen name="post-comments" />
      <Stack.Screen name="wallet" />
    </Stack>
  );
}
