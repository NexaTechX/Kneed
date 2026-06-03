import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { BookingSheet } from '@/components/BookingSheet';
import { SafeView } from '@/components/layout/SafeView';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { fetchDiscoverableCreators, type DiscoverCreator } from '@/lib/privateRoom';
import { supabase } from '@/lib/supabase';
import { toNaira } from '@/lib/social';

export default function PrivateRoomScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { refresh: refreshLoc } = useDeviceLocation();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [rateNgn, setRateNgn] = useState('');
  const [booking, setBooking] = useState<DiscoverCreator | null>(null);

  const kycOk = profile?.is_kyc_verified === true;

  const refresh = useCallback(async () => {
    const c = await refreshLoc();
    if (c) setCoords({ lat: c.lat, lng: c.lng });
  }, [refreshLoc]);

  const { data: creators } = useQuery({
    queryKey: ['private-room-discover', user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchDiscoverableCreators(user!.id),
  });

  const { data: sessions, refetch } = useQuery({
    queryKey: ['private-room-sessions', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('private_room_sessions')
        .select('*')
        .or(`booker_user_id.eq.${user!.id},booked_user_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveLocation = async () => {
    if (!user || !coords) {
      Alert.alert('Location', 'Enable location to use matching.');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        private_room_lat: coords.lat,
        private_room_lng: coords.lng,
        private_room_location_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Saved', 'Your location was updated for Private Room.');
  };

  const saveListingRate = async () => {
    if (!user || !kycOk) return;
    const cents = Math.round((parseFloat(rateNgn) || 0) * 100);
    if (cents <= 0) {
      Alert.alert('Rate', 'Enter your booking price in NGN.');
      return;
    }
    const { error } = await supabase.from('profiles').update({ private_room_rate_cents: cents }).eq('id', user.id);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Saved', 'Your listing rate is set.');
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Private Room" subtitle="Discover & book" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Discover creators</Text>
        {(creators ?? []).length === 0 ? (
          <Card style={styles.card}>
            <Text style={[styles.meta, { color: t.textSecondary }]}>No bookable creators yet. Check back soon.</Text>
          </Card>
        ) : (
          (creators ?? []).map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/(client)/creator/${c.id}` as never)}>
              <Card style={styles.creatorCard}>
                <Avatar name={c.full_name?.trim() || 'Creator'} uri={c.avatar_url} size={48} />
                <View style={styles.creatorInfo}>
                  <Text style={[styles.creatorName, { color: t.text }]} numberOfLines={1}>
                    {c.full_name?.trim() || 'Creator'}
                  </Text>
                  {c.headline ? (
                    <Text style={[styles.creatorHeadline, { color: t.textTertiary }]} numberOfLines={1}>
                      {c.headline}
                    </Text>
                  ) : null}
                  <Text style={[styles.creatorRate, { color: t.accent }]}>{toNaira(c.private_room_rate_cents)} / session</Text>
                </View>
                <Button title="Book" onPress={() => setBooking(c)} style={styles.bookBtn} textStyle={{ fontSize: 13 }} />
              </Card>
            </Pressable>
          ))
        )}

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Your listing</Text>
        {kycOk ? (
          <>
            <Card style={styles.card}>
              <View style={styles.cardHead}>
                <Ionicons name="pricetag-outline" size={20} color={t.text} />
                <Text style={[styles.cardTitle, { color: t.text }]}>Set your rate</Text>
              </View>
              <Text style={[styles.meta, { color: t.textSecondary }]}>What others pay to book you (platform fee applies).</Text>
              <Input placeholder="Your rate (NGN)" value={rateNgn} onChangeText={setRateNgn} keyboardType="decimal-pad" />
              <Button title="Save rate" variant="outline" onPress={() => void saveListingRate()} />
            </Card>

            <Card style={styles.card}>
              <View style={styles.cardHead}>
                <Ionicons name="location-outline" size={20} color={t.text} />
                <Text style={[styles.cardTitle, { color: t.text }]}>Matching location</Text>
              </View>
              <Button title="Refresh GPS" variant="outline" onPress={() => void refresh()} />
              <Text style={[styles.meta, { color: t.textSecondary }]}>
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Waiting for GPS…'}
              </Text>
              <Button title="Save to profile" onPress={() => void saveLocation()} />
            </Card>
          </>
        ) : (
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="shield-outline" size={20} color={t.text} />
              <Text style={[styles.cardTitle, { color: t.text }]}>Become bookable</Text>
            </View>
            <Text style={[styles.meta, { color: t.textSecondary }]}>
              Verify your identity (KYC) to set a rate and let others book you.
            </Text>
            <Button title="Start verification" onPress={() => router.push('/(client)/kyc' as never)} />
          </Card>
        )}

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Your sessions</Text>
        {(sessions ?? []).length === 0 ? (
          <Card style={styles.card}>
            <Text style={[styles.meta, { color: t.textSecondary }]}>No bookings yet.</Text>
          </Card>
        ) : (
          (sessions ?? []).map(
            (s: { id: string; status: string; amount_cents: number; booked_user_id: string; booker_user_id: string }) => {
              const isBooker = s.booker_user_id === user?.id;
              return (
                <Card key={s.id} style={styles.sessionCard}>
                  <View style={styles.sessionTop}>
                    <Text style={[styles.sessionStatus, { color: t.text }]}>{s.status}</Text>
                    <Text style={[styles.sessionAmount, { color: t.accent }]}>{toNaira(s.amount_cents)}</Text>
                  </View>
                  <Text style={[styles.small, { color: t.textTertiary }]}>
                    {isBooker ? 'You booked' : 'Booked you'} · {(isBooker ? s.booked_user_id : s.booker_user_id).slice(0, 8)}…
                  </Text>
                </Card>
              );
            },
          )
        )}
      </ScrollView>

      <BookingSheet
        visible={booking !== null}
        creator={booking}
        onClose={() => setBooking(null)}
        onBooked={() => void refetch()}
      />
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginLeft: 2,
    },
    card: { gap: spacing.sm },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
    meta: { fontSize: 12, lineHeight: 18 },
    creatorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    creatorInfo: { flex: 1, minWidth: 0 },
    creatorName: { fontSize: 16, fontWeight: '700' },
    creatorHeadline: { fontSize: 13, marginTop: 1 },
    creatorRate: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    bookBtn: { paddingHorizontal: spacing.lg, minHeight: 40 },
    sessionCard: { paddingVertical: spacing.md },
    sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sessionStatus: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
    sessionAmount: { fontSize: 15, fontWeight: '700' },
    small: { fontSize: 12, marginTop: 4 },
  });
}
