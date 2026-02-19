import { createAdminClient } from '@/lib/supabase/admin';
import { PIPELINE_STEPS, STEP_DEPENDENCIES } from './steps';
import { executeStep } from './executors';
import type { PipelineStep, PipelineStepName } from './steps';
import type { Paper } from '@/lib/supabase/types';

const STALE_LOCK_MINUTES = 5;

/**
 * Reset steps stuck in 'running' for longer than STALE_LOCK_MINUTES.
 * This handles cases where a previous invocation crashed mid-step.
 */
export async function resetStaleSteps(): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_LOCK_MINUTES * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('pipeline_steps')
    .update({
      status: 'pending',
      error_message: 'Reset: previous run timed out',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'running')
    .lt('started_at', cutoff)
    .select('id');

  return data?.length || 0;
}

/**
 * Reset failed steps that haven't exhausted retries back to pending.
 */
export async function resetRetriableSteps(): Promise<number> {
  const supabase = createAdminClient();

  // We can't do attempt_count < max_attempts in a single query easily,
  // so fetch failed steps and filter in code
  const { data: failedSteps } = await supabase
    .from('pipeline_steps')
    .select('id, attempt_count, max_attempts')
    .eq('status', 'failed');

  if (!failedSteps || failedSteps.length === 0) return 0;

  const retriable = failedSteps.filter(s => s.attempt_count < s.max_attempts);
  if (retriable.length === 0) return 0;

  const { data } = await supabase
    .from('pipeline_steps')
    .update({
      status: 'pending',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .in('id', retriable.map(s => s.id))
    .select('id');

  return data?.length || 0;
}

/**
 * Seed pipeline_steps rows for papers that have content_generated = false
 * and no existing pipeline_steps rows.
 */
export async function seedPipelineForNewPapers(): Promise<number> {
  const supabase = createAdminClient();

  // Get papers without content that don't already have pipeline steps
  const { data: papers } = await supabase
    .from('papers')
    .select('id')
    .eq('content_generated', false)
    .order('priority_score', { ascending: false, nullsFirst: false });

  if (!papers || papers.length === 0) return 0;

  let seeded = 0;

  for (const paper of papers) {
    // Check if this paper already has pipeline steps
    const { count } = await supabase
      .from('pipeline_steps')
      .select('id', { count: 'exact', head: true })
      .eq('paper_id', paper.id);

    if ((count || 0) > 0) continue;

    // Insert all 7 steps as pending
    const rows = PIPELINE_STEPS.map(step => ({
      paper_id: paper.id,
      step,
      status: 'pending',
      attempt_count: 0,
      max_attempts: 3,
    }));

    const { error } = await supabase.from('pipeline_steps').insert(rows);

    if (!error) seeded++;
  }

  return seeded;
}

/**
 * Find the next pipeline step that's ready to execute.
 * A step is ready when:
 * - status = 'pending'
 * - all dependency steps for the same paper are 'completed'
 *
 * Prioritizes papers that already have in-progress steps (to finish them first).
 */
export async function findNextStep(): Promise<{ step: PipelineStep; paper: Paper } | null> {
  const supabase = createAdminClient();

  // Get all pending steps
  const { data: pendingSteps } = await supabase
    .from('pipeline_steps')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (!pendingSteps || pendingSteps.length === 0) return null;

  // Get all steps for the papers that have pending steps (to check dependencies)
  const paperIds = [...new Set(pendingSteps.map(s => s.paper_id))];
  const { data: allSteps } = await supabase
    .from('pipeline_steps')
    .select('paper_id, step, status')
    .in('paper_id', paperIds);

  if (!allSteps) return null;

  // Build a lookup: paper_id -> step -> status
  const stepStatusMap = new Map<string, Map<string, string>>();
  for (const s of allSteps) {
    if (!stepStatusMap.has(s.paper_id)) stepStatusMap.set(s.paper_id, new Map());
    stepStatusMap.get(s.paper_id)!.set(s.step, s.status);
  }

  // Score papers: prefer papers that already have completed steps (in-progress papers)
  const paperProgress = new Map<string, number>();
  for (const [paperId, steps] of stepStatusMap) {
    const completedCount = [...steps.values()].filter(s => s === 'completed').length;
    paperProgress.set(paperId, completedCount);
  }

  // Sort pending steps: papers with more progress first, then by creation time
  const sortedPending = pendingSteps.sort((a, b) => {
    const progressA = paperProgress.get(a.paper_id) || 0;
    const progressB = paperProgress.get(b.paper_id) || 0;
    if (progressB !== progressA) return progressB - progressA;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Find the first step whose dependencies are all completed
  for (const step of sortedPending) {
    const deps = STEP_DEPENDENCIES[step.step as PipelineStepName];
    const paperSteps = stepStatusMap.get(step.paper_id);
    if (!paperSteps) continue;

    const depsCompleted = deps.every(dep => paperSteps.get(dep) === 'completed');

    // Also check that no dependency is permanently failed (attempt_count >= max_attempts)
    const depsFailed = deps.some(dep => paperSteps.get(dep) === 'failed');

    if (depsCompleted && !depsFailed) {
      // Fetch the paper
      const { data: paper } = await supabase
        .from('papers')
        .select('*')
        .eq('id', step.paper_id)
        .single();

      if (paper) {
        return { step: step as PipelineStep, paper: paper as Paper };
      }
    }
  }

  return null;
}

/**
 * Claim and execute a pipeline step with optimistic locking.
 * Returns the result or null if the step was already claimed.
 */
export async function runPipelineStep(
  step: PipelineStep,
  paper: Paper,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Optimistic lock: only claim if still pending
  const { data: claimed } = await supabase
    .from('pipeline_steps')
    .update({
      status: 'running',
      started_at: now,
      attempt_count: step.attempt_count + 1,
      updated_at: now,
    })
    .eq('id', step.id)
    .eq('status', 'pending')
    .select('id');

  if (!claimed || claimed.length === 0) {
    return { success: false, error: 'Step already claimed by another invocation' };
  }

  try {
    const output = await executeStep(step, paper);

    // Mark completed
    await supabase
      .from('pipeline_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_data: output,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', step.id);

    console.log(`[pipeline] Completed step ${step.step} for paper ${paper.id}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[pipeline] Step ${step.step} failed for paper ${paper.id}:`, message);

    // Mark failed
    await supabase
      .from('pipeline_steps')
      .update({
        status: 'failed',
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', step.id);

    // Log to activity_log
    await supabase.from('activity_log').insert({
      action: 'pipeline_step_failed',
      entity_type: 'paper',
      entity_id: paper.id,
      details: { step: step.step, attempt: step.attempt_count + 1, error: message },
    });

    return { success: false, error: message };
  }
}
