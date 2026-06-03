import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { createPrivateRoomSession, type DiscoverCreator } from '@/lib/privateRoom';
import { openPaystackCheckoutForPrivateRoom } from '@/lib/paystack';
import { formatSupabaseError } from '@/lib/supabaseErrors';
import { toNaira } from '@/lib/social';

const DURATIONS = [30, 60, 90, 120] as const;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Combine YYYY-MM-DD + HH:MM into a Date, or null if invalid/in the past. */
function parseDateTime(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const tm = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!d || !tm) return null;
  const dt = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(tm[1]), Number(tm[2]));
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getTime() < Date.now()) return null;
  return dt;
}

function defaultDate(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function BookingSheet({
  visible,
  creator,
  onClose,
  onBooked,
}: {
  visible: boolean;
  creator: DiscoverCreator | null;
  onClose: () => void;
  onBooked?: () => void;
}) {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user } = useAuth();
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const amountCents = creator?.private_room_rate_cents ?? 0;

  const confirm = async () => {
    if (!user || !creator) return;
    const when = parseDateTime(date, time);
    if (!when) {
      Alert.alert('Pick a time', 'Choose a valid future date (YYYY-MM-DD) and time (HH:MM).');
      return;
    }
    if (amountCents <= 0) {
      Alert.alert('Unavailable', 'This creator has not set a booking rate.');
      return;
    }
    setBusy(true);
    try {
      const sessionId = await createPrivateRoomSession({
        bookedUserId: creator.id,
        bookerUserId: user.id,
        startsAt: when.toISOString(),
        durationMin: duration,
        amountCents,
        notes: notes.trim() || null,
      });
      const pay = await openPaystackCheckoutForPrivateRoom(sessionId);
      if (!pay.ok) Alert.alert('Payment', pay.message);
      onBooked?.();
      onClose();
    } catch (e: unknown) {
      Alert.alert('Could not book', formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  };

  const name = creator?.full_name?.trim() || 'Creator';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.surfaceElevated }]} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.who}>
              <Avatar name={name} uri={creator?.avatar_url ?? null} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
                  Book {name}
                </Text>
                <Text style={[styles.rate, { color: t.accent }]}>{toNaira(amountCents)} per session</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={t.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.label, { color: t.textTertiary }]}>Date</Text>
          <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          <Text style={[styles.label, { color: t.textTertiary }]}>Time</Text>
          <Input value={time} onChangeText={setTime} placeholder="HH:MM" autoCapitalize="none" />

          <Text style={[styles.label, { color: t.textTertiary }]}>Duration</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => {
              const active = duration === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[
                    styles.chip,
                    { borderColor: active ? t.accent : t.border, backgroundColor: active ? `${t.accent}14` : 'transparent' },
                  ]}>
                  <Text style={[styles.chipText, { color: active ? t.accent : t.textSecondary }]}>{d} min</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: t.textTertiary }]}>Note (optional)</Text>
          <Input value={notes} onChangeText={setNotes} placeholder="Anything they should know" multiline style={styles.notes} />

          <Button title={`Book & pay · ${toNaira(amountCents)}`} loading={busy} onPress={() => void confirm()} style={{ marginTop: spacing.sm }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.lg,
      gap: spacing.xs,
      paddingBottom: spacing.xxl,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, gap: spacing.sm },
    who: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
    title: { fontSize: 18, fontWeight: '700' },
    rate: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
    chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 8 },
    chipText: { fontSize: 13, fontWeight: '600' },
    notes: { minHeight: 64, textAlignVertical: 'top', marginTop: spacing.xs },
  });
}
