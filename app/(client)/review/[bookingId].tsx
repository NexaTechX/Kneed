import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { RatingStarsInput } from '@/components/provider/RatingStars';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ['review-for-booking', bookingId],
    enabled: Boolean(bookingId),
    queryFn: async () => {
      const { data, error } = await supabase.from('reviews').select('id, rating, comment').eq('booking_id', bookingId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const submit = async () => {
    if (!user || !bookingId) return;
    setLoading(true);
    try {
      const { data: booking, error: bErr } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (bErr) throw bErr;
      if (!booking) throw new Error('Booking not found');

      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        client_id: user.id,
        provider_id: booking.provider_id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      Alert.alert('Thanks!', 'Your review was submitted.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not submit');
    } finally {
      setLoading(false);
    }
  };

  if (existingLoading) {
    return (
      <SafeView>
        <Header title="Leave a review" showBack />
        <Text style={[styles.muted, { color: t.textSecondary }]}>Loading…</Text>
      </SafeView>
    );
  }

  if (existing) {
    return (
      <SafeView>
        <Header title="Review" showBack />
        <View style={styles.body}>
          <Card>
            <Text style={[styles.label, { color: t.text }]}>You already left a review for this booking.</Text>
            <Button title="Back" variant="outline" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
          </Card>
        </View>
      </SafeView>
    );
  }

  return (
    <SafeView>
      <Header title="Leave a review" showBack />
      <View style={styles.body}>
        <Text style={[styles.intro, { color: t.textSecondary }]}>Share feedback to help others choose with confidence.</Text>
        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>Rating</Text>
          <RatingStarsInput value={rating} onChange={setRating} />
          <Text style={[styles.label, { marginTop: spacing.md }]}>Comment (optional)</Text>
          <Input
            placeholder="How was your session?"
            value={comment}
            onChangeText={setComment}
            multiline
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
          <Button title="Submit review" loading={loading} onPress={submit} style={{ marginTop: spacing.lg }} />
        </Card>
      </View>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    body: { padding: spacing.lg, gap: spacing.md },
    intro: { fontSize: 15, lineHeight: 22 },
    label: { fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
    muted: { padding: spacing.lg, fontSize: 15 },
  });
}
