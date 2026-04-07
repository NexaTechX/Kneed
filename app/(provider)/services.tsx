import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { formatCents } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { DurationMin, LocationType, ServiceType } from '@/types/database';

const TYPES: ServiceType[] = ['swedish', 'deep_tissue', 'sports', 'thai', 'prenatal'];
const DURATIONS: DurationMin[] = [30, 60, 90, 120];
const LOCS: LocationType[] = ['studio', 'mobile', 'both'];

export default function ProviderServicesScreen() {
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
      <Text style={styles.title}>Services</Text>
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
              {TYPES.map((t) => (
                <Pressable key={t} onPress={() => setForm((f) => ({ ...f, type: t }))} style={styles.chip}>
                  <Text>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.row}>
              {DURATIONS.map((d) => (
                <Pressable key={d} onPress={() => setForm((f) => ({ ...f, duration_min: d }))} style={styles.chip}>
                  <Text>{d}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Price (cents)</Text>
            <Input value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v }))} keyboardType="number-pad" />
            <Text style={styles.label}>Location</Text>
            <View style={styles.row}>
              {LOCS.map((l) => (
                <Pressable key={l} onPress={() => setForm((f) => ({ ...f, location_type: l }))} style={styles.chip}>
                  <Text>{l}</Text>
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

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.charcoal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.charcoal, textTransform: 'capitalize' },
  rowMeta: { marginTop: 4, color: colors.stone },
  label: { marginTop: spacing.sm, fontWeight: '600', color: colors.charcoal },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dustyrose,
  },
});
