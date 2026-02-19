-- Pipeline steps: tracks each content generation step per paper
create table pipeline_steps (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid not null references papers(id) on delete cascade,
  step text not null,
  status text not null default 'pending',
  attempt_count int not null default 0,
  max_attempts int not null default 3,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  output_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(paper_id, step)
);

create index idx_pipeline_steps_status on pipeline_steps(status);
create index idx_pipeline_steps_paper on pipeline_steps(paper_id);