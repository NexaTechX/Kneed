import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenTitle } from '@/components/layout/ScreenTitle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { formatCents } from '@/lib/utils';
import { useAppTheme } from '@/hooks/useAppTheme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { DurationMin, LocationType, ServiceType } from '@/types/database';

const TYPES: ServiceType[] = ['swedish', 'deep_tissue', 'sports', 'thai', 'prenatal'];
const DURATIONS: DurationMin[] = [30, 60, 90, 120];
const LOCS: LocationType[] = ['studio', 'mobile', 'both'];

export default function ProviderServicesScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState({
    type: 'swedish' as ServiceType,
    duration_min: 60 as DurationMin,
    price: '8000',
    location_type: 'both' as LocationType,
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
      const price_cents = parseInt(form.price, 10);
      if (Number.isNaN(price_cents)) throw new Error('Invalid price (cents)');
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
      <ScreenTitle kicker="Menu" title="Services" />
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {(data ?? []).map((s) => (
          <Card key={s.id}>
            <Pressable
              onPress={() => {
                setEditing(s.id);
                setForm({
                  type: s.type,
                  duration_min: s.duration_min,
                  price: String(s.price_cents),
                  location_type: s.location_type,
                });
              }}>
              <Text style={styles.rowTitle}>{s.type.replace('_', ' ')}</Text>
              <Text style={styles.rowMeta}>
                {s.duration_min} min · {formatCents(s.price_cents)} · {s.location_type}
              </Text>
            </Pressable>
            <Button title={s.is_active ? 'Deactivate' : 'Activate'} variant="outline" onPress={() => void toggleActive(s.id, s.is_active)} />
          </Card>
        ))}

        <Button
          title="Add service"
          onPress={() => {
            setEditing('new');
            setForm({ type: 'swedish', duration_min: 60, price: '8000', location_type: 'both' });
          }}
        />

        {editing ? (
          <Card>
            <Text style={styles.label}>Type</Text>
            <View style={styles.row}>
              {TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setForm((f) => ({ ...f, type }))}
                  style={[
                    styles.chip,
                    {
                      borderColor: form.type === type ? t.primary : t.borderStrong,
                      backgroundColor: form.type === type ? t.primaryMuted : t.surfaceElevated,
                    },
                  ]}>
                  <Text style={[styles.chipLabel, { color: form.type === type ? t.primary : t.text }]}>{type}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.row}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setForm((f) => ({ ...f, duration_min: d }))}
                  style={[
                    styles.chip,
                    {
                      borderColor: form.duration_min === d ? t.primary : t.borderStrong,
                      backgroundColor: form.duration_min === d ? t.primaryMuted : t.surfaceElevated,
                    },
                  ]}>
                  <Text style={[styles.chipLabel, { color: form.duration_min === d ? t.primary : t.text }]}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Price (cents)</Text>
            <Input value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v }))} keyboardType="number-pad" />
            <Text style={styles.label}>Location</Text>
            <View style={styles.row}>
              {LOCS.map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setForm((f) => ({ ...f, location_type: l }))}
                  style={[
                    styles.chip,
                    {
                      borderColor: form.location_type === l ? t.primary : t.borderStrong,
                      backgroundColor: form.location_type === l ? t.primaryMuted : t.surfaceElevated,
                    },
                  ]}>
                  <Text style={[styles.chipLabel, { color: form.location_type === l ? t.primary : t.text }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <Button title="Save" onPress={save} />
            <Button title="Cancel" variant="outline" onPress={() => setEditing(null)} />
          </Card>
        ) : null}
      </View>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    rowTitle: { fontSize: 17, fontWeight: '800', color: t.text, textTransform: 'capitalize', letterSpacing: -0.2 },
    rowMeta: { marginTop: 4, color: t.textSecondary, fontSize: 14 },
    label: {
      marginTop: spacing.sm,
      fontWeight: '700',
      color: t.textTertiary,
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    chipLabel: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  });
}
