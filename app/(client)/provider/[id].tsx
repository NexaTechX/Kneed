import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GradientButton } from '@/components/ui/GradientButton';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { RatingStarsDisplay } from '@/components/provider/RatingStars';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { useProviderDetail } from '@/hooks/useProviders';
import { formatCents } from '@/lib/utils';
import { useBookingDraftStore } from '@/stores/bookingDraftStore';
import type { Service } from '@/types/database';

const DATE_STRIP_DAYS = 10;

function DateStrip({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const days = useMemo(
    () => Array.from({ length: DATE_STRIP_DAYS }, (_, i) => addDays(startOfDay(new Date()), i)),
    [],
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRow}>
      {days.map((d) => {
        const sel = isSameDay(d, value);
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onChange(d)}
            style={[styles.stripChip, sel && styles.stripChipOn]}>
            <Text style={[styles.stripDow, sel && styles.stripDowOn]}>{format(d, 'EEE')}</Text>
            <Text style={[styles.stripDom, sel && styles.stripDomOn]}>{format(d, 'd')}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function ProviderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof rawId === 'string' ? rawId : rawId?.[0];
  const router = useRouter();
  const { data, isLoading } = useProviderDetail(id);
  const scrollRef = useRef<ScrollView>(null);
  const bookSectionY = useRef(0);

  const step = useBookingDraftStore((s) => s.step);
  const setStep = useBookingDraftStore((s) => s.setStep);
  const setProvider = useBookingDraftStore((s) => s.setProvider);
  const setService = useBookingDraftStore((s) => s.setService);
  const setTime = useBookingDraftStore((s) => s.setTime);
  const setLocationType = useBookingDraftStore((s) => s.setLocationType);
  const reset = useBookingDraftStore((s) => s.reset);

  const serviceId = useBookingDraftStore((s) => s.serviceId);
  const scheduledAt = useBookingDraftStore((s) => s.scheduledAt);
  const locationType = useBookingDraftStore((s) => s.locationType);

  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);

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

  const minPriceCents = useMemo(() => {
    const active = (data?.services ?? []).filter((s) => s.is_active);
    if (!active.length) return 0;
    return Math.min(...active.map((s) => s.price_cents));
  }, [data?.services]);

  const goToConfirm = () => {
    if (!id || !selectedService || !scheduledAt) {
      Alert.alert('Pick a time');
      return;
    }
    if (selectedService.location_type === 'both' && !locationType) {
      Alert.alert('Choose location', 'Go back and pick studio or mobile.');
      return;
    }
    router.push('/(client)/booking/confirm');
  };

  const scrollToBooking = () => {
    setStep(1);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, bookSectionY.current - 12),
        animated: true,
      });
    });
  };

  if (!id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Text style={styles.muted}>Invalid provider link.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Text style={styles.muted}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const profileName = data.profiles?.full_name ?? 'Provider';
  const avatarUri = data.profiles?.avatar_url ?? null;
  const locationLabel = data.studio_address?.trim()
    ? data.studio_address
    : data.lat != null && data.lng != null
      ? 'Service area'
      : 'Location on request';

  const services = (data.services ?? []).filter((s) => s.is_active);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[colors.dustyRoseCard, colors.coralBright]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGrad}
          />
          <Pressable
            onPress={() => router.back()}
            style={[styles.backFab, { top: insets.top + 8 }]}
            accessibilityRole="button">
            <FontAwesome name="chevron-left" size={22} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.avatarWrap}>
            <Avatar uri={avatarUri} name={profileName} size={96} />
          </View>
          <Text style={[textStyles.titleSerif, styles.name]}>{profileName}</Text>
          <View style={styles.verifyRow}>
            {data.is_verified ? (
              <>
                <FontAwesome name="check-circle" size={16} color={colors.verifiedGreen} />
                <Text style={styles.verifiedText}>Knead verified</Text>
              </>
            ) : (
              <Badge label="Verification pending" tone="warning" />
            )}
          </View>
          <View style={styles.locRow}>
            <FontAwesome name="map-marker" size={14} color={colors.stone} />
            <Text style={styles.locText}>{locationLabel}</Text>
          </View>
          <View style={styles.ratingRow}>
            <RatingStarsDisplay value={data.average_rating} />
            <Text style={styles.meta}>{data.total_reviews} reviews</Text>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{data.total_reviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{data.average_rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{minPriceCents ? formatCents(minPriceCents) : '—'}</Text>
              <Text style={styles.statLabel}>From</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{data.years_exp ?? 0}+</Text>
              <Text style={styles.statLabel}>Years exp.</Text>
            </View>
          </View>

          {data.bio ? (
            <View style={styles.about}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{data.bio}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Services</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.svcRow}>
            {services.map((s: Service) => (
              <Card key={s.id} style={styles.svcCard}>
                <Text style={styles.svcTitle}>{s.type.replace('_', ' ')}</Text>
                <Text style={styles.svcMeta}>
                  {s.duration_min} min · {s.location_type}
                </Text>
                <Text style={styles.svcPrice}>{formatCents(s.price_cents)}</Text>
              </Card>
            ))}
          </ScrollView>

          <GradientButton title="Book session" icon="none" onPress={scrollToBooking} style={{ marginTop: spacing.md }} />
        </View>

        <View
          onLayout={(e) => {
            bookSectionY.current = e.nativeEvent.layout.y;
          }}
          style={styles.bookSection}>
          <Text style={styles.sectionTitle}>Book</Text>
          <Text style={styles.stepLabel}>Step {step} of 3</Text>

          {step === 1 && (
            <View style={{ gap: spacing.sm }}>
              {services.map((s: Service) => (
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
              <Text style={styles.subLabel}>Choose a day</Text>
              <DateStrip value={date} onChange={setDate} />
              <Pressable onPress={() => setShowDate(true)} style={styles.altDate}>
                <Text style={styles.altDateText}>Other date…</Text>
              </Pressable>
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
                  <Text style={styles.subLabel}>Location</Text>
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
              <Text style={styles.subLabel}>Choose a time</Text>
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
              <Button title="Continue to payment" onPress={goToConfirm} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  muted: { padding: spacing.lg, color: colors.stone },
  heroWrap: { position: 'relative' },
  heroGrad: { height: 160, width: '100%' },
  backFab: {
    position: 'absolute',
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBlock: {
    paddingHorizontal: spacing.lg,
    marginTop: -52,
  },
  avatarWrap: {
    alignSelf: 'center',
    borderWidth: 4,
    borderColor: colors.background,
    borderRadius: 52,
  },
  name: { textAlign: 'center', marginTop: spacing.sm },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  verifiedText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.brown,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  locText: { fontSize: 14, color: colors.stone },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  meta: { color: colors.stone },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  statCell: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statVal: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.brown,
  },
  statLabel: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
  },
  about: { marginTop: spacing.lg },
  sectionTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 20,
    color: colors.brownDark,
    marginBottom: spacing.sm,
  },
  bio: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.brown },
  svcRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  svcCard: {
    width: 200,
    marginRight: spacing.sm,
    padding: spacing.md,
  },
  svcTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.brown,
    textTransform: 'capitalize',
  },
  svcMeta: { fontSize: 13, color: colors.stone, marginTop: 4 },
  svcPrice: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.coralBright,
  },
  bookSection: { padding: spacing.lg, paddingTop: spacing.xl },
  stepLabel: { color: colors.stone, marginBottom: spacing.sm, fontFamily: fonts.body },
  subLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.brown,
  },
  stripRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  stripChip: {
    width: 56,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  stripChipOn: {
    backgroundColor: colors.badgePink,
    borderColor: colors.coralBright,
  },
  stripDow: { fontSize: 11, color: colors.stone, fontFamily: fonts.bodyMedium },
  stripDowOn: { color: colors.brown },
  stripDom: { fontSize: 18, fontFamily: fonts.bodyBold, color: colors.brown, marginTop: 2 },
  stripDomOn: { color: colors.coralBright },
  altDate: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  altDateText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.teal },
});
