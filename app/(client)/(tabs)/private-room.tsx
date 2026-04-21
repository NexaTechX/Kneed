import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { openPaystackCheckoutForPrivateRoom } from '@/lib/paystack';
import { supabase } from '@/lib/supabase';
import { toNaira } from '@/lib/social';

export default function PrivateRoomScreen() {
  const { user, profile } = useAuth();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { refresh: refreshLoc } = useDeviceLocation();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const refresh = useCallback(async () => {
    const c = await refreshLoc();
    if (c) setCoords({ lat: c.lat, lng: c.lng });
  }, [refreshLoc]);

  const [bookedUserId, setBookedUserId] = useState('');
  const [amountNgn, setAmountNgn] = useState('');
  const [rateNgn, setRateNgn] = useState('');

  const kycOk = profile?.is_kyc_verified === true;

  const { data: sessions, refetch } = useQuery({
    queryKey: ['private-room-sessions', user?.id],
    enabled: Boolean(user) && kycOk,
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

  const createBooking = async () => {
    if (!user || !kycOk) {
      Alert.alert('KYC required', 'Complete KYC to use Private Room.');
      return;
    }
    const cents = Math.round((parseFloat(amountNgn) || 0) * 100);
    if (!bookedUserId.trim() || cents <= 0) {
      Alert.alert('Details', 'Enter the user ID to book and amount (NGN).');
      return;
    }
    const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('private_room_sessions')
      .insert({
        booked_user_id: bookedUserId.trim(),
        booker_user_id: user.id,
        starts_at: startAt,
        duration_min: 60,
        amount_cents: cents,
        notes: 'Private room booking',
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) {
      Alert.alert('Could not create', error.message);
      return;
    }
    setBookedUserId('');
    setAmountNgn('');
    const pay = await openPaystackCheckoutForPrivateRoom(data.id);
    if (!pay.ok) Alert.alert('Payment', pay.message);
    await refetch();
  };

  if (!kycOk) {
    return (
      <SafeView style={{ backgroundColor: t.background }}>
        <AppHeader title="Private Room" subtitle="Bookings" />
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.lockedCard}>
            <View style={[styles.iconCircle, { backgroundColor: t.surfaceMuted }]}>
              <Ionicons name="lock-closed" size={28} color={t.text} />
            </View>
            <Text style={[styles.lockedTitle, { color: t.text }]}>Verification required</Text>
            <Text style={[styles.body, { color: t.textSecondary }]}>
              Private Room is available after identity verification (KYC). Complete verification from your account settings when ready.
            </Text>
          </Card>
        </ScrollView>
      </SafeView>
    );
  }

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Private Room" subtitle="Sessions" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Your listing</Text>
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="pricetag-outline" size={20} color={t.text} />
            <Text style={[styles.cardTitle, { color: t.text }]}>Set your rate</Text>
          </View>
          <Text style={[styles.meta, { color: t.textSecondary }]}>What others pay to book you (platform fee applies).</Text>
          <Input placeholder="Your rate (NGN)" value={rateNgn} onChangeText={setRateNgn} keyboardType="decimal-pad" />
          <Button title="Save rate" variant="outline" onPress={() => void saveListingRate()} />
        </Card>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Location</Text>
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="location-outline" size={20} color={t.text} />
            <Text style={[styles.cardTitle, { color: t.text }]}>Matching</Text>
          </View>
          <Button title="Refresh GPS" variant="outline" onPress={() => void refresh()} />
          <Text style={[styles.meta, { color: t.textSecondary }]}>
            {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Waiting for GPS…'}
          </Text>
          <Button title="Save to profile" onPress={() => void saveLocation()} />
        </Card>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Book</Text>
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="calendar-outline" size={20} color={t.text} />
            <Text style={[styles.cardTitle, { color: t.text }]}>New booking</Text>
          </View>
          <Input placeholder="Their user ID (UUID)" value={bookedUserId} onChangeText={setBookedUserId} autoCapitalize="none" />
          <Input placeholder="Amount (NGN)" value={amountNgn} onChangeText={setAmountNgn} keyboardType="decimal-pad" />
          <Button title="Create & pay" onPress={() => void createBooking()} />
        </Card>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Sessions</Text>
        {(sessions ?? []).map((s: { id: string; status: string; amount_cents: number; booked_user_id: string; booker_user_id: string }) => (
          <Card key={s.id} style={styles.sessionCard}>
            <View style={styles.sessionTop}>
              <Text style={[styles.sessionStatus, { color: t.text }]}>{s.status}</Text>
              <Text style={[styles.sessionAmount, { color: t.accent }]}>{toNaira(s.amount_cents)}</Text>
            </View>
            <Text style={[styles.small, { color: t.textTertiary }]}>Booked user · {s.booked_user_id.slice(0, 8)}…</Text>
          </Card>
        ))}
      </ScrollView>
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
    lockedCard: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xl,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockedTitle: { fontSize: 20, fontWeight: '700' },
    body: { textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.sm },
    sessionCard: { paddingVertical: spacing.md },
    sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sessionStatus: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
    sessionAmount: { fontSize: 15, fontWeight: '700' },
    small: { fontSize: 12, marginTop: 4 },
  });
}
