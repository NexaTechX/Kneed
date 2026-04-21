import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/lib/supabaseErrors';

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profile: { full_name: string | null; avatar_url: string | null } | null;
};

export default function PostCommentsScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const postId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  const { user } = useAuth();
  const qc = useQueryClient();
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(t), [t]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['post-comments', postId],
    enabled: Boolean(postId),
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('id, body, created_at, user_id')
        .eq('post_id', postId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const list = comments ?? [];
      const ids = [...new Set(list.map((r) => r.user_id))];
      let profMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (ids.length) {
        const { data: profs, error: pe } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
        if (!pe) {
          for (const p of profs ?? []) {
            profMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
          }
        }
      }
      return list.map((r) => ({
        ...r,
        profile: profMap[r.user_id] ?? null,
      })) as CommentRow[];
    },
  });

  const submit = async () => {
    if (!user || !postId) return;
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        body: text,
      });
      if (error) throw error;
      setBody('');
      await refetch();
      await qc.invalidateQueries({ queryKey: ['feed-posts'] });
    } catch (e: unknown) {
      Alert.alert('Could not comment', formatSupabaseError(e));
    } finally {
      setSending(false);
    }
  };

  if (!postId) {
    return (
      <SafeView style={{ backgroundColor: t.background }}>
        <AppHeader title="Comments" subtitle="Back" />
        <Text style={[styles.emptyText, { color: t.textSecondary }]}>Missing post.</Text>
      </SafeView>
    );
  }

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Comments" subtitle="Thread" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={t.text} />
          </View>
        ) : (
          <FlatList
            style={styles.flex}
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, rows.length === 0 && styles.listEmpty]}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: t.textSecondary }]}>No comments yet. Say something nice.</Text>
            }
            renderItem={({ item }) => {
              const name = item.profile?.full_name?.trim() || 'Member';
              return (
                <View style={[styles.commentRow, { borderBottomColor: t.border }]}>
                  <Avatar name={name} uri={item.profile?.avatar_url} size={36} />
                  <View style={styles.commentBody}>
                    <Text style={[styles.commentName, { color: t.text }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[styles.commentTime, { color: t.textTertiary }]}>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </Text>
                    <Text style={[styles.commentText, { color: t.textSecondary }]}>{item.body}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
        <View
          style={[
            styles.composer,
            {
              borderTopColor: t.border,
              backgroundColor: t.surfaceElevated,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}>
          <Input
            placeholder="Write a comment…"
            value={body}
            onChangeText={setBody}
            multiline
            style={styles.composerInput}
          />
          <Button title="Send" loading={sending} onPress={() => void submit()} disabled={!body.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingBottom: spacing.md, flexGrow: 1 },
    listEmpty: { justifyContent: 'center', minHeight: 200 },
    emptyText: { textAlign: 'center', paddingHorizontal: spacing.xl, fontSize: 15 },
    commentRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    commentBody: { flex: 1, minWidth: 0 },
    commentName: { fontSize: 14, fontWeight: '700' },
    commentTime: { fontSize: 12, marginTop: 2 },
    commentText: { fontSize: 15, lineHeight: 22, marginTop: spacing.xs },
    composer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    composerInput: { minHeight: 44, maxHeight: 120, textAlignVertical: 'top' },
  });
}
