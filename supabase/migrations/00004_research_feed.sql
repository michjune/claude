-- Add research feed columns to papers table
ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'journal',
  ADD COLUMN IF NOT EXISTS evidence_level TEXT DEFAULT 'peer-reviewed',
  ADD COLUMN IF NOT EXISTS key_finding TEXT,
  ADD COLUMN IF NOT EXISTS trial_id TEXT;

-- Indexes for feed filtering and sorting
CREATE INDEX IF NOT EXISTS idx_papers_source_type ON papers (source_type);
CREATE INDEX IF NOT EXISTS idx_papers_evidence_level ON papers (evidence_level);
CREATE INDEX IF NOT EXISTS idx_papers_published_date_desc ON papers (published_date DESC);
