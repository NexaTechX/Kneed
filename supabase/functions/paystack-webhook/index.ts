import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { sendExpoPush } from '../_shared/expo-push.ts';

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function platformFeePpv(amountCents: number): number {
  return Math.round(amountCents * 0.4);
}

function platformFeePrivateRoom(amountCents: number): number {
  return Math.round(amountCents * 0.1);
}

async function creditWallet(
  admin: SupabaseClient,
  ownerId: string,
  ownerType: 'user' | 'creator',
  amountCents: number,
  entryType: 'purchase' | 'private_room',
  reference: string,
) {
  if (amountCents <= 0) return;
  const { data: existing } = await admin.from('wallet_accounts').select('owner_id').eq('owner_id', ownerId).maybeSingle();
  if (!existing) {
    await admin.from('wallet_accounts').insert({
      owner_id: ownerId,
      owner_type: ownerType,
      available_cents: 0,
      pending_cents: 0,
      lifetime_earned_cents: 0,
    });
  }
  const { data: w } = await admin.from('wallet_accounts').select('*').eq('owner_id', ownerId).maybeSingle();
  const avail = Number(w?.available_cents ?? 0);
  const life = Number(w?.lifetime_earned_cents ?? 0);
  await admin
    .from('wallet_accounts')
    .update({
      available_cents: avail + amountCents,
      lifetime_earned_cents: life + amountCents,
      updated_at: new Date().toISOString(),
    })
    .eq('owner_id', ownerId);

  await admin.from('wallet_transactions').insert({
    owner_id: ownerId,
    direction: 'credit',
    entry_type: entryType,
    amount_cents: amountCents,
    status: 'posted',
    reference,
    metadata: {},
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

  if (!secret || !serviceKey || !supabaseUrl) {
    return new Response('Server misconfigured', { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';

  const computed = await hmacSha512Hex(secret, rawBody);
  if (computed !== signature) {
    return new Response('Invalid signature', { status: 400 });
  }

  let payload: {
    event?: string;
    data?: {
      reference?: string;
      status?: string;
      metadata?: Record<string, string | undefined>;
    };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = payload.event;
  const data = payload.data;
  const reference = data?.reference;
  const meta = data?.metadata ?? {};

  if (event !== 'charge.success' || !reference || data?.status !== 'success') {
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const kind = meta.kind ?? (meta as { Kind?: string }).Kind;
  const postId = meta.post_id ?? (meta as { post_id?: string }).post_id;
  const buyerId = meta.buyer_id ?? (meta as { buyer_id?: string }).buyer_id;

  if (kind === 'ppv' && postId && buyerId) {
    const { data: existing } = await admin
      .from('content_purchases')
      .select('id')
      .eq('post_id', postId)
      .eq('buyer_id', buyerId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: post } = await admin
      .from('creator_posts')
      .select('id, creator_id, price_cents, is_paid')
      .eq('id', postId)
      .maybeSingle();
    if (!post?.is_paid || !post.creator_id) {
      return new Response(JSON.stringify({ error: 'Invalid post' }), { status: 400 });
    }

    const amount = post.price_cents;
    const fee = platformFeePpv(amount);
    const net = amount - fee;

    const { error: insErr } = await admin.from('content_purchases').insert({
      post_id: postId,
      buyer_id: buyerId,
      creator_id: post.creator_id,
      amount_cents: amount,
      platform_fee_cents: fee,
      net_cents: net,
      status: 'paid',
    });
    if (insErr) {
      console.error('content_purchases insert', insErr.message);
      return new Response('Insert failed', { status: 500 });
    }

    const { error: grantErr } = await admin.from('post_access_grants').insert({
      post_id: postId,
      user_id: buyerId,
      source: 'purchase',
    });
    if (grantErr && !grantErr.message.includes('duplicate') && !grantErr.code?.includes('23505')) {
      console.error('post_access_grants', grantErr.message);
    }

    await creditWallet(admin, post.creator_id, 'creator', net, 'purchase', reference);

    const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', post.creator_id);
    await sendExpoPush(
      (tokens ?? []).map((row) => ({
        to: row.token,
        title: 'New purchase',
        body: 'Someone unlocked your paid post.',
        sound: 'default' as const,
        data: { post_id: postId, kind: 'ppv_paid' },
      })),
    );
  } else if (kind === 'private_room' && (meta.session_id ?? (meta as { session_id?: string }).session_id)) {
    const sessionId = meta.session_id ?? (meta as { session_id?: string }).session_id!;
    const { data: session } = await admin
      .from('private_room_sessions')
      .select('id, booked_user_id, amount_cents, status, platform_fee_cents')
      .eq('id', sessionId)
      .maybeSingle();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 400 });
    }
    if (session.status === 'paid' && (session.platform_fee_cents ?? 0) > 0) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const amount = session.amount_cents;
    const fee = platformFeePrivateRoom(amount);
    const net = amount - fee;

    const { error: upErr } = await admin
      .from('private_room_sessions')
      .update({
        status: 'paid',
        platform_fee_cents: fee,
        payee_net_cents: net,
      })
      .eq('id', sessionId)
      .in('status', ['pending', 'accepted']);
    if (upErr) {
      console.error('private_room update', upErr.message);
      return new Response('Update failed', { status: 500 });
    }

    await creditWallet(admin, session.booked_user_id, 'user', net, 'private_room', reference);

    const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', session.booked_user_id);
    await sendExpoPush(
      (tokens ?? []).map((row) => ({
        to: row.token,
        title: 'Private room booking paid',
        body: 'A booking for your listing was paid.',
        sound: 'default' as const,
        data: { session_id: sessionId, kind: 'private_room_paid' },
      })),
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
