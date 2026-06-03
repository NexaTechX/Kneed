import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/lib/supabaseErrors';

export type ReportTargetType = 'post' | 'profile' | 'comment';

const REASONS = [
  'Underage or child sexual content',
  'Non-consensual content',
  'Violence or threats',
  'Spam or scam',
  'Impersonation',
  'Other',
] as const;

export function ReportSheet({
  visible,
  onClose,
  targetType,
  targetId,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string | null;
}) {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason(null);
    setDetails('');
    setSubmitting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!user || !targetId) return;
    if (!reason) {
      Alert.alert('Pick a reason', 'Select why you are reporting this.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('moderation_reports').insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;
      Alert.alert('Thanks for the report', 'Our team will review it shortly.');
      close();
    } catch (e: unknown) {
      Alert.alert('Could not report', formatSupabaseError(e));
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.sheet, { backgroundColor: t.surfaceElevated }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: t.text }]}>Report {targetType}</Text>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={t.textSecondary} />
            </Pressable>
          </View>

          {REASONS.map((r) => {
            const active = reason === r;
            return (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                style={[styles.reasonRow, { borderColor: active ? t.accent : t.border }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? t.accent : t.textTertiary}
                />
                <Text style={[styles.reasonText, { color: t.text }]}>{r}</Text>
              </Pressable>
            );
          })}

          <Input
            placeholder="Add details (optional)"
            value={details}
            onChangeText={setDetails}
            multiline
            style={styles.details}
          />

          <Button title="Submit report" loading={submitting} onPress={() => void submit()} />
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
      gap: spacing.sm,
      paddingBottom: spacing.xxl,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    title: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
    reasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    reasonText: { fontSize: 15, flex: 1 },
    details: { minHeight: 70, textAlignVertical: 'top', marginTop: spacing.xs },
  });
}
