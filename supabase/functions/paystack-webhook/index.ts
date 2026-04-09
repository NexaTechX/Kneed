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
      metadata?: { booking_id?: string };
      status?: string;
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
  const bookingId = data?.metadata?.booking_id;

  if (event === 'charge.success' && reference) {
    const admin = createClient(supabaseUrl, serviceKey);
    let q = admin.from('bookings').update({ payment_status: 'paid' }).eq('paystack_reference', reference);
    if (bookingId) {
      q = q.eq('id', bookingId);
    }
    const { error } = await q;
    if (error) {
      console.error('webhook update error', error.message);
      return new Response('Update failed', { status: 500 });
    }

    const { data: paidBooking } = await admin
      .from('bookings')
      .select('id, provider_id')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (paidBooking?.provider_id) {
      const { data: tokens } = await admin
        .from('push_tokens')
        .select('token')
        .eq('user_id', paidBooking.provider_id);
      await sendExpoPush(
        (tokens ?? []).map((row) => ({
          to: row.token,
          title: 'Payment received',
          body: 'A client paid — you can confirm this booking in the app.',
          sound: 'default' as const,
          data: { booking_id: paidBooking.id, kind: 'payment_received' },
        })),
      );
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
