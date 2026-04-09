import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useDayAvailability } from '@/hooks/useAvailability';
import { generateTimeSlots } from '@/lib/utils';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

function segmentLabel(hour: number) {
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export function TimeSlotPicker({
  providerId,
  selectedDate,
  selected,
  onSelect,
}: {
  providerId: string;
  selectedDate: Date;
  selected?: Date;
  onSelect: (time: Date) => void;
}) {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { data, isLoading } = useDayAvailability(providerId, selectedDate);

  const slots = useMemo(() => {
    if (!data) return [];
    return generateTimeSlots(data.availability, selectedDate, data.bookingBlocks, 30);
  }, [data, selectedDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, Date[]>();
    for (const s of slots) {
      const key = segmentLabel(s.getHours());
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [slots]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  if (slots.length === 0) {
    return <Text style={styles.empty}>No slots available this day.</Text>;
  }

  return (
    <View style={styles.wrap}>
      {Array.from(grouped.entries()).map(([label, times]) => (
        <View key={label} style={styles.section}>
          <Text style={styles.sectionTitle}>{label}</Text>
          <View style={styles.grid}>
            {times.map((time) => {
              const active =
                selected &&
                time.getHours() === selected.getHours() &&
                time.getMinutes() === selected.getMinutes();
              return (
                <Pressable
                  key={time.toISOString()}
                  onPress={() => onSelect(time)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button">
                  <View style={styles.chipInner}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                    {active ? (
                      <View style={styles.selectedDot}>
                        <FontAwesome name="check" size={10} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: spacing.lg },
    section: { gap: spacing.md },
    sectionTitle: {
      fontSize: 28 / 2,
      fontWeight: '800',
      color: '#A09A91',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      minHeight: 58,
      minWidth: 124,
      paddingHorizontal: spacing.sm,
      borderRadius: 14,
      alignItems: 'stretch',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#EED9D4',
    },
    chipActive: {
      backgroundColor: '#F49278',
      borderColor: '#F49278',
    },
    chipInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    chipText: { color: '#5A453F', fontWeight: '700', fontSize: 31 / 2 },
    chipTextActive: { color: '#FFFFFF' },
    selectedDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: { padding: spacing.lg },
    empty: { color: '#6E675F', fontSize: 15, lineHeight: 22 },
  });
}
