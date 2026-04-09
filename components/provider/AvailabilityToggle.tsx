import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import type { Availability } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timeToDate(t: string) {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`;
}

export function AvailabilityToggle({
  providerId,
  day,
  availability,
  onSaved,
}: {
  providerId: string;
  day: number;
  availability?: Availability | null;
  onSaved?: () => void;
}) {
  const t = useAppTheme();
  const [on, setOn] = useState(availability?.is_active ?? false);
  const [start, setStart] = useState(timeToDate(availability?.start_time ?? '09:00:00'));
  const [end, setEnd] = useState(timeToDate(availability?.end_time ?? '18:00:00'));
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [saving, setSaving] = useState(false);

  const persist = async (next: Partial<Availability>) => {
    setSaving(true);
    try {
      const payload = {
        provider_id: providerId,
        day_of_week: day,
        start_time: dateToTime(start),
        end_time: dateToTime(end),
        is_active: next.is_active ?? on,
        ...next,
      };
      const { error } = await supabase.from('availability').upsert(payload, { onConflict: 'provider_id,day_of_week' });
      if (error) throw error;
      if (next.is_active !== undefined) setOn(next.is_active);
      onSaved?.();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <Text style={[styles.day, { color: t.text }]}>{DAYS[day]}</Text>
      <Switch
        value={on}
        onValueChange={(v) => void persist({ is_active: v })}
        trackColor={{ true: t.primary, false: t.borderStrong }}
        thumbColor={t.surfaceElevated}
        ios_backgroundColor={t.borderStrong}
        disabled={saving}
      />
      <Pressable
        onPress={() => setShowStart(true)}
        style={[styles.timeBtn, { borderColor: t.borderStrong, backgroundColor: t.surfaceElevated }]}
        disabled={!on}>
        <Text style={[styles.timeText, { color: t.text }]}>{dateToTime(start).slice(0, 5)}</Text>
      </Pressable>
      <Text style={[styles.sep, { color: t.textTertiary }]}>–</Text>
      <Pressable
        onPress={() => setShowEnd(true)}
        style={[styles.timeBtn, { borderColor: t.borderStrong, backgroundColor: t.surfaceElevated }]}
        disabled={!on}>
        <Text style={[styles.timeText, { color: t.text }]}>{dateToTime(end).slice(0, 5)}</Text>
      </Pressable>

      {showStart && (
        <DateTimePicker
          value={start}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowStart(Platform.OS === 'ios');
            if (d) {
              setStart(d);
              void persist({ start_time: dateToTime(d) });
            }
          }}
        />
      )}
      {showEnd && (
        <DateTimePicker
          value={end}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowEnd(Platform.OS === 'ios');
            if (d) {
              setEnd(d);
              void persist({ end_time: dateToTime(d) });
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  day: { width: 40, fontWeight: '800' },
  timeBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  timeText: { fontSize: 15, fontWeight: '600' },
  sep: { fontWeight: '600' },
});
