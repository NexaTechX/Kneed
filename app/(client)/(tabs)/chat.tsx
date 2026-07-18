import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Avatar } from '@/components/ui/Avatar';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { fetchConversations } from '@/lib/chat';
import { queryKeys } from '@/lib/queries';

export default function ChatInboxScreen() {
  const { user } = useAuth();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const router = useRouter();

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.conversations(user?.id),
    enabled: Boolean(user),
    queryFn: () => fetchConversations(user!.id),
  });

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Chat" subtitle="Friends only" />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={t.text} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>
              Chat with friends — people you follow who also follow you back.
            </Text>
          }
          renderItem={({ item }) => {
            const name = item.peer.full_name?.trim() || 'Member';
            return (
              <Pressable
                onPress={() => router.push(`/(client)/chat/${item.id}` as never)}
                style={[styles.row, { borderBottomColor: t.border }]}>
                <Avatar name={name} uri={item.peer.avatar_url} size={48} />
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.name, { color: t.text }, item.unread && styles.nameUnread]} numberOfLines={1}>
                      {name}
                    </Text>
                    {item.last_message_at ? (
                      <Text style={[styles.time, { color: t.textTertiary }]}>
                        {formatDistanceToNow(new Date(item.last_message_at), { addSuffix: false })}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.preview, { color: item.unread ? t.text : t.textSecondary }]} numberOfLines={1}>
                    {item.last_message_preview?.trim() || 'Say hello'}
                  </Text>
                </View>
                {item.unread ? <View style={[styles.dot, { backgroundColor: t.accent }]} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingBottom: spacing.xxl, flexGrow: 1 },
    listEmpty: { justifyContent: 'center' },
    emptyText: { textAlign: 'center', fontSize: 15, paddingHorizontal: spacing.xl, lineHeight: 22 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    body: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
    name: { flex: 1, fontSize: 16, fontWeight: '600' },
    nameUnread: { fontWeight: '700' },
    time: { fontSize: 12, fontWeight: '500' },
    preview: { fontSize: 14, lineHeight: 18 },
    dot: { width: 8, height: 8, borderRadius: 4 },
  });
}
