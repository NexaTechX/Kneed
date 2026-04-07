import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AvailabilityToggle } from '@/components/provider/AvailabilityToggle';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { textStyles } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Availability } from '@/types/database';

export default function ProviderScheduleScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  if (!user) {
    return (
      <SafeView>
        <Text style={{ padding: 16 }}>Loading…</Text>
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

  const byDay = (d: number) => data?.find((a) => a.day_of_week === d);

  return (
    <SafeView>
      <ScreenHeader title="Schedule" />
      <Text style={[textStyles.bodyMuted, styles.sub]}>Toggle days and adjust hours. Changes save automatically.</Text>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {Array.from({ length: 7 }).map((_, day) => (
          <Card key={day} style={styles.dayCard}>
            <AvailabilityToggle
              providerId={user.id}
              day={day}
              availability={byDay(day)}
              onSaved={() => void qc.invalidateQueries({ queryKey: ['availability-week', user?.id] })}
            />
          </Card>
        ))}
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  sub: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  dayCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
});
