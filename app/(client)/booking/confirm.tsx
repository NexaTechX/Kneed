import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { GradientButton } from '@/components/ui/GradientButton';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { useProviderDetail } from '@/hooks/useProviders';
import { calculateFees, formatCents } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useBookingDraftStore } from '@/stores/bookingDraftStore';

export default function BookingConfirmScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const providerId = useBookingDraftStore((s) => s.providerId);
  const serviceId = useBookingDraftStore((s) => s.serviceId);
  const scheduledAt = useBookingDraftStore((s) => s.scheduledAt);
  const locationType = useBookingDraftStore((s) => s.locationType);
  const notes = useBookingDraftStore((s) => s.notes);
  const setNotes = useBookingDraftStore((s) => s.setNotes);
  const reset = useBookingDraftStore((s) => s.reset);

  const { data, isLoading } = useProviderDetail(providerId);

  const selectedService = useMemo(
    () => data?.services?.find((s) => s.id === serviceId),
    [data?.services, serviceId],
  );

  const profileName = data?.profiles?.full_name ?? 'Provider';

  const onConfirm = async () => {
    if (!user || !providerId || !selectedService || !scheduledAt) {
      Alert.alert('Missing details', 'Go back and complete date and time.');
      return;
    }
    const loc: 'studio' | 'mobile' =
      selectedService.location_type === 'mobile'
        ? 'mobile'
        : selectedService.location_type === 'studio'
          ? 'studio'
          : locationType ?? 'studio';

    if (selectedService.location_type === 'both' && !locationType) {
      Alert.alert('Choose location', 'Studio or mobile?');
      return;
    }

    setSubmitting(true);
    try {
      const { platformFee, total } = calculateFees(selectedService.price_cents);
      const { error } = await supabase.from('bookings').insert({
        client_id: user.id,
        provider_id: providerId,
        service_id: selectedService.id,
        scheduled_at: scheduledAt.toISOString(),
        location_type: loc,
        address: loc === 'mobile' ? null : null,
        status: 'pending',
        price_cents: selectedService.price_cents,
        platform_fee_cents: platformFee,
        total_cents: total,
        notes: notes || null,
      });
      if (error) throw error;
      reset();
      Alert.alert('Booked!', 'Your request was sent to the provider.', [
        { text: 'OK', onPress: () => router.replace('/(client)/(tabs)/bookings') },
      ]);
    } catch (e: unknown) {
      Alert.alert('Booking failed', e instanceof Error ? e.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const onPayStub = () => {
    Alert.alert('Payment', 'Card processing is not connected yet. Confirming will still place your booking request.');
  };

  if (!providerId || !serviceId || !scheduledAt) {
    return (
      <SafeView>
        <ScreenHeader title="Confirm session" showBack />
        <Text style={styles.muted}>Nothing to confirm. Start from a provider profile.</Text>
      </SafeView>
    );
  }

  if (isLoading || !data || !selectedService) {
    return (
      <SafeView>
        <ScreenHeader title="Confirm session" showBack />
        <Text style={styles.muted}>Loading…</Text>
      </SafeView>
    );
  }

  const fees = calculateFees(selectedService.price_cents);
  const locLabel =
    selectedService.location_type === 'mobile'
      ? 'Mobile — provider travels to you'
      : selectedService.location_type === 'studio'
        ? 'Studio session'
        : locationType === 'mobile'
          ? 'Mobile'
          : locationType === 'studio'
            ? 'Studio'
            : 'Choose on provider profile';

  return (
    <SafeView>
      <ScreenHeader title="Confirm your session" showBack />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[textStyles.bodyMuted, styles.lead]}>Review details before you confirm.</Text>

        <Card style={styles.card}>
          <Text style={styles.providerLabel}>With</Text>
          <Text style={styles.providerName}>{profileName}</Text>
          <Text style={styles.row}>Service · {selectedService.type.replace('_', ' ')}</Text>
          <Text style={styles.row}>{scheduledAt.toLocaleString()}</Text>
          <View style={styles.divider} />
          <Text style={styles.row}>Subtotal · {formatCents(selectedService.price_cents)}</Text>
          <Text style={styles.row}>Platform fee (15%) · {formatCents(fees.platformFee)}</Text>
          <Text style={styles.total}>Total · {formatCents(fees.total)}</Text>
        </Card>

        <Text style={styles.section}>Location</Text>
        <Card style={styles.card}>
          <View style={styles.locRow}>
            <FontAwesome name="map-marker" size={18} color={colors.teal} />
            <Text style={styles.locText}>{locLabel}</Text>
          </View>
          {data.studio_address ? (
            <Text style={styles.subLoc}>{data.studio_address}</Text>
          ) : null}
        </Card>

        <Text style={styles.section}>Payment</Text>
        <Card style={styles.card}>
          <PressablePaymentRow onPress={onPayStub} />
        </Card>

        <Text style={styles.section}>Notes (optional)</Text>
        <Input
          placeholder="Anything the provider should know?"
          value={notes ?? ''}
          onChangeText={(t) => setNotes(t)}
          multiline
          style={{ minHeight: 88, textAlignVertical: 'top' }}
        />

        <GradientButton
          title="Confirm & pay"
          loading={submitting}
          onPress={onConfirm}
          icon="lock"
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeView>
  );
}

function PressablePaymentRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.payRow} accessibilityRole="button">
      <FontAwesome name="credit-card" size={28} color={colors.mauve} />
      <View style={{ flex: 1 }}>
        <Text style={styles.payTitle}>Visa ·•••· 4242</Text>
        <Text style={styles.paySub}>Demo card — not charged</Text>
      </View>
      <FontAwesome name="chevron-right" size={16} color={colors.stone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  lead: { marginBottom: spacing.md },
  muted: { padding: spacing.lg, color: colors.stone, fontFamily: fonts.body },
  card: { gap: spacing.xs },
  providerLabel: {
    fontFamily: textStyles.overline.fontFamily,
    fontSize: textStyles.overline.fontSize,
    letterSpacing: textStyles.overline.letterSpacing,
    color: textStyles.overline.color,
    marginBottom: 4,
  },
  providerName: {
    fontFamily: fonts.serifSemi,
    fontSize: 22,
    color: colors.brownDark,
    marginBottom: spacing.sm,
  },
  row: { fontFamily: fonts.body, fontSize: 15, color: colors.brown },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  total: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.coralBright,
    marginTop: spacing.xs,
  },
  section: {
    fontFamily: fonts.serifSemi,
    fontSize: 18,
    color: colors.brownDark,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locText: { fontFamily: fonts.body, fontSize: 15, color: colors.brown, flex: 1 },
  subLoc: { marginTop: spacing.xs, fontSize: 14, color: colors.stone, fontFamily: fonts.body },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  payTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.brown },
  paySub: { fontSize: 13, color: colors.stone, marginTop: 2, fontFamily: fonts.body },
});
