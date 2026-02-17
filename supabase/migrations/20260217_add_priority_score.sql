-- Add priority_score column to papers table
ALTER TABLE papers ADD COLUMN IF NOT EXISTS priority_score FLOAT DEFAULT 0;

-- Index for efficient querying of unprocessed papers by priority
CREATE INDEX IF NOT EXISTS idx_papers_priority_unprocessed
  ON papers (priority_score DESC) WHERE content_generated = FALSE;
