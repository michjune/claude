import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/google/search-console';

export async function GET(request: Request) {
  // Auth check
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    const redirectUrl = new URL('/admin/settings', request.url);
    redirectUrl.searchParams.set('tab', 'search-console');
    redirectUrl.searchParams.set('gsc_error', error || 'no_code');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectUri = `${siteUrl}/api/settings/search-console/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const expiresAt = (Date.now() + tokens.expires_in * 1000).toString();

    const entries = [
      { setting_key: 'gsc_access_token', value: tokens.access_token },
      { setting_key: 'gsc_refresh_token', value: tokens.refresh_token },
      { setting_key: 'gsc_token_expires_at', value: expiresAt },
    ];

    for (const entry of entries) {
      await admin
        .from('ai_tone_settings')
        .upsert({ ...entry, updated_at: now }, { onConflict: 'setting_key' });
    }

    const redirectUrl = new URL('/admin/settings', request.url);
    redirectUrl.searchParams.set('tab', 'search-console');
    redirectUrl.searchParams.set('gsc_connected', 'true');
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    const redirectUrl = new URL('/admin/settings', request.url);
    redirectUrl.searchParams.set('tab', 'search-console');
    redirectUrl.searchParams.set('gsc_error', err instanceof Error ? err.message : 'token_exchange_failed');
    return NextResponse.redirect(redirectUrl);
  }
}
