import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { RatingStarsInput } from '@/components/provider/RatingStars';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const TAGS = [
  'Great pressure',
  'Relaxing',
  'On time',
  'Professional',
  'Clean space',
  'Skilled technique',
] as const;

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggleTag = (t: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

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
      <ScreenHeader title="Leave a review" showBack />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <View style={styles.providerRow}>
            <FontAwesome name="user-circle" size={40} color={colors.dustyRoseCard} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>How was your session?</Text>
              <Text style={styles.cardSub}>Your feedback helps other clients find great care.</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.label}>Rating</Text>
        <RatingStarsInput value={rating} onChange={setRating} />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>What stood out?</Text>
        <View style={styles.tagWrap}>
          {TAGS.map((t) => (
            <Chip key={t} label={t} selected={tags.has(t)} onPress={() => toggleTag(t)} />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Comment (optional)</Text>
        <Input
          placeholder="How was your session?"
          value={comment}
          onChangeText={setComment}
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />
        <Button title="Submit review" loading={loading} onPress={submit} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.lg },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 20,
    color: colors.brownDark,
  },
  cardSub: { ...textStyles.bodyMuted, marginTop: 4, fontSize: 14 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.brown, marginBottom: spacing.sm },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
