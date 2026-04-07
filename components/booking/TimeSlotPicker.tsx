import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';
import { useDayAvailability } from '@/hooks/useAvailability';
import { generateTimeSlots } from '@/lib/utils';
import { colors } from '@/constants/colors';
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
        <ActivityIndicator color={colors.coral} />
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
            {times.map((t) => {
              const active =
                selected &&
                t.getHours() === selected.getHours() &&
                t.getMinutes() === selected.getMinutes();
              return (
                <Pressable
                  key={t.toISOString()}
                  onPress={() => onSelect(t)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button">
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.stone },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dustyrose,
  },
  chipActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  chipText: { color: colors.charcoal, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  center: { padding: spacing.lg },
  empty: { color: colors.stone, fontSize: 15 },
});
