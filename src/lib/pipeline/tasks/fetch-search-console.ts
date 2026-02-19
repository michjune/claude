import { createAdminClient } from '@/lib/supabase/admin';
import { fetchSearchConsoleData, refreshGoogleToken } from '@/lib/google/search-console';

export async function fetchSearchConsole(): Promise<{
  skipped?: boolean;
  reason?: string;
  rows_fetched?: number;
}> {
  const supabase = createAdminClient();

  // Read GSC settings
  const { data: settings } = await supabase
    .from('ai_tone_settings')
    .select('setting_key, value')
    .in('setting_key', ['gsc_site_url', 'gsc_refresh_token', 'gsc_access_token', 'gsc_token_expires_at']);

  const settingsMap: Record<string, string> = {};
  for (const s of settings || []) settingsMap[s.setting_key] = s.value;

  if (!settingsMap.gsc_refresh_token || !settingsMap.gsc_site_url) {
    return { skipped: true, reason: 'GSC not configured' };
  }

  // Refresh token if expired
  let accessToken = settingsMap.gsc_access_token;
  const expiresAt = settingsMap.gsc_token_expires_at ? parseInt(settingsMap.gsc_token_expires_at) : 0;

  if (Date.now() >= expiresAt) {
    const tokenData = await refreshGoogleToken(settingsMap.gsc_refresh_token);
    accessToken = tokenData.access_token;
    const newExpiresAt = (Date.now() + tokenData.expires_in * 1000).toString();

    for (const [key, value] of [
      ['gsc_access_token', accessToken],
      ['gsc_token_expires_at', newExpiresAt],
    ] as const) {
      await supabase
        .from('ai_tone_settings')
        .upsert({ setting_key: key, value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
    }
  }

  // Fetch last 3 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 3);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const rows = await fetchSearchConsoleData(accessToken, settingsMap.gsc_site_url, startStr, endStr);

  // Delete existing gsc_query events for these dates (dedup)
  const dateFilterISO = startDate.toISOString();
  await supabase
    .from('analytics_events')
    .delete()
    .eq('event_type', 'gsc_query')
    .gte('created_at', dateFilterISO);

  // Insert new events
  if (rows.length > 0) {
    const events = rows.map((row) => ({
      event_type: 'gsc_query',
      event_data: {
        query: row.query,
        page: row.page,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        date: startStr,
      },
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert(events);

    if (insertError) throw insertError;
  }

  return { rows_fetched: rows.length };
}
