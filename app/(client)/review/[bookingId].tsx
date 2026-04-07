import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RatingStarsInput } from '@/components/provider/RatingStars';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeView>
      <Header title="Leave a review" showBack />
      <View style={styles.body}>
        <Text style={styles.label}>Rating</Text>
        <RatingStarsInput value={rating} onChange={setRating} />
        <Text style={[styles.label, { marginTop: spacing.lg }]}>Comment (optional)</Text>
        <Input
          placeholder="How was your session?"
          value={comment}
          onChangeText={setComment}
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />
        <Button title="Submit review" loading={loading} onPress={submit} style={{ marginTop: spacing.lg }} />
      </View>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.charcoal },
});
