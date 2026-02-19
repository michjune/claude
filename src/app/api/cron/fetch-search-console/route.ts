import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchSearchConsole } from '@/lib/pipeline/tasks/fetch-search-console';

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const jobName = 'fetch-search-console';

  try {
    await supabase
      .from('cron_jobs')
      .upsert({ job_name: jobName, last_run_at: new Date().toISOString(), last_status: 'running' }, { onConflict: 'job_name' });

    const result = await fetchSearchConsole();

    if (result.skipped) {
      return NextResponse.json({ skipped: true, reason: result.reason });
    }

    await supabase
      .from('cron_jobs')
      .update({ last_status: 'success', items_processed: result.rows_fetched || 0, last_error: null })
      .eq('job_name', jobName);

    await supabase.from('activity_log').insert({
      action: 'cron_fetch_search_console',
      details: { rows_fetched: result.rows_fetched },
    });

    return NextResponse.json({ success: true, rows_fetched: result.rows_fetched });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    await supabase
      .from('cron_jobs')
      .update({ last_status: 'failed', last_error: message })
      .eq('job_name', jobName);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
