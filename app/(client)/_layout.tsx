import { Stack } from 'expo-router';

export default function ClientGroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="provider/[id]" />
      <Stack.Screen name="booking/confirm" />
      <Stack.Screen name="review/[bookingId]" />
    </Stack>
  );
}
