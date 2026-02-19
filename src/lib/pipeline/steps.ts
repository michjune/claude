export const PIPELINE_STEPS = [
  'research',
  'blog_draft',
  'blog_factcheck',
  'blog_edit',
  'social',
  'script',
  'image',
] as const;

export type PipelineStepName = (typeof PIPELINE_STEPS)[number];

export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PipelineStep {
  id: string;
  paper_id: string;
  step: PipelineStepName;
  status: PipelineStatus;
  attempt_count: number;
  max_attempts: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  output_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** Maps each step to the steps that must be completed before it can run. */
export const STEP_DEPENDENCIES: Record<PipelineStepName, PipelineStepName[]> = {
  research: [],
  blog_draft: ['research'],
  blog_factcheck: ['blog_draft'],
  blog_edit: ['blog_factcheck'],
  social: ['research'],
  script: ['research'],
  image: ['blog_edit'],
};
