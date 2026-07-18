import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RegisterBody = {
  email?: string;
  password?: string;
  full_name?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const fullName = (body.full_name ?? '').trim();

  if (!fullName) {
    return new Response(JSON.stringify({ error: 'Please enter your full name.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: 'Enter a valid email address.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (password.length < 8) {
    return new Response(JSON.stringify({ error: 'Use at least 8 characters.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'Server is not configured for signup.' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sessionResponse = (access_token: string, refresh_token: string, user: { id: string; email?: string }) =>
    new Response(
      JSON.stringify({
        session: { access_token, refresh_token },
        user: { id: user.id, email: user.email },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  // Admin create with email_confirm skips the confirmation-email path (and its rate limit).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr) {
    const msg = createErr.message ?? 'Sign up failed';
    const already = /already|registered|exists/i.test(msg);
    if (already) {
      // Retry with the same password → treat as successful sign-in (common after interrupted signup).
      const { data: signedIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
      if (!signInErr && signedIn.session && signedIn.user) {
        await admin.from('profiles').update({ full_name: fullName, role: 'client' }).eq('id', signedIn.user.id);
        return sessionResponse(
          signedIn.session.access_token,
          signedIn.session.refresh_token,
          { id: signedIn.user.id, email: signedIn.user.email },
        );
      }
      return new Response(JSON.stringify({ error: 'This email is already registered. Sign in instead.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = created.user?.id;
  if (userId) {
    await admin.from('profiles').update({ full_name: fullName, role: 'client' }).eq('id', userId);
  }

  const { data: signedIn, error: signInErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr || !signedIn.session || !signedIn.user) {
    return new Response(
      JSON.stringify({
        error: 'Account created but sign-in failed. Try signing in with your new password.',
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  return sessionResponse(signedIn.session.access_token, signedIn.session.refresh_token, {
    id: signedIn.user.id,
    email: signedIn.user.email,
  });
});
