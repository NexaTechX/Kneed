import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { fetchNotifications, markAllNotificationsRead } from '@/lib/notifications';
import { queryKeys } from '@/lib/queries';
import type { AppNotification, NotificationType } from '@/types/database';

const ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  like: 'heart',
  comment: 'chatbubble',
  follow: 'person-add',
  purchase: 'cash',
  booking: 'lock-closed',
  kyc: 'shield-checkmark',
  moderation: 'alert-circle',
  system: 'notifications',
  message: 'chatbubbles',
};

export default function NotificationsScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.notifications(user?.id),
    enabled: Boolean(user),
    queryFn: () => fetchNotifications(user!.id),
  });

  // Mark all read on open, then refresh the unread badge.
  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        await markAllNotificationsRead(user.id);
        await qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(user.id) });
      } catch {
        /* best effort */
      }
    })();
  }, [user, qc]);

  const onPressItem = (n: AppNotification) => {
    const conversationId =
      typeof n.data?.conversation_id === 'string' ? n.data.conversation_id : undefined;
    if (n.type === 'message' && conversationId) {
      router.push(`/(client)/chat/${conversationId}` as never);
    } else if (n.post_id) {
      router.push({ pathname: '/(client)/post-comments', params: { id: n.post_id } });
    } else if (n.session_id) {
      router.push('/(client)/(tabs)/private-room');
    } else if (n.actor_id) {
      router.push(`/(client)/creator/${n.actor_id}` as never);
    }
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Notifications" subtitle="Activity" />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={t.text} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>No activity yet.</Text>
          }
          renderItem={({ item }) => {
            const unread = !item.read_at;
            return (
              <Pressable
                onPress={() => onPressItem(item)}
                style={[styles.row, { borderBottomColor: t.border, backgroundColor: unread ? t.surfaceMuted : 'transparent' }]}>
                <View style={[styles.iconCircle, { backgroundColor: `${t.accent}14` }]}>
                  <Ionicons name={ICON[item.type] ?? 'notifications'} size={18} color={t.accent} />
                </View>
                <View style={styles.body}>
                  <Text style={[styles.title, { color: t.text }]}>{item.title}</Text>
                  {item.body ? <Text style={[styles.sub, { color: t.textSecondary }]}>{item.body}</Text> : null}
                  <Text style={[styles.time, { color: t.textTertiary }]}>
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </Text>
                </View>
                {unread ? <View style={[styles.dot, { backgroundColor: t.accent }]} /> : null}
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
    emptyText: { textAlign: 'center', fontSize: 15, paddingHorizontal: spacing.xl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0 },
    title: { fontSize: 15, fontWeight: '700' },
    sub: { fontSize: 14, lineHeight: 19, marginTop: 1 },
    time: { fontSize: 12, marginTop: 2 },
    dot: { width: 8, height: 8, borderRadius: 4 },
  });
}
