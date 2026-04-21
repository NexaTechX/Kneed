import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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

export default function CreatePostScreen() {
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

  const { data: posts, refetch } = useQuery({
    queryKey: ['my-posts', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_posts')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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

  const submitPost = async () => {
    if (!user) return;
    const hasContent = Boolean(title.trim() || body.trim() || media);
    if (!hasContent) {
      Alert.alert('Add something', 'Write a caption or headline, or attach a photo or video.');
      return;
    }
    const cents = Math.round((parseFloat(price) || 0) * 100);
    if (isPaid) {
      if (!kycOk) {
        Alert.alert('KYC required', 'Complete KYC before submitting paid posts for review.');
        return;
      }
      if (cents <= 0) {
        Alert.alert('Price required', 'Set a valid price for paid posts.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        creator_id: user.id,
        title: title.trim() || null,
        body: body.trim() || null,
        media_type: media ? media.media_type : ('none' as const),
        media_url: media?.media_url ?? null,
        thumbnail_url: media?.thumbnail_url ?? null,
        visibility: isPrivate ? 'private' : 'public',
      };

      if (isPaid) {
        const { data: inserted, error } = await supabase
          .from('creator_posts')
          .insert({
            ...payload,
            is_paid: true,
            price_cents: cents,
            monetization_status: 'pending_review',
            status: 'draft',
          })
          .select('id, status')
          .single();
        if (error) throw error;
        if (!inserted) throw new Error('Post was not saved.');
        Alert.alert('Submitted', 'Your paid post is pending admin review.');
      } else {
        const { data: inserted, error } = await supabase
          .from('creator_posts')
          .insert({
            ...payload,
            is_paid: false,
            price_cents: 0,
            monetization_status: 'none',
            status: 'published',
          })
          .select('id, status')
          .single();
        if (error) throw error;
        if (!inserted) throw new Error('Post was not saved.');
        Alert.alert('Published', 'Your post is live.');
      }
      setTitle('');
      setBody('');
      setMedia(null);
      setIsPaid(false);
      setIsPrivate(false);
      setPrice('0');
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      await queryClient.invalidateQueries({ queryKey: ['edit-post'] });
      router.replace('/(client)/(tabs)/feed');
    } catch (e: unknown) {
      const msg = formatSupabaseError(e);
      Alert.alert('Publish failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeletePost = (post: CreatorPost) => {
    Alert.alert('Delete this post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deletePost(post.id),
      },
    ]);
  };

  const deletePost = async (postId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('creator_posts').delete().eq('id', postId).eq('creator_id', user.id);
      if (error) throw error;
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      await queryClient.invalidateQueries({ queryKey: ['edit-post'] });
    } catch (e: unknown) {
      Alert.alert('Could not delete', formatSupabaseError(e));
    }
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="New post" subtitle="Create" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.notice}>
          <View style={styles.noticeRow}>
            <Ionicons name="information-circle-outline" size={22} color={t.accent} />
            <Text style={[styles.noticeText, { color: t.textSecondary }]}>
              Free posts go live instantly. Paid posts require KYC and a quick admin review before they appear in the feed.
            </Text>
          </View>
          <View style={[styles.kycRow, { backgroundColor: t.surfaceMuted }]}>
            <Ionicons name={kycOk ? 'checkmark-circle' : 'alert-circle-outline'} size={18} color={kycOk ? t.success : t.warning} />
            <Text style={[styles.kycLabel, { color: t.text }]}>KYC {kycOk ? 'verified' : 'not verified'}</Text>
          </View>
        </Card>

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
            <Switch value={isPaid} onValueChange={setIsPaid} trackColor={{ false: t.border, true: t.primaryMuted }} thumbColor={t.surfaceElevated} />
          </View>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: t.text }]}>Private visibility</Text>
              <Text style={[styles.rowSub, { color: t.textTertiary }]}>Limit who can discover this</Text>
            </View>
            <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: t.border, true: t.primaryMuted }} thumbColor={t.surfaceElevated} />
          </View>
          {isPaid ? <Input placeholder="Price (NGN)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /> : null}
        </Card>

        <Button title={isPaid ? 'Submit for review' : 'Publish now'} onPress={() => void submitPost()} loading={saving || uploading} />

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Your recent posts</Text>
        {(posts ?? []).map((post: CreatorPost) => (
          <Card key={post.id} style={styles.historyCard}>
            <Text style={[styles.historyTitle, { color: t.text }]}>{post.title || 'Untitled'}</Text>
            <Text style={[styles.meta, { color: t.textTertiary }]}>
              {post.status} · {post.is_paid ? `Paid · ${post.monetization_status} · ${toNaira(post.price_cents)}` : 'Free'}
            </Text>
            <View style={styles.historyActions}>
              <Button title="Edit" variant="outline" onPress={() => router.push({ pathname: '/(client)/edit-post', params: { id: post.id } })} />
              <Button title="Delete" variant="ghost" onPress={() => confirmDeletePost(post)} />
            </View>
          </Card>
        ))}
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
    kycRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: 12,
    },
    kycLabel: { fontSize: 13, fontWeight: '600' },
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
    historyCard: { paddingVertical: spacing.md, gap: spacing.sm },
    historyTitle: { fontWeight: '600', fontSize: 16 },
    meta: { fontSize: 12, marginTop: 4 },
    historyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  });
}
