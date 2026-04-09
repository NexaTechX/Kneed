import { Redirect, useLocalSearchParams } from 'expo-router';

export default function BookingDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bid = typeof id === 'string' ? id : id?.[0];
  if (!bid) return null;
  return <Redirect href={`/booking-detail/${bid}`} />;
}
