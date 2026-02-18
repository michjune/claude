import { NextResponse } from 'next/server';
import { fetchAndUpsertPapers } from '@/lib/research/aggregator';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const jobName = 'fetch-papers';

  try {
    // Mark job as running
    await supabase
      .from('cron_jobs')
      .upsert({ job_name: jobName, last_run_at: new Date().toISOString(), last_status: 'running' }, { onConflict: 'job_name' });

    const result = await fetchAndUpsertPapers();

    // Mark job as success
    await supabase
      .from('cron_jobs')
      .update({
        last_status: 'success',
        items_processed: result.upserted,
        last_error: null,
      })
      .eq('job_name', jobName);

    await supabase.from('activity_log').insert({
      action: 'cron_fetch_papers',
      details: result,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    await supabase
      .from('cron_jobs')
      .update({ last_status: 'failed', last_error: message })
      .eq('job_name', jobName);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
