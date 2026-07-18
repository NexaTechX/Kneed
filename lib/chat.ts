import { supabase } from '@/lib/supabase';
import type { Conversation, Message, Profile } from '@/types/database';

export type ChatPeer = Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;

export type ConversationListItem = Conversation & {
  peer: ChatPeer;
  unread: boolean;
};

export async function areMutualFriends(userA: string, userB: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('are_mutual_friends', { a: userA, b: userB });
  if (error) throw error;
  return Boolean(data);
}

export async function getOrCreateDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_dm', { p_other_user_id: otherUserId });
  if (error) throw error;
  if (!data || typeof data !== 'string') throw new Error('Could not open conversation');
  return data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
  if (error) throw error;
}

function peerIdFor(conv: Conversation, myId: string): string {
  return conv.user_low === myId ? conv.user_high : conv.user_low;
}

function isUnread(conv: Conversation, myId: string): boolean {
  if (!conv.last_message_at) return false;
  const lastRead =
    conv.user_low === myId ? conv.user_low_last_read_at : conv.user_high_last_read_at;
  if (!lastRead) return true;
  return new Date(conv.last_message_at) > new Date(lastRead);
}

export async function fetchConversations(userId: string): Promise<ConversationListItem[]> {
  const { data: rows, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;

  const list = (rows ?? []) as Conversation[];
  const peerIds = [...new Set(list.map((c) => peerIdFor(c, userId)))];
  let profileMap: Record<string, ChatPeer> = {};
  if (peerIds.length > 0) {
    const { data: profs, error: pe } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', peerIds);
    if (pe) throw pe;
    for (const p of profs ?? []) {
      profileMap[p.id] = {
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
      };
    }
  }

  return list.map((c) => {
    const pid = peerIdFor(c, userId);
    return {
      ...c,
      peer: profileMap[pid] ?? { id: pid, full_name: 'Member', avatar_url: null },
      unread: isUnread(c, userId),
    };
  });
}

export async function fetchConversation(conversationId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw error;
  return (data as Conversation | null) ?? null;
}

export async function fetchPeerProfile(peerId: string): Promise<ChatPeer | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', peerId)
    .maybeSingle();
  if (error) throw error;
  return data as ChatPeer | null;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Message is empty');
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
    .select('*')
    .single();
  if (error) throw error;
  return data as Message;
}
