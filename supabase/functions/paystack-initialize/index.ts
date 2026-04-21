import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type InitBody =
  | { kind: 'ppv'; post_id: string }
  | { kind: 'private_room'; session_id: string };

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

  let body: InitBody;
  try {
    body = (await req.json()) as InitBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
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

  const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).maybeSingle();
  const email = profile?.email ?? user.email ?? '';
  if (!email) {
    return new Response(JSON.stringify({ error: 'No email on profile' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const currency = Deno.env.get('PAYSTACK_CURRENCY') ?? 'NGN';
  let amountCents = 0;
  let reference = '';
  let metadata: Record<string, string> = { kind: body.kind, buyer_id: user.id };

  if (body.kind === 'ppv') {
    const postId = body.post_id;
    if (!postId) {
      return new Response(JSON.stringify({ error: 'post_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: post, error: pErr } = await supabase
      .from('creator_posts')
      .select('id, creator_id, price_cents, is_paid, status, monetization_status')
      .eq('id', postId)
      .maybeSingle();

    if (pErr || !post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!post.is_paid || post.price_cents <= 0) {
      return new Response(JSON.stringify({ error: 'Post is not paid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (post.creator_id === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot purchase your own post' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (post.status !== 'published' || post.monetization_status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Post is not available for purchase' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    amountCents = post.price_cents;
    reference = `knead_ppv_${postId}_${user.id}_${Date.now()}`;
    metadata = { ...metadata, post_id: postId, seller_id: post.creator_id };
  } else if (body.kind === 'private_room') {
    const sessionId = body.session_id;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: session, error: sErr } = await supabase
      .from('private_room_sessions')
      .select('id, booker_user_id, booked_user_id, amount_cents, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (session.booker_user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (session.status !== 'pending' && session.status !== 'accepted') {
      return new Response(JSON.stringify({ error: 'Session is not payable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    amountCents = session.amount_cents;
    reference = `knead_pr_${sessionId}_${Date.now()}`;
    metadata = {
      ...metadata,
      session_id: sessionId,
      booked_user_id: session.booked_user_id,
      booker_user_id: session.booker_user_id,
    };
  } else {
    return new Response(JSON.stringify({ error: 'Invalid kind' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!Number.isFinite(amountCents) || amountCents < 1) {
    return new Response(JSON.stringify({ error: 'Invalid amount' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const payRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountCents,
      currency,
      reference,
      metadata,
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

  return new Response(
    JSON.stringify({
      authorization_url: payJson.data.authorization_url,
      reference: payJson.data.reference ?? reference,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
