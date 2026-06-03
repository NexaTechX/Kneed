import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { supabase } from '@/lib/supabase';

type CreatorHit = { id: string; full_name: string | null; avatar_url: string | null; headline: string | null };
type PostHit = { id: string; title: string | null; creator_id: string };
type Row =
  | { kind: 'creatorHeader' }
  | { kind: 'postHeader' }
  | { kind: 'creator'; data: CreatorHit }
  | { kind: 'post'; data: PostHit };

async function runSearch(q: string): Promise<{ creators: CreatorHit[]; posts: PostHit[] }> {
  const term = `%${q}%`;
  const [creatorsRes, postsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, headline')
      .or(`full_name.ilike.${term},headline.ilike.${term}`)
      .limit(20),
    supabase
      .from('creator_posts')
      .select('id, title, creator_id')
      .eq('status', 'published')
      .ilike('title', term)
      .limit(20),
  ]);
  if (creatorsRes.error) throw creatorsRes.error;
  if (postsRes.error) throw postsRes.error;
  return { creators: (creatorsRes.data ?? []) as CreatorHit[], posts: (postsRes.data ?? []) as PostHit[] };
}

export default function SearchScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const router = useRouter();
  const [text, setText] = useState('');
  const q = text.trim();

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    enabled: q.length >= 2,
    queryFn: () => runSearch(q),
  });

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const out: Row[] = [];
    if (data.creators.length) {
      out.push({ kind: 'creatorHeader' });
      for (const c of data.creators) out.push({ kind: 'creator', data: c });
    }
    if (data.posts.length) {
      out.push({ kind: 'postHeader' });
      for (const p of data.posts) out.push({ kind: 'post', data: p });
    }
    return out;
  }, [data]);

  const showEmpty = q.length >= 2 && !isFetching && rows.length === 0;

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Search" subtitle="Discover" />
      <View style={styles.searchWrap}>
        <Input
          value={text}
          onChangeText={setText}
          placeholder="Search creators and posts"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item, i) => (item.kind === 'creator' || item.kind === 'post' ? item.data.id : item.kind) + i}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          isFetching ? (
            <View style={styles.loading}>
              <ActivityIndicator color={t.textTertiary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          showEmpty ? (
            <Text style={[styles.hint, { color: t.textSecondary }]}>No results for “{q}”.</Text>
          ) : q.length < 2 ? (
            <Text style={[styles.hint, { color: t.textSecondary }]}>Type at least 2 characters to search.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.kind === 'creatorHeader') return <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Creators</Text>;
          if (item.kind === 'postHeader') return <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Posts</Text>;
          if (item.kind === 'creator') {
            const name = item.data.full_name?.trim() || 'Creator';
            return (
              <Pressable
                style={[styles.row, { borderBottomColor: t.border }]}
                onPress={() => router.push(`/(client)/creator/${item.data.id}` as never)}>
                <Avatar name={name} uri={item.data.avatar_url} size={40} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: t.text }]} numberOfLines={1}>{name}</Text>
                  {item.data.headline ? (
                    <Text style={[styles.rowSub, { color: t.textTertiary }]} numberOfLines={1}>{item.data.headline}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.textTertiary} />
              </Pressable>
            );
          }
          return (
            <Pressable
              style={[styles.row, { borderBottomColor: t.border }]}
              onPress={() => router.push({ pathname: '/(client)/post-comments', params: { id: item.data.id } })}>
              <View style={[styles.postIcon, { backgroundColor: t.surfaceMuted }]}>
                <Ionicons name="document-text-outline" size={18} color={t.textSecondary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: t.text }]} numberOfLines={1}>{item.data.title || 'Untitled post'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textTertiary} />
            </Pressable>
          );
        }}
      />
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    searchWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    list: { paddingBottom: spacing.xxl },
    loading: { paddingVertical: spacing.lg },
    hint: { textAlign: 'center', fontSize: 15, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, fontWeight: '600' },
    rowSub: { fontSize: 13, marginTop: 1 },
    postIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  });
}
