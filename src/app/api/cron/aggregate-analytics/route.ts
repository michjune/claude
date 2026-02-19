import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { aggregateAnalytics } from '@/lib/pipeline/tasks/aggregate-analytics';

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const jobName = 'aggregate_analytics';

  try {
    await admin.from('cron_jobs').upsert(
      { job_name: jobName, last_run_at: new Date().toISOString(), last_status: 'running' },
      { onConflict: 'job_name' },
    );

    const result = await aggregateAnalytics();

    await admin.from('cron_jobs').upsert(
      {
        job_name: jobName,
        last_run_at: new Date().toISOString(),
        last_status: 'success',
        last_error: null,
        items_processed: result.pageViewsProcessed + result.eventsProcessed,
      },
      { onConflict: 'job_name' },
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    await admin.from('cron_jobs').upsert(
      {
        job_name: jobName,
        last_run_at: new Date().toISOString(),
        last_status: 'failed',
        last_error: error instanceof Error ? error.message : 'Unknown error',
        items_processed: 0,
      },
      { onConflict: 'job_name' },
    );

    return NextResponse.json(
      { error: 'Aggregation failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
