import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { pickAndUploadPostMedia } from '@/lib/uploadPostMedia';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/lib/supabaseErrors';
import { toNaira } from '@/lib/social';
import type { CreatorPost } from '@/types/database';

export default function EditPostScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const postId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<{ media_url: string; media_type: 'image' | 'video'; thumbnail_url: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [price, setPrice] = useState('0');
  const [saving, setSaving] = useState(false);

  const kycOk = profile?.is_kyc_verified === true;

  const {
    data: loaded,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['edit-post', postId, user?.id],
    enabled: Boolean(postId && user?.id),
    queryFn: async () => {
      const { data, error: qe } = await supabase
        .from('creator_posts')
        .select('*')
        .eq('id', postId!)
        .eq('creator_id', user!.id)
        .maybeSingle();
      if (qe) throw qe;
      return data as CreatorPost | null;
    },
  });

  useEffect(() => {
    if (!loaded) return;
    setTitle(loaded.title ?? '');
    setBody(loaded.body ?? '');
    if (loaded.media_url && loaded.media_type && loaded.media_type !== 'none') {
      setMedia({
        media_url: loaded.media_url,
        media_type: loaded.media_type as 'image' | 'video',
        thumbnail_url: loaded.thumbnail_url,
      });
    } else {
      setMedia(null);
    }
    setIsPaid(loaded.is_paid);
    setIsPrivate(loaded.visibility === 'private');
    setPrice(loaded.is_paid && loaded.price_cents ? String(loaded.price_cents / 100) : '0');
  }, [loaded]);

  const lockedMonetization =
    loaded?.is_paid === true &&
    loaded.monetization_status === 'approved' &&
    loaded.status === 'published';

  const addMedia = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const result = await pickAndUploadPostMedia(user.id);
      if (result) setMedia(result);
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload media');
    } finally {
      setUploading(false);
    }
  };

  const savePost = async () => {
    if (!user || !loaded || !postId) return;
    const hasContent = Boolean(title.trim() || body.trim() || media);
    if (!hasContent) {
      Alert.alert('Add something', 'Write a caption or headline, or attach a photo or video.');
      return;
    }

    const cents = Math.round((parseFloat(price) || 0) * 100);

    if (!lockedMonetization) {
      if (isPaid) {
        if (!kycOk) {
          Alert.alert('KYC required', 'Complete KYC before using paid posts.');
          return;
        }
        if (cents <= 0) {
          Alert.alert('Price required', 'Set a valid price for paid posts.');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const base = {
        title: title.trim() || null,
        body: body.trim() || null,
        media_type: media ? media.media_type : ('none' as const),
        media_url: media?.media_url ?? null,
        thumbnail_url: media?.thumbnail_url ?? null,
        visibility: isPrivate ? 'private' : 'public',
        updated_at: new Date().toISOString(),
      };

      if (lockedMonetization) {
        const { error: err } = await supabase
          .from('creator_posts')
          .update(base)
          .eq('id', postId)
          .eq('creator_id', user.id);
        if (err) throw err;
        Alert.alert('Saved', 'Your post was updated.');
      } else if (isPaid) {
        const { error: err } = await supabase
          .from('creator_posts')
          .update({
            ...base,
            is_paid: true,
            price_cents: cents,
            monetization_status: 'pending_review',
            status: 'draft',
          })
          .eq('id', postId)
          .eq('creator_id', user.id);
        if (err) throw err;
        Alert.alert('Saved', 'Your paid post is saved as a draft pending review.');
      } else {
        const { error: err } = await supabase
          .from('creator_posts')
          .update({
            ...base,
            is_paid: false,
            price_cents: 0,
            monetization_status: 'none',
            status: 'published',
          })
          .eq('id', postId)
          .eq('creator_id', user.id);
        if (err) throw err;
        Alert.alert('Saved', 'Your post was updated.');
      }

      await queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      await queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      await queryClient.invalidateQueries({ queryKey: ['edit-post', postId] });
      router.replace('/(client)/(tabs)/feed');
    } catch (e: unknown) {
      Alert.alert('Could not save', formatSupabaseError(e));
    } finally {
      setSaving(false);
    }
  };

  if (!postId) {
    return (
      <SafeView style={{ backgroundColor: t.background }}>
        <AppHeader title="Edit post" subtitle="Back" />
        <View style={styles.centered}>
          <Text style={{ color: t.textSecondary }}>Missing post.</Text>
          <Button title="Go back" onPress={() => router.back()} />
        </View>
      </SafeView>
    );
  }

  if (isLoading) {
    return (
      <SafeView style={{ backgroundColor: t.background }}>
        <AppHeader title="Edit post" subtitle="Loading" />
        <View style={styles.centered}>
          <ActivityIndicator color={t.text} />
        </View>
      </SafeView>
    );
  }

  if (error || !loaded) {
    return (
      <SafeView style={{ backgroundColor: t.background }}>
        <AppHeader title="Edit post" subtitle="Error" />
        <View style={styles.centered}>
          <Text style={{ color: t.textSecondary }}>Could not load this post.</Text>
          <Button title="Try again" onPress={() => void refetch()} />
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeView>
    );
  }

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Edit post" subtitle="Save changes" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {lockedMonetization ? (
          <Card style={styles.notice}>
            <View style={styles.noticeRow}>
              <Ionicons name="lock-closed-outline" size={22} color={t.accent} />
              <Text style={[styles.noticeText, { color: t.textSecondary }]}>
                This paid post is live. You can change the caption, media, and visibility. Price and monetization stay as they are.
              </Text>
            </View>
          </Card>
        ) : null}

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Content</Text>
        <Card style={styles.formCard}>
          <Input placeholder="Headline (optional)" value={title} onChangeText={setTitle} />
          <Input placeholder="Write a caption…" value={body} onChangeText={setBody} multiline style={styles.bodyInput} />

          <View style={styles.mediaRow}>
            <Button title={media ? 'Replace media' : 'Add photo or video'} variant="outline" loading={uploading} onPress={() => void addMedia()} />
            {media ? <Button title="Remove" variant="ghost" onPress={() => setMedia(null)} /> : null}
          </View>
          {media?.media_type === 'image' ? (
            <Image source={{ uri: media.media_url }} style={styles.preview} resizeMode="cover" />
          ) : null}
          {media?.media_type === 'video' ? (
            <Pressable onPress={() => void Linking.openURL(media.media_url)} style={styles.videoPreviewWrap}>
              {media.thumbnail_url ? (
                <Image source={{ uri: media.thumbnail_url }} style={styles.preview} resizeMode="cover" />
              ) : (
                <View style={[styles.preview, styles.videoFallback, { backgroundColor: t.backgroundSecondary }]}>
                  <Ionicons name="videocam-outline" size={40} color={t.textTertiary} />
                </View>
              )}
              <Text style={[styles.tapPlay, { color: t.accent }]}>Open video</Text>
            </Pressable>
          ) : null}
        </Card>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Monetization & visibility</Text>
        <Card style={styles.formCard}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: t.text }]}>Paid post</Text>
              <Text style={[styles.rowSub, { color: t.textTertiary }]}>Submit for pricing review</Text>
            </View>
            <Switch
              value={isPaid}
              onValueChange={setIsPaid}
              disabled={lockedMonetization}
              trackColor={{ false: t.border, true: t.primaryMuted }}
              thumbColor={t.surfaceElevated}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: t.text }]}>Private visibility</Text>
              <Text style={[styles.rowSub, { color: t.textTertiary }]}>Limit who can discover this</Text>
            </View>
            <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: t.border, true: t.primaryMuted }} thumbColor={t.surfaceElevated} />
          </View>
          {isPaid && !lockedMonetization ? (
            <Input placeholder="Price (NGN)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          ) : null}
          {lockedMonetization ? (
            <Text style={[styles.meta, { color: t.textTertiary }]}>
              Price: {toNaira(loaded.price_cents)} · {loaded.monetization_status}
            </Text>
          ) : null}
        </Card>

        <Button title="Save changes" onPress={() => void savePost()} loading={saving || uploading} />
      </ScrollView>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    notice: { gap: spacing.md },
    noticeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    noticeText: { flex: 1, lineHeight: 22, fontSize: 14 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginLeft: 2,
    },
    formCard: { gap: spacing.sm },
    bodyInput: { minHeight: 100, textAlignVertical: 'top' },
    mediaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
    preview: { width: '100%', height: 220, borderRadius: 14, backgroundColor: t.backgroundSecondary },
    videoPreviewWrap: { width: '100%' },
    videoFallback: { alignItems: 'center', justifyContent: 'center' },
    tapPlay: {
      marginTop: spacing.sm,
      alignSelf: 'center',
      fontWeight: '600',
      fontSize: 14,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
    rowText: { flex: 1 },
    rowTitle: { fontSize: 16, fontWeight: '600' },
    rowSub: { fontSize: 13, marginTop: 2 },
    meta: { fontSize: 13, marginTop: 4 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  });
}
