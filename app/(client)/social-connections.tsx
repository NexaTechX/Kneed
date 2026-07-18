import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Avatar } from '@/components/ui/Avatar';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { getOrCreateDm } from '@/lib/chat';
import { formatSupabaseError } from '@/lib/supabaseErrors';
import { supabase } from '@/lib/supabase';

type SocialTab = 'followers' | 'following' | 'friends';

type SocialUser = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

const ALL_TABS: SocialTab[] = ['followers', 'following', 'friends'];

export default function SocialConnectionsScreen() {
  const { user } = useAuth();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab: SocialTab = tab === 'following' || tab === 'friends' ? tab : 'followers';
  const [activeTab, setActiveTab] = useState<SocialTab>(initialTab);
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null);

  const openChat = async (peerId: string) => {
    if (openingChatFor) return;
    setOpeningChatFor(peerId);
    try {
      const conversationId = await getOrCreateDm(peerId);
      router.push(`/(client)/chat/${conversationId}` as never);
    } catch (e: unknown) {
      Alert.alert('Could not open chat', formatSupabaseError(e));
    } finally {
      setOpeningChatFor(null);
    }
  };

  const { data: social, isLoading } = useQuery({
    queryKey: ['profile-social', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const userId = user!.id;
      const [followersRes, followingRes] = await Promise.all([
        supabase.from('social_follows').select('follower_id').eq('followed_id', userId),
        supabase.from('social_follows').select('followed_id').eq('follower_id', userId),
      ]);
      if (followersRes.error) throw followersRes.error;
      if (followingRes.error) throw followingRes.error;

      const followerIds = (followersRes.data ?? []).map((r) => r.follower_id as string);
      const followingIds = (followingRes.data ?? []).map((r) => r.followed_id as string);
      const followingSet = new Set(followingIds);
      const friendsIds = followerIds.filter((id) => followingSet.has(id));
      const uniqueIds = [...new Set([...followerIds, ...followingIds])];

      let profileMap: Record<string, SocialUser> = {};
      if (uniqueIds.length > 0) {
        const { data: profs, error } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', uniqueIds);
        if (error) throw error;
        for (const p of profs ?? []) {
          profileMap[p.id] = {
            id: p.id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
          };
        }
      }

      const mapUsers = (ids: string[]) =>
        ids
          .map((id) => profileMap[id])
          .filter(Boolean)
          .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));

      return {
        followers: mapUsers(followerIds),
        following: mapUsers(followingIds),
        friends: mapUsers(friendsIds),
      };
    },
  });

  const users =
    activeTab === 'followers'
      ? social?.followers ?? []
      : activeTab === 'following'
        ? social?.following ?? []
        : social?.friends ?? [];

  const title = activeTab === 'followers' ? 'Followers' : activeTab === 'following' ? 'Following' : 'Friends';

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title={title} subtitle="Connections" />
      <View style={[styles.tabs, { backgroundColor: t.surfaceMuted }]}>
        {ALL_TABS.map((tabKey) => {
          const active = tabKey === activeTab;
          const label = tabKey === 'followers' ? 'Followers' : tabKey === 'following' ? 'Following' : 'Friends';
          return (
            <Pressable
              key={tabKey}
              onPress={() => setActiveTab(tabKey)}
              style={[styles.tabBtn, { backgroundColor: active ? t.surfaceElevated : 'transparent', borderColor: active ? t.borderStrong : 'transparent' }]}>
              <Text style={[styles.tabText, { color: active ? t.text : t.textTertiary }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={t.text} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, users.length === 0 && styles.listEmpty]}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: t.border }]}>
              <Pressable
                onPress={() => router.push(`/(client)/creator/${item.id}` as never)}
                style={styles.rowMain}
                accessibilityRole="button">
                <Avatar name={item.full_name?.trim() || 'Member'} uri={item.avatar_url} size={44} />
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {item.full_name?.trim() || 'Member'}
                </Text>
              </Pressable>
              {activeTab === 'friends' ? (
                <Pressable
                  onPress={() => void openChat(item.id)}
                  disabled={openingChatFor === item.id}
                  style={[styles.chatBtn, { borderColor: t.borderStrong, backgroundColor: t.surfaceElevated }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${item.full_name?.trim() || 'friend'}`}>
                  {openingChatFor === item.id ? (
                    <ActivityIndicator size="small" color={t.text} />
                  ) : (
                    <Ionicons name="chatbubble-outline" size={18} color={t.text} />
                  )}
                </Pressable>
              ) : null}
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: t.textSecondary }]}>No users yet.</Text>}
        />
      )}
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    tabs: {
      flexDirection: 'row',
      gap: 6,
      borderRadius: 12,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      padding: 6,
    },
    tabBtn: {
      flex: 1,
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 8,
    },
    tabText: { fontSize: 13, fontWeight: '700' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    listEmpty: { flexGrow: 1, justifyContent: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
    name: { flex: 1, fontSize: 16, fontWeight: '600' },
    chatBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: { textAlign: 'center', fontSize: 15, paddingHorizontal: spacing.xl },
  });
}
