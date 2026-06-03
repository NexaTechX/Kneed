import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header } from '@/components/layout/Header';
import { SafeView } from '@/components/layout/SafeView';
import { BookingSheet } from '@/components/BookingSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { fetchCreatorProfile } from '@/lib/privateRoom';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/lib/supabaseErrors';
import { toNaira } from '@/lib/social';

export default function CreatorProfileScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const creatorId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [showBooking, setShowBooking] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const { data: creator, isLoading } = useQuery({
    queryKey: ['creator-profile', creatorId],
    enabled: Boolean(creatorId),
    queryFn: () => fetchCreatorProfile(creatorId!),
  });

  const { data: stats } = useQuery({
    queryKey: ['creator-stats', creatorId, user?.id],
    enabled: Boolean(creatorId),
    queryFn: async () => {
      const [followers, isFollowing] = await Promise.all([
        supabase.from('social_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', creatorId!),
        user
          ? supabase
              .from('social_follows')
              .select('follower_id')
              .eq('follower_id', user.id)
              .eq('followed_id', creatorId!)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return { followers: followers.count ?? 0, following: Boolean((isFollowing as { data: unknown }).data) };
    },
  });

  const toggleFollow = async () => {
    if (!user || !creatorId || user.id === creatorId) return;
    try {
      if (stats?.following) {
        const { error } = await supabase.from('social_follows').delete().eq('follower_id', user.id).eq('followed_id', creatorId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('social_follows').insert({ follower_id: user.id, followed_id: creatorId });
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ['creator-stats', creatorId] });
      await qc.invalidateQueries({ queryKey: ['social-following', user.id] });
    } catch (e: unknown) {
      Alert.alert('Could not update follow', formatSupabaseError(e));
    }
  };

  if (isLoading) {
    return (
      <SafeView style={{ backgroundColor: t.background }}>
        <Header title="Profile" showBack />
        <View style={styles.centered}>
          <ActivityIndicator color={t.text} />
        </View>
      </SafeView>
    );
  }

  if (!creator) {
    return (
      <SafeView style={{ backgroundColor: t.background }}>
        <Header title="Profile" showBack />
        <View style={styles.centered}>
          <Text style={{ color: t.textSecondary }}>This profile is unavailable.</Text>
          <Button title="Go back" onPress={() => router.back()} />
        </View>
      </SafeView>
    );
  }

  const name = creator.full_name?.trim() || 'Creator';
  const isSelf = user?.id === creator.id;
  const canBook = creator.private_room_rate_cents > 0 && !isSelf;

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <Header title={name} showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Avatar name={name} uri={creator.avatar_url} size={84} />
          <Text style={[styles.name, { color: t.text }]}>{name}</Text>
          {creator.headline ? <Text style={[styles.headline, { color: t.textSecondary }]}>{creator.headline}</Text> : null}
          <Text style={[styles.followers, { color: t.textTertiary }]}>{stats?.followers ?? 0} followers</Text>
        </View>

        {!isSelf ? (
          <View style={styles.actions}>
            <Button
              title={stats?.following ? 'Following' : 'Follow'}
              variant={stats?.following ? 'outline' : 'coral'}
              onPress={() => void toggleFollow()}
              style={styles.flexBtn}
            />
            <Pressable
              onPress={() => setShowReport(true)}
              style={[styles.iconBtn, { borderColor: t.border }]}
              accessibilityRole="button"
              accessibilityLabel="Report creator">
              <Ionicons name="flag-outline" size={18} color={t.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {creator.creator_bio ? (
          <Card style={styles.card}>
            <Text style={[styles.bio, { color: t.textSecondary }]}>{creator.creator_bio}</Text>
          </Card>
        ) : null}

        {canBook ? (
          <Card style={styles.card}>
            <View style={styles.bookHead}>
              <Ionicons name="lock-closed" size={18} color={t.text} />
              <Text style={[styles.bookTitle, { color: t.text }]}>Private Room</Text>
            </View>
            <Text style={[styles.meta, { color: t.textSecondary }]}>
              Book a private session with {name}. {toNaira(creator.private_room_rate_cents)} per session.
            </Text>
            <Button title="Book Private Room" onPress={() => setShowBooking(true)} />
          </Card>
        ) : null}
      </ScrollView>

      <BookingSheet visible={showBooking} creator={creator} onClose={() => setShowBooking(false)} />
      <ReportSheet
        visible={showReport}
        targetType="profile"
        targetId={creator.id}
        onClose={() => setShowReport(false)}
      />
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
    hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
    name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: spacing.sm },
    headline: { fontSize: 15, textAlign: 'center' },
    followers: { fontSize: 13, marginTop: 2 },
    actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    flexBtn: { flex: 1 },
    iconBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    card: { gap: spacing.sm },
    bio: { fontSize: 15, lineHeight: 22 },
    bookHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    bookTitle: { fontSize: 17, fontWeight: '700' },
    meta: { fontSize: 13, lineHeight: 19 },
  });
}
