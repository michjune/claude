import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getGoogleOAuthUrl } from '@/lib/google/search-console';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin' ? user : null;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: settings } = await admin
    .from('ai_tone_settings')
    .select('setting_key, value')
    .in('setting_key', ['gsc_site_url', 'gsc_refresh_token']);

  const settingsMap: Record<string, string> = {};
  for (const s of settings || []) settingsMap[s.setting_key] = s.value;

  // Get last sync info
  const { data: cronJob } = await admin
    .from('cron_jobs')
    .select('last_run_at, last_status, items_processed')
    .eq('job_name', 'fetch-search-console')
    .single();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectUri = `${siteUrl}/api/settings/search-console/callback`;

  return NextResponse.json({
    connected: !!settingsMap.gsc_refresh_token,
    siteUrl: settingsMap.gsc_site_url || null,
    lastSync: cronJob?.last_run_at || null,
    lastStatus: cronJob?.last_status || null,
    itemsProcessed: cronJob?.items_processed || 0,
    oauthUrl: getGoogleOAuthUrl(redirectUri),
  });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { siteUrl } = await request.json();
  if (!siteUrl) {
    return NextResponse.json({ error: 'siteUrl is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from('ai_tone_settings')
    .upsert(
      { setting_key: 'gsc_site_url', value: siteUrl, updated_at: new Date().toISOString() },
      { onConflict: 'setting_key' }
    );

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const keysToDelete = ['gsc_site_url', 'gsc_refresh_token', 'gsc_access_token', 'gsc_token_expires_at'];

  await admin
    .from('ai_tone_settings')
    .delete()
    .in('setting_key', keysToDelete);

  return NextResponse.json({ success: true });
}
