import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Availability } from '@/types/database';

type DayState = {
  day: number;
  is_active: boolean;
  start_time: string;
  end_time: string;
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export default function ProviderScheduleScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [week, setWeek] = useState<DayState[]>([]);
  const [expandedDay, setExpandedDay] = useState<number>(2);
  const [saving, setSaving] = useState(false);
  const [pickerMode, setPickerMode] = useState<{ day: number; field: 'start_time' | 'end_time' } | null>(null);

  if (!user) {
    return (
      <SafeView style={styles.page}>
        <Text style={{ padding: spacing.lg, color: t.textSecondary }}>Loading…</Text>
      </SafeView>
    );
  }

  const { data } = useQuery({
    queryKey: ['availability-week', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: rows, error } = await supabase.from('availability').select('*').eq('provider_id', user.id);
      if (error) throw error;
      return rows as Availability[];
    },
  });

  useEffect(() => {
    if (!data) return;
    const next: DayState[] = Array.from({ length: 7 }).map((_, day) => {
      const row = data.find((a) => a.day_of_week === day);
      return {
        day,
        is_active: row?.is_active ?? false,
        start_time: row?.start_time ?? '09:00:00',
        end_time: row?.end_time ?? '18:00:00',
      };
    });
    setWeek(next);
    const firstActive = next.find((d) => d.is_active);
    if (firstActive) setExpandedDay(firstActive.day);
  }, [data]);

  const updateDay = (day: number, patch: Partial<DayState>) => {
    setWeek((prev) => prev.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  };

  const onSave = async () => {
    if (!week.length) return;
    setSaving(true);
    try {
      const payload = week.map((d) => ({
        provider_id: user.id,
        day_of_week: d.day,
        is_active: d.is_active,
        start_time: d.start_time,
        end_time: d.end_time,
      }));
      const { error } = await supabase.from('availability').upsert(payload, { onConflict: 'provider_id,day_of_week' });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['availability-week', user.id] });
      Alert.alert('Saved', 'Availability updated successfully.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  const pickerDayState = pickerMode ? week.find((d) => d.day === pickerMode.day) : undefined;

  return (
    <SafeView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <FontAwesome name="leaf" size={17} color="#C39AA3" />
            <Text style={styles.brandText}>Knead</Text>
          </View>
          <Pressable style={styles.settingsBtn}>
            <FontAwesome name="cog" size={18} color="#5F4C4E" />
          </Pressable>
        </View>

        <Text style={styles.title}>When are you available?</Text>

        <View style={styles.listWrap}>
          {week.map((d) => {
            const expanded = expandedDay === d.day && d.is_active;
            return (
              <View key={d.day} style={[styles.dayCard, expanded && styles.dayCardExpanded]}>
                <View style={styles.dayRow}>
                  <Switch
                    value={d.is_active}
                    onValueChange={(v) => {
                      updateDay(d.day, { is_active: v });
                      if (v) setExpandedDay(d.day);
                    }}
                    trackColor={{ false: '#EBD9DB', true: '#F4A18F' }}
                    thumbColor="#FFFFFF"
                  />
                  <Pressable style={styles.dayTextWrap} onPress={() => d.is_active && setExpandedDay(d.day)}>
                    <Text style={[styles.dayName, !d.is_active && styles.dayNameOff]}>{DAY_LABELS[d.day]}</Text>
                    <Text style={[styles.dayRange, !d.is_active && styles.dayRangeOff]}>
                      {d.is_active ? `${formatTime(d.start_time)} - ${formatTime(d.end_time)}` : 'Not available'}
                    </Text>
                  </Pressable>
                </View>

                {expanded ? (
                  <View style={styles.expandedArea}>
                    <View style={styles.rangeRail}>
                      <View style={styles.rangeTrack} />
                      <View style={[styles.rangeDot, { left: '18%' }]} />
                      <View style={[styles.rangeDot, { left: '68%' }]} />
                    </View>
                    <View style={styles.rangeLabels}>
                      <Text style={styles.rangeLabel}>8:00 AM</Text>
                      <Text style={styles.rangeLabel}>12:00 PM</Text>
                      <Text style={styles.rangeLabel}>4:00 PM</Text>
                      <Text style={styles.rangeLabel}>8:00 PM</Text>
                    </View>
                    <View style={styles.timeBtns}>
                      <Pressable style={styles.timeBtn} onPress={() => setPickerMode({ day: d.day, field: 'start_time' })}>
                        <Text style={styles.timeBtnText}>{formatTime(d.start_time)}</Text>
                      </Pressable>
                      <Pressable style={styles.timeBtn} onPress={() => setPickerMode({ day: d.day, field: 'end_time' })}>
                        <Text style={styles.timeBtnText}>{formatTime(d.end_time)}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
      </ScrollView>

      {pickerMode ? (
        <DateTimePicker
          value={timeToDate((pickerDayState?.[pickerMode.field] ?? '09:00:00'))}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, picked) => {
            if (Platform.OS !== 'ios') setPickerMode(null);
            if (!picked) return;
            updateDay(pickerMode.day, { [pickerMode.field]: dateToTime(picked) } as Partial<DayState>);
          }}
        />
      ) : null}
    </SafeView>
  );
}

function formatTime(t: string) {
  const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function timeToDate(t: string) {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`;
}

function createStyles(_t: AppTheme) {
  return StyleSheet.create({
    page: { backgroundColor: '#F7F5F1' },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    brandText: { color: '#5C464D', fontSize: 39 / 2, fontWeight: '800' },
    settingsBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    title: { color: '#5C464D', fontSize: 52 / 2, lineHeight: 58 / 2, fontWeight: '800', marginBottom: spacing.lg },
    listWrap: { gap: spacing.md },
    dayCard: {
      borderRadius: 20,
      backgroundColor: '#F2F0EC',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    dayCardExpanded: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#EFE7DE',
    },
    dayRow: { flexDirection: 'row', alignItems: 'center' },
    dayTextWrap: { marginLeft: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
    dayName: { color: '#262320', fontSize: 35 / 2, fontWeight: '700' },
    dayNameOff: { color: '#888177' },
    dayRange: { color: '#E19586', fontSize: 32 / 2, fontWeight: '700' },
    dayRangeOff: { color: '#9D968E', fontStyle: 'italic', fontWeight: '500' },
    expandedArea: { marginTop: spacing.md },
    rangeRail: { height: 20, justifyContent: 'center', position: 'relative' },
    rangeTrack: { height: 6, borderRadius: 999, backgroundColor: '#E2DED7' },
    rangeDot: {
      position: 'absolute',
      top: 1,
      marginLeft: -9,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: '#E5A39A',
      backgroundColor: '#FFFFFF',
    },
    rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
    rangeLabel: { color: '#6E675E', fontSize: 12, fontWeight: '600' },
    timeBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    timeBtn: {
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E8D4CD',
      backgroundColor: '#FFF9F8',
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeBtnText: { color: '#8A4B3D', fontSize: 15, fontWeight: '700' },
    saveBtn: {
      minHeight: 62,
      borderRadius: 999,
      backgroundColor: '#F49278',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xl,
      shadowColor: 'rgba(244,146,120,0.35)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 6,
    },
    saveText: { color: '#FFFFFF', fontSize: 33 / 2, fontWeight: '800' },
  });
}
