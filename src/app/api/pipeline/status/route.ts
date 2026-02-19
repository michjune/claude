import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PIPELINE_STEPS } from '@/lib/pipeline/steps';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get all pipeline steps grouped by paper
  const { data: steps, error } = await supabase
    .from('pipeline_steps')
    .select('paper_id, step, status, attempt_count, error_message, started_at, completed_at, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by paper
  const paperMap = new Map<string, {
    steps: Record<string, { status: string; attempt_count: number; error_message: string | null }>;
    created_at: string;
  }>();

  for (const step of steps || []) {
    if (!paperMap.has(step.paper_id)) {
      paperMap.set(step.paper_id, { steps: {}, created_at: step.created_at });
    }
    paperMap.get(step.paper_id)!.steps[step.step] = {
      status: step.status,
      attempt_count: step.attempt_count,
      error_message: step.error_message,
    };
  }

  // Build summary
  const papers = Array.from(paperMap.entries()).map(([paperId, data]) => {
    const completed = Object.values(data.steps).filter(s => s.status === 'completed').length;
    const failed = Object.values(data.steps).filter(s => s.status === 'failed').length;
    const running = Object.values(data.steps).filter(s => s.status === 'running').length;
    const pending = Object.values(data.steps).filter(s => s.status === 'pending').length;

    let overallStatus = 'in_progress';
    if (completed === PIPELINE_STEPS.length) overallStatus = 'completed';
    else if (failed > 0 && pending === 0 && running === 0) overallStatus = 'stuck';

    return {
      paper_id: paperId,
      overall_status: overallStatus,
      progress: `${completed}/${PIPELINE_STEPS.length}`,
      completed,
      pending,
      running,
      failed,
      steps: data.steps,
      created_at: data.created_at,
    };
  });

  // Aggregate counts
  const totals = {
    total_papers: papers.length,
    completed: papers.filter(p => p.overall_status === 'completed').length,
    in_progress: papers.filter(p => p.overall_status === 'in_progress').length,
    stuck: papers.filter(p => p.overall_status === 'stuck').length,
  };

  return NextResponse.json({ totals, papers });
}
