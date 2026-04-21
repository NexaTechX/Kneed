import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { openPaystackCheckoutForPpv } from '@/lib/paystack';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/lib/supabaseErrors';
import { toNaira } from '@/lib/social';

type FeedPost = {
  id: string;
  creator_id: string;
  title: string | null;
  body: string | null;
  is_paid: boolean;
  price_cents: number;
  visibility: 'public' | 'private';
  monetization_status: string;
  media_type: 'none' | 'image' | 'video' | null;
  media_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  status: string;
};

type CreatorPreview = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
};

type PostEngagement = {
  reactionCount: number;
  commentCount: number;
  userReaction: string | null;
};

export default function FeedScreen() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [refreshing, setRefreshing] = useState(false);

  const { data: accessPostIds = [] } = useQuery({
    queryKey: ['post-access-grants', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('post_access_grants').select('post_id').eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.post_id as string);
    },
  });

  const grantSet = useMemo(() => new Set(accessPostIds), [accessPostIds]);

  const { data: followingIds = [] } = useQuery({
    queryKey: ['social-following', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('social_follows').select('followed_id').eq('follower_id', user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.followed_id as string);
    },
  });

  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);

  const { data: bundle, refetch, isLoading } = useQuery({
    queryKey: ['feed-posts', user?.id],
    enabled: Boolean(user) && !authLoading && isSupabaseConfigured,
    queryFn: async () => {
      // Use the same user the hook already validated — getSession() can briefly return null after cold start
      // while the auth store already has the user, which made the feed look empty until a manual refresh.
      if (!user?.id) {
        return { posts: [] as FeedPost[], profiles: {} as Record<string, CreatorPreview>, engagement: {} };
      }
      const viewerId = user.id;

      const { data, error } = await supabase
        .from('creator_posts')
        .select(
          'id, creator_id, title, body, is_paid, price_cents, visibility, monetization_status, media_type, media_url, thumbnail_url, created_at, status',
        )
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const raw = (data ?? []) as FeedPost[];
      const posts = raw.filter((p) => p.visibility === 'public' || p.creator_id === viewerId);

      const ids = [...new Set(posts.map((p) => p.creator_id))];
      let profiles: Record<string, CreatorPreview> = {};
      if (ids.length) {
        const { data: profs, error: pe } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, headline')
          .in('id', ids);
        if (!pe) {
          for (const p of profs ?? []) {
            profiles[p.id] = p as CreatorPreview;
          }
        }
      }

      const postIds = posts.map((p) => p.id);
      const engagement: Record<string, PostEngagement> = {};
      for (const pid of postIds) {
        engagement[pid] = { reactionCount: 0, commentCount: 0, userReaction: null };
      }
      if (postIds.length) {
        const [reactionsRes, myReactionsRes, commentsRes] = await Promise.all([
          supabase.from('post_reactions').select('post_id').in('post_id', postIds),
          supabase.from('post_reactions').select('post_id, reaction').in('post_id', postIds).eq('user_id', viewerId),
          supabase.from('post_comments').select('post_id').in('post_id', postIds),
        ]);
        if (reactionsRes.error) throw reactionsRes.error;
        if (myReactionsRes.error) throw myReactionsRes.error;
        if (commentsRes.error) throw commentsRes.error;

        for (const r of reactionsRes.data ?? []) {
          const e = engagement[r.post_id];
          if (e) e.reactionCount += 1;
        }
        for (const r of myReactionsRes.data ?? []) {
          const e = engagement[r.post_id];
          if (e) e.userReaction = r.reaction;
        }
        for (const c of commentsRes.data ?? []) {
          const e = engagement[c.post_id];
          if (e) e.commentCount += 1;
        }
      }

      return { posts, profiles, engagement };
    },
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const posts = bundle?.posts ?? [];
  const profiles = bundle?.profiles ?? {};
  const engagement = bundle?.engagement ?? {};

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        qc.invalidateQueries({ queryKey: ['post-access-grants', user?.id] }),
        qc.invalidateQueries({ queryKey: ['social-following', user?.id] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [qc, refetch, user?.id]);

  const canViewMedia = useCallback(
    (post: FeedPost) => {
      if (!post.media_url || post.media_type === 'none' || !post.media_type) return false;
      if (!post.is_paid) return true;
      if (user && post.creator_id === user.id) return true;
      if (user && grantSet.has(post.id)) return true;
      return false;
    },
    [grantSet, user],
  );

  const toggleFollow = useCallback(
    async (creatorId: string) => {
      if (!user) return;
      const { data: existing } = await supabase
        .from('social_follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('followed_id', creatorId)
        .maybeSingle();

      if (existing) {
        await supabase.from('social_follows').delete().eq('follower_id', user.id).eq('followed_id', creatorId);
      } else {
        await supabase.from('social_follows').insert({ follower_id: user.id, followed_id: creatorId });
      }
      await qc.invalidateQueries({ queryKey: ['social-following', user.id] });
      await refetch();
    },
    [qc, refetch, user],
  );

  const unlockPost = useCallback(
    async (post: FeedPost) => {
      if (!user || !post.is_paid) return;
      const res = await openPaystackCheckoutForPpv(post.id);
      if (res.ok) {
        Alert.alert('Payment', 'If payment succeeded, your unlock will appear in a few seconds.');
        await qc.invalidateQueries({ queryKey: ['post-access-grants'] });
        await refetch();
      } else {
        Alert.alert('Checkout', res.message);
      }
    },
    [qc, refetch, user],
  );

  const toggleReaction = useCallback(
    async (postId: string) => {
      if (!user) return;
      const mine = engagement[postId]?.userReaction;
      try {
        if (mine) {
          const { error } = await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('post_reactions')
            .insert({ post_id: postId, user_id: user.id, reaction: 'like' });
          if (error) throw error;
        }
        await qc.invalidateQueries({ queryKey: ['feed-posts'] });
      } catch (e: unknown) {
        Alert.alert('Could not update', formatSupabaseError(e));
      }
    },
    [engagement, qc, user],
  );

  const openComments = useCallback(
    (postId: string) => {
      router.push({ pathname: '/(client)/post-comments', params: { id: postId } });
    },
    [router],
  );

  const sharePost = useCallback(async (post: FeedPost) => {
    const snippet = [post.title, post.body].filter(Boolean).join('\n\n') || 'Check out this post on Kneed.';
    const message = snippet.length > 280 ? `${snippet.slice(0, 277)}…` : snippet;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(message);
          Alert.alert('Copied', 'Post text copied to clipboard.');
        } else {
          Alert.alert('Share', message);
        }
        return;
      }
      await Share.share({ message, title: 'Kneed' });
    } catch {
      /* user dismissed share sheet */
    }
  }, []);

  const manageOwnPost = useCallback(
    (post: FeedPost) => {
      Alert.alert('Your post', undefined, [
        {
          text: 'Edit',
          onPress: () => router.push({ pathname: '/(client)/edit-post', params: { id: post.id } }),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Delete this post?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  if (!user) return;
                  const { error } = await supabase.from('creator_posts').delete().eq('id', post.id).eq('creator_id', user.id);
                  if (error) {
                    Alert.alert('Could not delete', formatSupabaseError(error));
                    return;
                  }
                  await qc.invalidateQueries({ queryKey: ['feed-posts'] });
                  await qc.invalidateQueries({ queryKey: ['my-posts'] });
                  await qc.invalidateQueries({ queryKey: ['edit-post'] });
                  await refetch();
                },
              },
            ]);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [qc, refetch, router, user],
  );

  const headerRight = (
    <View style={styles.headerIcons}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={12}
        onPress={() => Alert.alert('Notifications', 'Activity alerts will appear here soon.')}>
        <Ionicons name="notifications-outline" size={24} color={t.text} />
      </Pressable>
    </View>
  );

  const renderItem = useCallback(
    ({ item: post }: { item: FeedPost }) => {
      const creator = profiles[post.creator_id];
      const displayName = creator?.full_name?.trim() || 'Creator';
      const handle = `@${displayName.replace(/\s+/g, '').toLowerCase().slice(0, 18)}`;
      const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
      const isSelf = user?.id === post.creator_id;
      const isFollowing = followingSet.has(post.creator_id);

      return (
        <View style={[styles.postWrap, { borderBottomColor: t.border }]}>
          <View style={styles.postTop}>
            <Avatar name={displayName} uri={creator?.avatar_url} size={44} />
            <View style={styles.postMeta}>
              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: t.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                {isSelf ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Post options"
                    hitSlop={12}
                    onPress={() => manageOwnPost(post)}
                    style={styles.postMenuBtn}>
                    <Ionicons name="ellipsis-horizontal" size={22} color={t.textTertiary} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => void toggleFollow(post.creator_id)}
                    style={[styles.followMini, { borderColor: isFollowing ? t.borderStrong : t.text }]}>
                    <Text style={[styles.followMiniText, { color: t.text }]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </Pressable>
                )}
              </View>
              <Text style={[styles.handleTime, { color: t.textTertiary }]} numberOfLines={1}>
                {handle} · {timeAgo}
              </Text>
            </View>
          </View>

          {post.title ? (
            <Text style={[styles.postTitle, { color: t.text }]}>{post.title}</Text>
          ) : null}
          {post.body ? (
            <Text style={[styles.postBody, { color: t.textSecondary }]}>{post.body}</Text>
          ) : null}

          {post.media_url && post.media_type && post.media_type !== 'none' ? (
            canViewMedia(post) ? (
              post.media_type === 'image' ? (
                <Image source={{ uri: post.media_url }} style={styles.media} resizeMode="cover" />
              ) : (
                <Pressable
                  onPress={() => {
                    if (post.media_url) void Linking.openURL(post.media_url);
                  }}
                  style={styles.videoWrap}>
                  {post.thumbnail_url ? (
                    <Image source={{ uri: post.thumbnail_url }} style={styles.media} resizeMode="cover" />
                  ) : (
                    <View style={[styles.media, styles.videoFallback, { backgroundColor: t.backgroundSecondary }]}>
                      <Ionicons name="play-circle" size={48} color={t.textTertiary} />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.65)']}
                    style={styles.mediaGradient}
                    pointerEvents="none"
                  />
                  <View style={styles.playBadge}>
                    <Ionicons name="play" size={14} color="#fff" />
                    <Text style={styles.playText}>Play</Text>
                  </View>
                </Pressable>
              )
            ) : (
              <Pressable onPress={() => void unlockPost(post)} style={styles.locked}>
                {post.thumbnail_url ? (
                  <Image source={{ uri: post.thumbnail_url }} style={styles.mediaDim} resizeMode="cover" />
                ) : (
                  <View style={[styles.mediaDim, { backgroundColor: t.backgroundSecondary }]} />
                )}
                <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFill} />
                <View style={styles.lockContent}>
                  <Ionicons name="lock-closed" size={22} color="#fff" />
                  <Text style={styles.lockTitle}>Subscriber content</Text>
                  <Text style={styles.lockSub}>Unlock to view full media</Text>
                  {post.is_paid && post.monetization_status === 'approved' ? (
                    <View style={[styles.pricePill, { backgroundColor: t.surfaceElevated }]}>
                      <Text style={[styles.pricePillText, { color: t.text }]}>{toNaira(post.price_cents)}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            )
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={engagement[post.id]?.userReaction ? 'Unlike' : 'Like'}
              onPress={() => void toggleReaction(post.id)}
              style={styles.actionHit}>
              <Ionicons
                name={engagement[post.id]?.userReaction ? 'heart' : 'heart-outline'}
                size={24}
                color={engagement[post.id]?.userReaction ? t.accent : t.text}
              />
              {(engagement[post.id]?.reactionCount ?? 0) > 0 ? (
                <Text style={[styles.actionCount, { color: t.textSecondary }]}>{engagement[post.id]?.reactionCount}</Text>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Comments"
              onPress={() => openComments(post.id)}
              style={styles.actionHit}>
              <Ionicons name="chatbubble-outline" size={22} color={t.text} />
              {(engagement[post.id]?.commentCount ?? 0) > 0 ? (
                <Text style={[styles.actionCount, { color: t.textSecondary }]}>{engagement[post.id]?.commentCount}</Text>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share"
              onPress={() => void sharePost(post)}
              style={styles.actionHit}>
              <Ionicons name="share-outline" size={22} color={t.text} />
            </Pressable>
          </View>

          <View style={styles.footer}>
            <View style={[styles.pillRow, { backgroundColor: t.surfaceMuted }]}>
              <Text style={[styles.pillText, { color: t.textTertiary }]}>
                {post.visibility === 'private' ? 'Private' : 'Public'}
              </Text>
              <Text style={[styles.pillDot, { color: t.borderStrong }]}>·</Text>
              <Text style={[styles.pillText, { color: t.textTertiary }]}>
                {post.is_paid ? `Paid · ${post.monetization_status}` : 'Free'}
              </Text>
            </View>
            {post.is_paid && post.monetization_status === 'approved' && !canViewMedia(post) ? (
              <Button title={`Unlock · ${toNaira(post.price_cents)}`} onPress={() => void unlockPost(post)} />
            ) : null}
          </View>
        </View>
      );
    },
    [
      canViewMedia,
      engagement,
      followingSet,
      manageOwnPost,
      openComments,
      profiles,
      sharePost,
      t,
      toggleFollow,
      toggleReaction,
      unlockPost,
      user?.id,
    ],
  );

  const listHeader = (
    <View>
      <AppHeader title="Home" subtitle="Feed" right={headerRight} />
      <Pressable
        onPress={() => router.push('/(client)/create-post')}
        style={[styles.composer, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}>
        <Avatar name={profile?.full_name ?? user?.email ?? 'You'} uri={profile?.avatar_url} size={40} />
        <Text style={[styles.composerPlaceholder, { color: t.textTertiary }]}>Start a post…</Text>
        <View style={[styles.composerIcon, { backgroundColor: t.primaryMuted }]}>
          <Ionicons name="images-outline" size={18} color={t.text} />
        </View>
      </Pressable>
      {isLoading && posts.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={t.text} />
        </View>
      ) : null}
    </View>
  );

  const empty = !isLoading && posts.length === 0;

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, empty && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.text} />}
        ListEmptyComponent={
          empty ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: t.text }]}>Your feed is quiet</Text>
              <Text style={[styles.emptyBody, { color: t.textSecondary }]}>
                New posts from people you follow show up here. Post a photo or thought — or just browse, like anywhere else.
              </Text>
              <Button title="Create a post" onPress={() => router.push('/(client)/create-post')} />
            </View>
          ) : null
        }
      />
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    listContent: { paddingBottom: spacing.xxl + 24, flexGrow: 1 },
    listEmpty: { flexGrow: 1 },
    headerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    composer: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      shadowColor: t.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    },
    composerPlaceholder: { flex: 1, fontSize: 16, fontWeight: '500' },
    composerIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loader: { paddingVertical: spacing.lg, alignItems: 'center' },
    postWrap: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
    },
    postTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    postMeta: { flex: 1, minWidth: 0 },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    displayName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, flex: 1 },
    followMini: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    followMiniText: { fontSize: 12, fontWeight: '700' },
    postMenuBtn: { padding: 4, marginLeft: spacing.xs },
    handleTime: { fontSize: 13, marginTop: 2 },
    postTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, marginTop: spacing.xs },
    postBody: { fontSize: 15, lineHeight: 22 },
    media: {
      width: '100%',
      aspectRatio: 4 / 5,
      maxHeight: 420,
      borderRadius: 14,
      backgroundColor: t.backgroundSecondary,
    },
    videoWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
    videoFallback: { alignItems: 'center', justifyContent: 'center' },
    mediaGradient: {
      ...StyleSheet.absoluteFillObject,
      height: '40%',
      top: undefined,
      bottom: 0,
    },
    playBadge: {
      position: 'absolute',
      bottom: spacing.md,
      left: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    playText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    locked: { position: 'relative', borderRadius: 14, overflow: 'hidden', minHeight: 220 },
    mediaDim: { width: '100%', height: 280 },
    lockContent: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: 6,
    },
    lockTitle: { color: '#fff', fontWeight: '700', fontSize: 17 },
    lockSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center' },
    pricePill: {
      marginTop: spacing.sm,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    pricePillText: { fontWeight: '700', fontSize: 14 },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
    },
    actionHit: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionCount: { fontSize: 13, fontWeight: '600', minWidth: 16 },
    footer: { gap: spacing.sm, marginTop: spacing.xs },
    pillRow: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    pillText: { fontSize: 12, fontWeight: '600' },
    pillDot: { fontSize: 12, fontWeight: '700' },
    empty: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      gap: spacing.md,
      alignItems: 'center',
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
    emptyBody: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  });
}
