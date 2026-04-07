import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { formatCents } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { DurationMin, LocationType, ServiceType } from '@/types/database';

const TYPES: ServiceType[] = ['swedish', 'deep_tissue', 'sports', 'thai', 'prenatal'];
const DURATIONS: DurationMin[] = [30, 60, 90, 120];

const LOC_TABS: { key: LocationType; label: string }[] = [
  { key: 'studio', label: 'Studio' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'both', label: 'Both' },
];

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function ProviderServicesScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState({
    type: 'swedish' as ServiceType,
    duration_min: 60 as DurationMin,
    priceDollars: '80.00',
    location_type: 'both' as LocationType,
    description: '',
  });

  const { data, refetch } = useQuery({
    queryKey: ['services-me', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: rows, error } = await supabase.from('services').select('*').eq('provider_id', user!.id);
      if (error) throw error;
      return rows;
    },
  });

  const save = async () => {
    if (!user) return;
    try {
      const price_cents = Math.round(parseFloat(form.priceDollars) * 100);
      if (Number.isNaN(price_cents) || price_cents <= 0) throw new Error('Enter a valid price in dollars');
      if (editing && editing !== 'new') {
        const { error } = await supabase
          .from('services')
          .update({
            type: form.type,
            duration_min: form.duration_min,
            price_cents,
            location_type: form.location_type,
          })
          .eq('id', editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('services').insert({
          provider_id: user.id,
          type: form.type,
          duration_min: form.duration_min,
          price_cents,
          location_type: form.location_type,
          is_active: true,
        });
        if (error) throw error;
      }
      setEditing(null);
      await refetch();
      void qc.invalidateQueries();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from('services').update({ is_active: !is_active }).eq('id', id);
    if (error) Alert.alert('Error', error.message);
    else await refetch();
  };

  return (
    <SafeView>
      <ScreenHeader title="Services" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[textStyles.bodyMuted, styles.lead]}>Offerings clients can book on Knead.</Text>

        {(data ?? []).map((s) => (
          <Card key={s.id} style={styles.listCard}>
            <Pressable
              onPress={() => {
                setEditing(s.id);
                setForm({
                  type: s.type,
                  duration_min: s.duration_min,
                  priceDollars: centsToDollars(s.price_cents),
                  location_type: s.location_type,
                  description: '',
                });
              }}>
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle}>{s.type.replace('_', ' ')}</Text>
                {!s.is_active ? (
                  <View style={styles.inactivePill}>
                    <Text style={styles.inactiveText}>Inactive</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.rowMeta}>
                {s.duration_min} min · {formatCents(s.price_cents)} · {s.location_type}
              </Text>
            </Pressable>
            <Button title={s.is_active ? 'Deactivate' : 'Activate'} variant="outline" onPress={() => void toggleActive(s.id, s.is_active)} />
          </Card>
        ))}

        <Button
          title="Add new service"
          onPress={() => {
            setEditing('new');
            setForm({
              type: 'swedish',
              duration_min: 60,
              priceDollars: '80.00',
              location_type: 'both',
              description: '',
            });
          }}
        />

        {editing ? (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>{editing === 'new' ? 'Add service' : 'Edit service'}</Text>

            <Text style={styles.label}>Treatment type</Text>
            <View style={styles.chipRow}>
              {TYPES.map((t) => (
                <Chip
                  key={t}
                  label={t.replace('_', ' ')}
                  selected={form.type === t}
                  onPress={() => setForm((f) => ({ ...f, type: t }))}
                />
              ))}
            </View>

            <Text style={styles.label}>Duration</Text>
            <View style={styles.durRow}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setForm((f) => ({ ...f, duration_min: d }))}
                  style={[styles.durChip, form.duration_min === d && styles.durChipOn]}>
                  <Text style={[styles.durText, form.duration_min === d && styles.durTextOn]}>{d} min</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Price (USD)</Text>
            <Input
              value={form.priceDollars}
              onChangeText={(v) => setForm((f) => ({ ...f, priceDollars: v }))}
              keyboardType="decimal-pad"
              placeholder="80.00"
            />

            <Text style={styles.label}>Location</Text>
            <SegmentedTabs tabs={LOC_TABS} value={form.location_type} onChange={(k) => setForm((f) => ({ ...f, location_type: k }))} />

            <Text style={styles.label}>Description (optional)</Text>
            <Input
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="What should clients expect?"
              multiline
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />

            <Text style={styles.label}>Photos</Text>
            <Pressable style={styles.photoSlot} onPress={() => Alert.alert('Photos', 'Image upload coming soon.')}>
              <FontAwesome name="plus" size={22} color={colors.stone} />
              <Text style={styles.photoHint}>Add cover image</Text>
            </Pressable>

            <Button title="Save service" onPress={save} style={{ marginTop: spacing.md }} />
            <Button title="Cancel" variant="outline" onPress={() => setEditing(null)} />
          </Card>
        ) : null}
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  lead: { marginBottom: spacing.lg },
  listCard: { gap: spacing.sm, marginBottom: spacing.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.brown,
    textTransform: 'capitalize',
    flex: 1,
  },
  inactivePill: {
    backgroundColor: colors.segmentBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inactiveText: { fontSize: 11, fontFamily: fonts.bodySemi, color: colors.stone },
  rowMeta: { marginTop: 6, fontFamily: fonts.body, fontSize: 14, color: colors.stone },
  formCard: { marginTop: spacing.lg, gap: spacing.sm },
  formTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 22,
    color: colors.brownDark,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.brown,
    marginTop: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  durChipOn: { borderColor: colors.coralBright, backgroundColor: colors.badgePink },
  durText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.brown },
  durTextOn: { fontFamily: fonts.bodySemi, color: colors.coralBright },
  photoSlot: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    gap: spacing.xs,
  },
  photoHint: { fontFamily: fonts.body, fontSize: 13, color: colors.stone },
});
