import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

  if (!paystackSecret) {
    return new Response(JSON.stringify({ error: 'Paystack is not configured on the server' }), {
      status: 503,
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

  let body: { booking_id?: string };
  try {
    body = (await req.json()) as { booking_id?: string };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const bookingId = body.booking_id;
  if (!bookingId) {
    return new Response(JSON.stringify({ error: 'booking_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('id, client_id, total_cents, payment_status, paystack_reference')
    .eq('id', bookingId)
    .maybeSingle();

  if (bErr || !booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (booking.client_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (booking.payment_status === 'paid') {
    return new Response(JSON.stringify({ error: 'Already paid' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).maybeSingle();

  const email = profile?.email ?? user.email ?? '';
  if (!email) {
    return new Response(JSON.stringify({ error: 'No email on profile' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const reference = `knead_${bookingId}_${Date.now()}`;
  const amount = Math.round(Number(booking.total_cents));
  if (!Number.isFinite(amount) || amount < 1) {
    return new Response(JSON.stringify({ error: 'Invalid amount' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  /** Paystack expects smallest currency unit (e.g. kobo for NGN). Must match your Paystack account currency. */
  const currency = Deno.env.get('PAYSTACK_CURRENCY') ?? 'NGN';

  const payRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount,
      currency,
      reference,
      metadata: { booking_id: bookingId },
    }),
  });

  const payJson = (await payRes.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };

  if (!payRes.ok || !payJson.status || !payJson.data?.authorization_url) {
    return new Response(
      JSON.stringify({ error: payJson.message ?? 'Paystack initialize failed' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { error: upErr } = await supabase
    .from('bookings')
    .update({ paystack_reference: reference, payment_status: 'pending' })
    .eq('id', bookingId)
    .eq('client_id', user.id);

  if (upErr) {
    return new Response(JSON.stringify({ error: upErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      authorization_url: payJson.data.authorization_url,
      reference: payJson.data.reference ?? reference,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
