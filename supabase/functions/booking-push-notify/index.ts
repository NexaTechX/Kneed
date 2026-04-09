import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { sendExpoPush } from '../_shared/expo-push.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Kind = 'provider_confirmed' | 'provider_declined' | 'provider_completed' | 'client_cancelled';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { booking_id?: string; kind?: Kind };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const bookingId = body.booking_id;
  const kind = body.kind;
  if (!bookingId || !kind) {
    return new Response(JSON.stringify({ error: 'booking_id and kind required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, client_id, provider_id, scheduled_at')
    .eq('id', bookingId)
    .maybeSingle();

  if (bErr || !booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let recipientId: string | null = null;
  let title = '';
  let msg = '';

  switch (kind) {
    case 'provider_confirmed':
    case 'provider_declined':
    case 'provider_completed':
      if (booking.provider_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recipientId = booking.client_id;
      if (kind === 'provider_confirmed') {
        title = 'Booking confirmed';
        msg = 'Your provider confirmed the session.';
      } else if (kind === 'provider_declined') {
        title = 'Booking update';
        msg = 'The provider could not accept this request.';
      } else {
        title = 'Session complete';
        msg = 'Your provider marked the session complete. You can leave a review.';
      }
      break;
    case 'client_cancelled':
      if (booking.client_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recipientId = booking.provider_id;
      title = 'Booking cancelled';
      msg = 'A client cancelled a booking.';
      break;
    default:
      return new Response(JSON.stringify({ error: 'Unknown kind' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }

  const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', recipientId);

  const messages = (tokens ?? []).map((row) => ({
    to: row.token,
    title,
    body: msg,
    sound: 'default' as const,
    data: { booking_id: bookingId, kind },
  }));

  await sendExpoPush(messages);

  return new Response(JSON.stringify({ ok: true, sent: messages.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
