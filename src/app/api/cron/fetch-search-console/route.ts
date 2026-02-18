import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchSearchConsoleData, refreshGoogleToken } from '@/lib/google/search-console';

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const jobName = 'fetch-search-console';

  try {
    // Read GSC settings
    const { data: settings } = await supabase
      .from('ai_tone_settings')
      .select('setting_key, value')
      .in('setting_key', ['gsc_site_url', 'gsc_refresh_token', 'gsc_access_token', 'gsc_token_expires_at']);

    const settingsMap: Record<string, string> = {};
    for (const s of settings || []) settingsMap[s.setting_key] = s.value;

    if (!settingsMap.gsc_refresh_token || !settingsMap.gsc_site_url) {
      return NextResponse.json({ skipped: true, reason: 'GSC not configured' });
    }

    // Mark job as running
    await supabase
      .from('cron_jobs')
      .upsert({ job_name: jobName, last_run_at: new Date().toISOString(), last_status: 'running' }, { onConflict: 'job_name' });

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

    // Fetch last 3 days (GSC has ~2-day data lag)
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

    // Mark job as success
    await supabase
      .from('cron_jobs')
      .update({
        last_status: 'success',
        items_processed: rows.length,
        last_error: null,
      })
      .eq('job_name', jobName);

    await supabase.from('activity_log').insert({
      action: 'cron_fetch_search_console',
      details: { rows_fetched: rows.length, start_date: startStr, end_date: endStr },
    });

    return NextResponse.json({ success: true, rows_fetched: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    await supabase
      .from('cron_jobs')
      .update({ last_status: 'failed', last_error: message })
      .eq('job_name', jobName);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
