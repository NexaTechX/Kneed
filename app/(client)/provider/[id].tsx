import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, Image, Switch } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { RatingStarsDisplay } from '@/components/provider/RatingStars';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useProviderDetail } from '@/hooks/useProviders';
import { calculateFees, formatCents } from '@/lib/utils';
import { openPaystackCheckoutForBooking } from '@/lib/paystack';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useBookingDraftStore } from '@/stores/bookingDraftStore';
import type { Service } from '@/types/database';
import { Avatar } from '@/components/ui/Avatar';

export default function ProviderDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof rawId === 'string' ? rawId : rawId?.[0];
  const router = useRouter();
  const { user } = useAuth();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { data, isLoading } = useProviderDetail(id);

  const step = useBookingDraftStore((s) => s.step);
  const setStep = useBookingDraftStore((s) => s.setStep);
  const setProvider = useBookingDraftStore((s) => s.setProvider);
  const setService = useBookingDraftStore((s) => s.setService);
  const setTime = useBookingDraftStore((s) => s.setTime);
  const setLocationType = useBookingDraftStore((s) => s.setLocationType);
  const setAddress = useBookingDraftStore((s) => s.setAddress);
  const reset = useBookingDraftStore((s) => s.reset);

  const serviceId = useBookingDraftStore((s) => s.serviceId);
  const scheduledAt = useBookingDraftStore((s) => s.scheduledAt);
  const locationType = useBookingDraftStore((s) => s.locationType);
  const notes = useBookingDraftStore((s) => s.notes);
  const draftAddress = useBookingDraftStore((s) => s.address);

  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(true);

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

  const effectiveLocationType = useMemo((): 'studio' | 'mobile' | null => {
    if (!selectedService) return null;
    if (selectedService.location_type === 'mobile') return 'mobile';
    if (selectedService.location_type === 'studio') return 'studio';
    return locationType ?? null;
  }, [selectedService, locationType]);

  const onBook = async () => {
    if (!user || !id || !data || !selectedService || !scheduledAt) {
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

    let addressLine: string | null = null;
    if (loc === 'studio') {
      const studio = data.studio_address?.trim();
      if (!studio) {
        Alert.alert(
          'Studio address missing',
          'This provider has not set a studio address yet. Choose another provider or a mobile service.',
        );
        return;
      }
      addressLine = studio;
    } else {
      const clientAddr = draftAddress?.trim() ?? '';
      if (!clientAddr) {
        Alert.alert('Address needed', 'Enter the address where the provider should meet you.');
        return;
      }
      addressLine = clientAddr;
    }

    setSubmitting(true);
    try {
      const { platformFee, total } = calculateFees(selectedService.price_cents);
      const { data: row, error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          provider_id: id,
          service_id: selectedService.id,
          scheduled_at: scheduledAt.toISOString(),
          location_type: loc,
          address: addressLine,
          status: 'pending',
          price_cents: selectedService.price_cents,
          platform_fee_cents: platformFee,
          total_cents: total,
          notes: notes || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const newId = row?.id;
      reset();
      const goBookings = () =>
        router.replace(`/(client)/(tabs)/bookings${newId ? `?highlight=${newId}` : ''}` as never);

      Alert.alert(
        'Booked!',
        'Your request was sent to the provider. They can confirm only after you pay. Pay now with Paystack?',
        [
          { text: 'Later', style: 'cancel', onPress: goBookings },
          {
            text: 'Pay now',
            onPress: () => {
              void (async () => {
                if (!newId) {
                  goBookings();
                  return;
                }
                const pay = await openPaystackCheckoutForBooking(newId);
                if (!pay.ok && pay.message) {
                  Alert.alert('Paystack', pay.message);
                }
                goBookings();
              })();
            },
          },
        ],
      );
    } catch (e: unknown) {
      Alert.alert('Booking failed', e instanceof Error ? e.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) {
    return (
      <SafeView style={styles.page}>
        <Text style={[styles.muted, { color: t.textSecondary }]}>Invalid provider link.</Text>
      </SafeView>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeView style={styles.page}>
        <Text style={[styles.muted, { color: t.textSecondary }]}>Loading…</Text>
      </SafeView>
    );
  }

  const profileName = data.profiles?.full_name ?? 'Provider';
  const services = (data.services ?? []).filter((s) => s.is_active);
  const coverImage =
    'file:///C:/Users/shine/.cursor/projects/c-Users-shine-Desktop-KNEED/assets/c__Users_shine_AppData_Roaming_Cursor_User_workspaceStorage_58ef99ee9dda944007ce2791837d8137_images_image-a6e4087f-546d-4bd9-a7f9-58827dd2a57d.png';
  const calendarDays = getWeekStrip(date);

  return (
    <SafeView style={styles.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.coverWrap}>
          <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
          <View style={styles.coverOverlay} />
          <View style={styles.topOverlayBar}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}>
              <FontAwesome name="arrow-left" size={16} color="#8D1F44" />
            </Pressable>
            <Text style={styles.topTitle}>Wellness Curator</Text>
            <Pressable style={styles.iconBtn}>
              <FontAwesome name="share-alt" size={16} color="#8D1F44" />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarShell}>
              <Avatar name={profileName} size={88} />
            </View>
            {data.is_verified ? (
              <View style={styles.verifyDot}>
                <FontAwesome name="certificate" size={12} color="#8D1F44" />
              </View>
            ) : null}
          </View>

          <Text style={styles.name}>{profileName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaBadge}>{data.is_verified ? 'KNEAD VERIFIED' : 'PENDING VERIFICATION'}</Text>
            <Text style={styles.metaLocation}>{data.studio_address?.split(',')[0] || 'San Francisco, CA'}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data.average_rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>{data.total_reviews} REVIEWS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{Math.max(data.years_exp, 1)} yrs</Text>
              <Text style={styles.statLabel}>EXPERIENCE</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>200+</Text>
              <Text style={styles.statLabel}>SESSIONS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data.is_verified ? '✓' : '-'}</Text>
              <Text style={styles.statLabel}>INSURED</Text>
            </View>
          </View>

          <Text style={styles.kicker}>ABOUT THE PRACTITIONER</Text>
          {data.bio ? <Text style={styles.bioHero}>{data.bio}</Text> : null}

          <View style={styles.sectionHead}>
            <Text style={styles.kicker}>CURATED SERVICES</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceRow}>
            {services.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setProvider(id);
                  setService(s.id);
                  setShowBookingFlow(true);
                  setStep(2);
                }}
                style={[styles.serviceCard, serviceId === s.id && styles.serviceCardActive]}>
                <View style={styles.serviceTop}>
                  <FontAwesome name="leaf" size={14} color="#CA8E9A" />
                  <Text style={styles.servicePrice}>{formatCents(s.price_cents)}</Text>
                </View>
                <Text style={styles.serviceTitle}>{s.type.replace('_', ' ')}</Text>
                <Text style={styles.serviceDesc}>Gentle, restorative bodywork designed for deep relief and balance.</Text>
                <Text style={styles.serviceMeta}>◷ {s.duration_min} MIN</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.kicker}>UPCOMING AVAILABILITY</Text>
          <View style={styles.daysRow}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
              <View key={d} style={styles.dayCell}>
                <Text style={styles.dayName}>{d}</Text>
                <View style={[styles.dayBubble, (idx === 1 || idx === 2 || idx === 4) && styles.dayBubbleActive]}>
                  <Text style={[styles.dayNum, (idx === 1 || idx === 2 || idx === 4) && styles.dayNumActive]}>{14 + idx}</Text>
                </View>
              </View>
            ))}
          </View>

          {!showBookingFlow ? (
            <Pressable style={styles.bookHeroBtn} onPress={() => setShowBookingFlow(true)}>
              <FontAwesome name="calendar" size={16} color="#FFFFFF" />
              <Text style={styles.bookHeroText}>Book Session</Text>
            </Pressable>
          ) : null}

          {showBookingFlow ? (
            <>
        {!data.is_verified ? <Badge label="Verification pending" tone="warning" /> : null}
        <View style={styles.row}>
          <RatingStarsDisplay value={data.average_rating} />
          <Text style={[styles.meta, { color: t.textSecondary }]}>{data.total_reviews} reviews</Text>
        </View>
        {data.bio ? <Text style={[styles.bio, { color: t.text }]}>{data.bio}</Text> : null}

        <Text style={[styles.section, { color: t.text }]}>Book</Text>
        <View style={[styles.stepPill, { backgroundColor: t.primaryMuted }]}>
          <Text style={[styles.step, { color: t.primary }]}>Step {step} of 4</Text>
        </View>

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
            <Button
              title="Next"
              onPress={() => {
                if (selectedService?.location_type === 'both' && !locationType) {
                  Alert.alert('Choose location', 'Studio or mobile?');
                  return;
                }
                setStep(3);
              }}
            />
          </View>
        )}

        {step === 3 && id ? (
          <View style={styles.calendarPanel}>
            <Text style={styles.calendarTitle}>Choose a time</Text>

            <View style={styles.providerMiniCard}>
              <Avatar name={profileName} size={62} />
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={styles.providerMiniName}>{profileName}</Text>
                <Text style={styles.providerMiniService}>
                  {selectedService ? selectedService.type.replace('_', ' ') : 'Session'}
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
              {calendarDays.map((d) => {
                const active = isSameCalendarDay(d.date, date);
                return (
                  <Pressable
                    key={d.date.toISOString()}
                    onPress={() => setDate(d.date)}
                    style={[styles.dayPill, active && styles.dayPillActive]}>
                    <Text style={[styles.dayPillName, active && styles.dayPillNameActive]}>{d.day}</Text>
                    <Text style={[styles.dayPillNum, active && styles.dayPillNumActive]}>{d.dayOfMonth}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TimeSlotPicker
              providerId={id}
              selectedDate={date}
              selected={scheduledAt}
              onSelect={(time) => {
                const combined = new Date(date);
                combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
                setTime(combined);
              }}
            />

            <View style={styles.calendarSyncRow}>
              <View>
                <Text style={styles.calendarSyncTitle}>Add to Calendar</Text>
                <Text style={styles.calendarSyncSub}>Sync this booking with your phone calendar</Text>
              </View>
              <Switch
                value={addToCalendar}
                onValueChange={setAddToCalendar}
                trackColor={{ false: '#E2DCD4', true: '#F7B2A1' }}
                thumbColor={addToCalendar ? '#F49278' : '#FFFFFF'}
              />
            </View>

            <LinearGradient colors={['#9B5A62', '#D7A1A2']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.continueGradient}>
              <Pressable
                onPress={() => (scheduledAt ? setStep(4) : Alert.alert('Pick a time'))}
                style={styles.continueBtn}
                accessibilityRole="button">
                <Text style={styles.continueText}>Continue to Payment</Text>
                <FontAwesome name="long-arrow-right" size={16} color="#FFFFFF" />
              </Pressable>
            </LinearGradient>
          </View>
        ) : null}

        {step === 4 && selectedService && scheduledAt ? (
          <View style={styles.confirmPanel}>
            <Text style={styles.confirmHeading}>Confirm Your Session</Text>
            <View style={styles.confirmCard}>
              <View style={styles.confirmTop}>
                <Avatar name={profileName} size={54} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={styles.confirmProvider}>{profileName}</Text>
                  <Text style={styles.confirmProviderRole}>Elite Massage Therapist</Text>
                </View>
              </View>
              <View style={styles.confirmLine}>
                <FontAwesome name="leaf" size={14} color="#CB8E9A" />
                <View style={{ marginLeft: spacing.sm }}>
                  <Text style={styles.confirmMainText}>
                    {selectedService.type.replace('_', ' ')} {selectedService.duration_min}min
                  </Text>
                  <Text style={styles.confirmSubText}>Full body relaxation with natural oils</Text>
                </View>
              </View>
              <View style={styles.confirmLine}>
                <FontAwesome name="calendar" size={14} color="#F49278" />
                <View style={{ marginLeft: spacing.sm }}>
                  <Text style={styles.confirmMainText}>
                    {scheduledAt.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.confirmSubText}>{selectedService.duration_min} minutes duration</Text>
                </View>
              </View>
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.confirmKicker}>LOCATION</Text>
              <Pressable onPress={() => setStep(2)}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
            <View style={styles.locationCard}>
              <View style={styles.locationIconWrap}>
                <FontAwesome name={effectiveLocationType === 'mobile' ? 'home' : 'map-marker'} size={16} color="#8B4B3D" />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.locationTitle}>{effectiveLocationType === 'mobile' ? 'Your Home' : 'Provider Studio'}</Text>
                <Text style={styles.locationAddress}>
                  {effectiveLocationType === 'mobile'
                    ? draftAddress?.trim() || 'Enter your visit address below.'
                    : data.studio_address?.trim() || 'Provider has not set a studio address yet.'}
                </Text>
              </View>
            </View>
            {effectiveLocationType === 'mobile' ? (
              <Input
                placeholder="Street, city, ZIP"
                value={draftAddress ?? ''}
                onChangeText={(text) => setAddress(text)}
                multiline
                style={{ minHeight: 72, textAlignVertical: 'top', marginTop: spacing.sm }}
              />
            ) : null}

            <Text style={styles.confirmKicker}>PAYMENT SUMMARY</Text>
            <View style={styles.summaryBlock}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service</Text>
                <Text style={styles.summaryValue}>{formatCents(selectedService.price_cents)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Knead Fee (15%)</Text>
                <Text style={styles.summaryValue}>{formatCents(calculateFees(selectedService.price_cents).platformFee)}</Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: spacing.sm }]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCents(calculateFees(selectedService.price_cents).total)}</Text>
              </View>
            </View>

            <View style={styles.paymentMethodRow}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>VISA</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.cardTextMain}>Visa ending 4242</Text>
                <Text style={styles.cardTextSub}>EXPIRES 09/26</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#B0A79D" />
            </View>

            <Text style={styles.cancelNote}>Free cancellation until 24 hours before</Text>
            <View style={styles.trustRow}>
              <Text style={styles.trustText}>SECURE PAYMENT</Text>
              <Text style={styles.trustText}>VERIFIED PROVIDER</Text>
            </View>

            <Pressable onPress={onBook} disabled={submitting} style={({ pressed }) => [styles.confirmPayBtn, pressed && { opacity: 0.9 }]}>
              {submitting ? (
                <Text style={styles.confirmPayText}>Processing...</Text>
              ) : (
                <>
                  <FontAwesome name="lock" size={14} color="#FFFFFF" />
                  <Text style={styles.confirmPayText}>Confirm & Pay</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeView>
  );
}

function createStyles(_t: AppTheme) {
  return StyleSheet.create({
    page: { backgroundColor: '#F7F5F1' },
    coverWrap: { height: 265, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(20, 18, 16, 0.28)',
    },
    topOverlayBar: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#FFF5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitle: { color: '#8D1F44', fontSize: 18, fontWeight: '700' },
    body: {
      marginTop: -16,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      backgroundColor: '#F7F5F1',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    avatarRow: { marginTop: -44, marginBottom: spacing.sm, alignItems: 'flex-start' },
    avatarShell: {
      borderWidth: 3,
      borderColor: '#F08A76',
      borderRadius: 48,
      padding: 2,
      backgroundColor: '#FFFFFF',
    },
    verifyDot: {
      position: 'absolute',
      left: 70,
      bottom: 4,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#E6D2D8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: { fontSize: 42 / 2, fontWeight: '800', color: '#1A1816', letterSpacing: -0.5 },
    metaRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
    metaBadge: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: '#6F3E3E',
      backgroundColor: '#EFD9D4',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 7,
      overflow: 'hidden',
    },
    metaLocation: { color: '#7A746D', fontSize: 13, fontWeight: '600' },
    statsGrid: {
      marginTop: spacing.lg,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statCard: {
      width: '48.5%',
      backgroundColor: '#F1EFEB',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    },
    statValue: { color: '#2A2723', fontSize: 30 / 2, fontWeight: '800' },
    statLabel: { color: '#8B847B', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },
    kicker: {
      marginTop: spacing.xl,
      color: '#A09A91',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 2.2,
    },
    bioHero: { marginTop: spacing.md, color: '#302D29', fontSize: 31 / 2, lineHeight: 27 },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    serviceRow: { paddingTop: spacing.md, paddingBottom: spacing.xs, gap: spacing.sm },
    serviceCard: {
      width: 220,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#ECE6DE',
    },
    serviceCardActive: { borderColor: '#D08B7D', backgroundColor: '#FFF9F6' },
    serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    servicePrice: { color: '#2A2520', fontSize: 20 / 2, fontWeight: '800' },
    serviceTitle: { marginTop: spacing.sm, color: '#1F1C18', fontSize: 17 * 0.95, fontWeight: '800' },
    serviceDesc: { marginTop: spacing.xs, color: '#6E675E', fontSize: 13, lineHeight: 19 },
    serviceMeta: { marginTop: spacing.md, color: '#2E2924', fontSize: 12, fontWeight: '700' },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
    dayCell: { alignItems: 'center', gap: spacing.xs },
    dayName: { color: '#9A9389', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    dayBubble: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#EFECE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBubbleActive: { backgroundColor: '#F4E0DA', borderWidth: 1, borderColor: '#DEB2A5' },
    dayNum: { color: '#46403A', fontSize: 13, fontWeight: '700' },
    dayNumActive: { color: '#8F4A3B' },
    bookHeroBtn: {
      marginTop: spacing.xl,
      minHeight: 58,
      borderRadius: 999,
      backgroundColor: '#A84D33',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    bookHeroText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    calendarPanel: {
      marginTop: spacing.md,
      backgroundColor: '#F7F5F1',
      borderRadius: 18,
      padding: spacing.md,
      gap: spacing.md,
    },
    calendarTitle: { color: '#5B3C49', fontSize: 38 / 2, fontWeight: '800', letterSpacing: -0.3 },
    providerMiniCard: {
      backgroundColor: '#F0EEEA',
      borderRadius: 16,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    providerMiniName: { color: '#1E1A17', fontSize: 33 / 2, fontWeight: '800' },
    providerMiniService: { color: '#6B655E', fontSize: 15, marginTop: 2 },
    dayStrip: { gap: spacing.sm, paddingVertical: spacing.xs },
    dayPill: {
      width: 66,
      minHeight: 92,
      borderRadius: 24,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#EDE5DD',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    dayPillActive: {
      backgroundColor: '#F49278',
      borderColor: '#F49278',
    },
    dayPillName: { color: '#47423C', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
    dayPillNameActive: { color: '#FFFFFF' },
    dayPillNum: { color: '#1C1A18', fontSize: 33 / 2, fontWeight: '800' },
    dayPillNumActive: { color: '#FFFFFF' },
    calendarSyncRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    calendarSyncTitle: { color: '#1F1C18', fontSize: 19 * 0.95, fontWeight: '700' },
    calendarSyncSub: { color: '#6F6962', fontSize: 14, marginTop: 2, maxWidth: 240 },
    continueGradient: {
      borderRadius: 999,
      overflow: 'hidden',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    continueBtn: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    continueText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    confirmPanel: { marginTop: spacing.md, gap: spacing.md },
    confirmHeading: { color: '#3C2E38', fontSize: 34 / 2, fontWeight: '800', letterSpacing: -0.2 },
    confirmCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#ECD8D2',
      gap: spacing.sm,
    },
    confirmTop: { flexDirection: 'row', alignItems: 'center' },
    confirmProvider: { color: '#1E1A17', fontSize: 31 / 2, fontWeight: '800' },
    confirmProviderRole: { color: '#6E6760', fontSize: 14, marginTop: 2 },
    confirmLine: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs },
    confirmMainText: { color: '#2B2621', fontSize: 15, fontWeight: '700' },
    confirmSubText: { color: '#746D65', fontSize: 14, marginTop: 2 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
    confirmKicker: { color: '#8E877D', fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
    changeLink: { color: '#7C736A', fontSize: 13, textDecorationLine: 'underline' },
    locationCard: {
      backgroundColor: '#F1EFEB',
      borderRadius: 14,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: '#E5DED5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationTitle: { color: '#231F1B', fontSize: 17, fontWeight: '700' },
    locationAddress: { color: '#665F57', fontSize: 14, marginTop: 2, lineHeight: 20 },
    summaryBlock: { gap: spacing.sm, marginTop: spacing.xs },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { color: '#4E4943', fontSize: 17 * 0.95 },
    summaryValue: { color: '#2C2722', fontSize: 17 * 0.95 },
    totalLabel: { color: '#1C1917', fontSize: 21 / 2, fontWeight: '700' },
    totalValue: { color: '#8B4B3D', fontSize: 38 / 2, fontWeight: '800' },
    paymentMethodRow: {
      marginTop: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#ECE4DA',
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardIcon: {
      width: 44,
      height: 30,
      borderRadius: 6,
      backgroundColor: '#F2F1EE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardIconText: { color: '#3A4D8A', fontSize: 11, fontWeight: '800' },
    cardTextMain: { color: '#26221E', fontSize: 15, fontWeight: '700' },
    cardTextSub: { color: '#8F877D', fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 0.8 },
    cancelNote: { color: '#5A544D', fontSize: 15, marginTop: spacing.md },
    trustRow: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.lg },
    trustText: { color: '#8C847B', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
    confirmPayBtn: {
      minHeight: 58,
      borderRadius: 999,
      backgroundColor: '#F49278',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    confirmPayText: { color: '#FFFFFF', fontSize: 32 / 2, fontWeight: '800' },
    muted: { padding: spacing.lg, fontSize: 15 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    meta: { fontSize: 14, fontWeight: '600' },
    bio: { marginBottom: spacing.md, fontSize: 16, lineHeight: 24 },
    section: { marginTop: spacing.lg, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    stepPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: spacing.sm },
    step: { fontSize: 13, fontWeight: '800' },
    confirm: { fontSize: 15, marginBottom: 6, lineHeight: 22 },
    confirmTotal: { fontSize: 20, fontWeight: '800', marginVertical: spacing.sm, letterSpacing: -0.3 },
    addressHint: { fontSize: 14, marginBottom: spacing.sm, lineHeight: 20 },
  });
}

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekStrip(base: Date) {
  const out: { day: string; dayOfMonth: number; date: Date }[] = [];
  for (let i = -1; i < 5; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({
      day: d.toLocaleDateString([], { weekday: 'short' }).toUpperCase(),
      dayOfMonth: d.getDate(),
      date: d,
    });
  }
  return out;
}
