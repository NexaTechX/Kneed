import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header } from '@/components/layout/Header';
import { SafeView } from '@/components/layout/SafeView';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchConversation,
  fetchMessages,
  fetchPeerProfile,
  markConversationRead,
  sendMessage,
} from '@/lib/chat';
import { queryKeys } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/lib/supabaseErrors';
import type { Message } from '@/types/database';

export default function ChatThreadScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const conversationId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  const { user } = useAuth();
  const qc = useQueryClient();
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(t), [t]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const { data: conversation, isLoading: loadingConv } = useQuery({
    queryKey: queryKeys.conversation(conversationId),
    enabled: Boolean(conversationId),
    queryFn: () => fetchConversation(conversationId!),
  });

  const peerId =
    conversation && user
      ? conversation.user_low === user.id
        ? conversation.user_high
        : conversation.user_low
      : undefined;

  const { data: peer } = useQuery({
    queryKey: ['chat-peer', peerId],
    enabled: Boolean(peerId),
    queryFn: () => fetchPeerProfile(peerId!),
  });

  const {
    data: messages = [],
    isLoading: loadingMessages,
  } = useQuery({
    queryKey: queryKeys.messages(conversationId),
    enabled: Boolean(conversationId),
    queryFn: () => fetchMessages(conversationId!),
  });

  useEffect(() => {
    if (!conversationId || !user) return;
    void markConversationRead(conversationId)
      .then(() => qc.invalidateQueries({ queryKey: queryKeys.conversations(user.id) }))
      .catch(() => undefined);
  }, [conversationId, user, qc, messages.length]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          qc.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) => {
            const list = prev ?? [];
            if (list.some((m) => m.id === row.id)) return list;
            return [...list, row];
          });
          if (user) {
            void qc.invalidateQueries({ queryKey: queryKeys.conversations(user.id) });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, qc, user]);

  const onSend = async () => {
    if (!user || !conversationId || !body.trim() || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, user.id, body);
      setBody('');
      qc.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) => {
        const list = prev ?? [];
        if (list.some((m) => m.id === msg.id)) return list;
        return [...list, msg];
      });
      await qc.invalidateQueries({ queryKey: queryKeys.conversations(user.id) });
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e: unknown) {
      Alert.alert('Could not send', formatSupabaseError(e));
    } finally {
      setSending(false);
    }
  };

  const peerName = peer?.full_name?.trim() || 'Chat';
  const loading = loadingConv || loadingMessages;

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <Header title={peerName} showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={t.text} />
          </View>
        ) : !conversation ? (
          <View style={styles.centered}>
            <Text style={{ color: t.textSecondary }}>Conversation unavailable.</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, messages.length === 0 && styles.listEmpty]}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: t.textSecondary }]}>
                  You're friends — send the first message.
                </Text>
              }
              renderItem={({ item }) => {
                const mine = item.sender_id === user?.id;
                return (
                  <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                    <View
                      style={[
                        styles.bubble,
                        mine
                          ? { backgroundColor: t.primary }
                          : { backgroundColor: t.surfaceElevated, borderColor: t.border, borderWidth: StyleSheet.hairlineWidth },
                      ]}>
                      <Text style={[styles.bubbleText, { color: mine ? t.onPrimary : t.text }]}>{item.body}</Text>
                      <Text style={[styles.bubbleTime, { color: mine ? `${t.onPrimary}99` : t.textTertiary }]}>
                        {format(new Date(item.created_at), 'h:mm a')}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
            <View
              style={[
                styles.composer,
                {
                  backgroundColor: t.surfaceElevated,
                  borderTopColor: t.border,
                  paddingBottom: Math.max(insets.bottom, spacing.sm),
                },
              ]}>
              <Input
                value={body}
                onChangeText={setBody}
                placeholder="Message…"
                style={styles.input}
                multiline
                maxLength={2000}
              />
              <Pressable
                onPress={() => void onSend()}
                disabled={!body.trim() || sending}
                style={[
                  styles.sendBtn,
                  { backgroundColor: t.primary, opacity: !body.trim() || sending ? 0.4 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message">
                <Ionicons name="send" size={18} color={t.onPrimary} />
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeView>
  );
}

function createStyles(_t: AppTheme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexGrow: 1 },
    listEmpty: { justifyContent: 'center' },
    emptyText: { textAlign: 'center', fontSize: 15, paddingHorizontal: spacing.xl },
    bubbleRow: { marginBottom: spacing.sm, flexDirection: 'row' },
    bubbleRowMine: { justifyContent: 'flex-end' },
    bubbleRowTheirs: { justifyContent: 'flex-start' },
    bubble: {
      maxWidth: '80%',
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: 6,
    },
    bubbleText: { fontSize: 15, lineHeight: 20 },
    bubbleTime: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 14,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
