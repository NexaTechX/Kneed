import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ServiceList } from '@/components/provider/ServiceList';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { RatingStarsDisplay } from '@/components/provider/RatingStars';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useProviderDetail } from '@/hooks/useProviders';
import { calculateFees, formatCents } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useBookingDraftStore } from '@/stores/bookingDraftStore';
import type { Service } from '@/types/database';

export default function ProviderDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof rawId === 'string' ? rawId : rawId?.[0];
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading } = useProviderDetail(id);

  const step = useBookingDraftStore((s) => s.step);
  const setStep = useBookingDraftStore((s) => s.setStep);
  const setProvider = useBookingDraftStore((s) => s.setProvider);
  const setService = useBookingDraftStore((s) => s.setService);
  const setTime = useBookingDraftStore((s) => s.setTime);
  const setLocationType = useBookingDraftStore((s) => s.setLocationType);
  const setNotes = useBookingDraftStore((s) => s.setNotes);
  const reset = useBookingDraftStore((s) => s.reset);

  const serviceId = useBookingDraftStore((s) => s.serviceId);
  const scheduledAt = useBookingDraftStore((s) => s.scheduledAt);
  const locationType = useBookingDraftStore((s) => s.locationType);
  const notes = useBookingDraftStore((s) => s.notes);

  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    reset();
    setStep(1);
    setProvider(id);
  }, [id, reset, setProvider, setStep]);

  const selectedService = useMemo(
    () => data?.services?.find((s) => s.id === serviceId),
    [data?.services, serviceId],
  );

  const onBook = async () => {
    if (!user || !id || !selectedService || !scheduledAt) {
      Alert.alert('Missing details');
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
        provider_id: id,
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

  if (!id) {
    return (
      <SafeView>
        <Header title="Provider" showBack />
        <Text style={styles.muted}>Invalid provider link.</Text>
      </SafeView>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeView>
        <Header title="Provider" showBack />
        <Text style={styles.muted}>Loading…</Text>
      </SafeView>
    );
  }

  const profileName = data.profiles?.full_name ?? 'Provider';

  return (
    <SafeView>
      <Header title={profileName} showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {!data.is_verified ? <Badge label="Verification pending" tone="warning" /> : null}
        <View style={styles.row}>
          <RatingStarsDisplay value={data.average_rating} />
          <Text style={styles.meta}>{data.total_reviews} reviews</Text>
        </View>
        {data.bio ? <Text style={styles.bio}>{data.bio}</Text> : null}

        <Text style={styles.section}>Services</Text>
        <Card>
          <ServiceList services={(data.services ?? []).filter((s) => s.is_active)} />
        </Card>

        <Text style={styles.section}>Book</Text>
        <Text style={styles.step}>Step {step} of 4</Text>

        {step === 1 && (
          <View style={{ gap: spacing.sm }}>
            {(data.services ?? [])
              .filter((s) => s.is_active)
              .map((s: Service) => (
                <Button
                  key={s.id}
                  title={`${s.type.replace('_', ' ')} · ${formatCents(s.price_cents)}`}
                  variant={serviceId === s.id ? 'coral' : 'outline'}
                  onPress={() => {
                    setProvider(id);
                    setService(s.id);
                  }}
                />
              ))}
            <Button title="Next" onPress={() => (serviceId ? setStep(2) : Alert.alert('Pick a service'))} />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: spacing.md }}>
            <Button title={date.toDateString()} onPress={() => setShowDate(true)} />
            {showDate && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowDate(Platform.OS === 'ios');
                  if (d) setDate(d);
                }}
              />
            )}
            {selectedService?.location_type === 'both' ? (
              <View style={{ gap: spacing.sm }}>
                <Button
                  title="Studio"
                  variant={locationType === 'studio' ? 'coral' : 'outline'}
                  onPress={() => setLocationType('studio')}
                />
                <Button
                  title="Mobile"
                  variant={locationType === 'mobile' ? 'coral' : 'outline'}
                  onPress={() => setLocationType('mobile')}
                />
              </View>
            ) : null}
            <Button title="Next" onPress={() => setStep(3)} />
          </View>
        )}

        {step === 3 && id ? (
          <View style={{ gap: spacing.md }}>
            <TimeSlotPicker
              providerId={id}
              selectedDate={date}
              selected={scheduledAt}
              onSelect={(t) => {
                const combined = new Date(date);
                combined.setHours(t.getHours(), t.getMinutes(), 0, 0);
                setTime(combined);
              }}
            />
            <Button title="Next" onPress={() => (scheduledAt ? setStep(4) : Alert.alert('Pick a time'))} />
          </View>
        ) : null}

        {step === 4 && selectedService && scheduledAt ? (
          <Card>
            <Text style={styles.confirm}>Service: {selectedService.type}</Text>
            <Text style={styles.confirm}>When: {scheduledAt.toLocaleString()}</Text>
            <Text style={styles.confirm}>Price: {formatCents(selectedService.price_cents)}</Text>
            <Text style={styles.confirm}>
              Platform fee (15%): {formatCents(calculateFees(selectedService.price_cents).platformFee)}
            </Text>
            <Text style={styles.confirmTotal}>
              Total: {formatCents(calculateFees(selectedService.price_cents).total)}
            </Text>
            <Text style={[styles.section, { marginTop: spacing.md }]}>Notes (optional)</Text>
            <Input
              placeholder="Anything the provider should know?"
              value={notes ?? ''}
              onChangeText={(t) => setNotes(t)}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <Button title="Confirm booking" loading={submitting} onPress={onBook} />
          </Card>
        ) : null}
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  muted: { padding: spacing.lg, color: colors.stone },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  meta: { color: colors.stone },
  bio: { color: colors.charcoal, marginBottom: spacing.md },
  section: { marginTop: spacing.lg, fontSize: 18, fontWeight: '700', color: colors.charcoal },
  step: { color: colors.stone, marginBottom: spacing.sm },
  confirm: { fontSize: 15, color: colors.charcoal, marginBottom: 6 },
  confirmTotal: { fontSize: 18, fontWeight: '800', color: colors.coral, marginVertical: spacing.sm },
});
