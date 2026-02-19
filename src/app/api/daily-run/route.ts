import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAndUpsertPapers } from '@/lib/research/aggregator';
import { resetStaleSteps, resetRetriableSteps, seedPipelineForNewPapers, findNextStep, runPipelineStep } from '@/lib/pipeline/orchestrator';
import { aggregateAnalytics } from '@/lib/pipeline/tasks/aggregate-analytics';
import { fetchSearchConsole } from '@/lib/pipeline/tasks/fetch-search-console';
import { publishSocialContent } from '@/lib/pipeline/tasks/publish-social';
import { renderPendingVideos } from '@/lib/pipeline/tasks/render-videos';

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = createAdminClient();
  const jobName = 'daily-run';

  const summary: Record<string, unknown> = {};

  try {
    await supabase
      .from('cron_jobs')
      .upsert({ job_name: jobName, last_run_at: new Date().toISOString(), last_status: 'running' }, { onConflict: 'job_name' });

    // 1. Reset stale locks (steps stuck 'running' > 5 min)
    const staleReset = await resetStaleSteps();
    summary.stale_reset = staleReset;

    // 2. Reset retriable failed steps
    const retriableReset = await resetRetriableSteps();
    summary.retriable_reset = retriableReset;

    // 3. Seed pipeline for new papers
    const seeded = await seedPipelineForNewPapers();
    summary.papers_seeded = seeded;

    // 4. Run lightweight tasks inline
    const elapsed = () => Date.now() - startTime;

    try {
      const papersResult = await fetchAndUpsertPapers();
      summary.papers_fetched = papersResult.upserted;
    } catch (err) {
      summary.papers_fetched_error = err instanceof Error ? err.message : 'Unknown';
    }

    if (elapsed() < 30_000) {
      try {
        const analyticsResult = await aggregateAnalytics();
        summary.analytics = analyticsResult;
      } catch (err) {
        summary.analytics_error = err instanceof Error ? err.message : 'Unknown';
      }
    }

    if (elapsed() < 35_000) {
      try {
        const gscResult = await fetchSearchConsole();
        summary.search_console = gscResult;
      } catch (err) {
        summary.search_console_error = err instanceof Error ? err.message : 'Unknown';
      }
    }

    if (elapsed() < 40_000) {
      try {
        const socialResult = await publishSocialContent();
        summary.social_published = socialResult.published;
      } catch (err) {
        summary.social_error = err instanceof Error ? err.message : 'Unknown';
      }
    }

    if (elapsed() < 42_000) {
      try {
        const videoResult = await renderPendingVideos();
        summary.videos_rendered = videoResult.rendered;
      } catch (err) {
        summary.video_error = err instanceof Error ? err.message : 'Unknown';
      }
    }

    // 5. Check remaining time - if < 10s left, skip AI step
    if (elapsed() > 50_000) {
      summary.pipeline_step = 'skipped_no_time';
    } else {
      // 6. Find and execute next pipeline step
      const next = await findNextStep();
      if (next) {
        const result = await runPipelineStep(next.step, next.paper);
        summary.pipeline_step = {
          paper_id: next.paper.id,
          step: next.step.step,
          success: result.success,
          error: result.error,
        };
      } else {
        summary.pipeline_step = 'none_ready';
      }
    }

    await supabase
      .from('cron_jobs')
      .update({ last_status: 'success', last_error: null, items_processed: seeded })
      .eq('job_name', jobName);

    await supabase.from('activity_log').insert({
      action: 'daily_run',
      details: summary,
    });

    return NextResponse.json({ success: true, elapsed_ms: elapsed(), ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await supabase
      .from('cron_jobs')
      .update({ last_status: 'failed', last_error: message })
      .eq('job_name', jobName);

    return NextResponse.json({ error: message, partial_summary: summary }, { status: 500 });
  }
}
