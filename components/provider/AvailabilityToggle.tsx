import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import type { Availability } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
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
    <View style={styles.row}>
      <Text style={styles.day}>{DAYS[day]}</Text>
      <Switch
        value={on}
        onValueChange={(v) => void persist({ is_active: v })}
        trackColor={{ true: colors.coral, false: colors.dustyrose }}
        disabled={saving}
      />
      <Pressable onPress={() => setShowStart(true)} style={styles.timeBtn} disabled={!on}>
        <Text style={styles.timeText}>{dateToTime(start).slice(0, 5)}</Text>
      </Pressable>
      <Text style={styles.sep}>–</Text>
      <Pressable onPress={() => setShowEnd(true)} style={styles.timeBtn} disabled={!on}>
        <Text style={styles.timeText}>{dateToTime(end).slice(0, 5)}</Text>
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
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  day: { width: 40, fontWeight: '700', color: colors.charcoal },
  timeBtn: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dustyrose,
    justifyContent: 'center',
  },
  timeText: { fontSize: 15, color: colors.charcoal },
  sep: { color: colors.stone },
});
