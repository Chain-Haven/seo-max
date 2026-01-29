-- Create autonomous_seo_runs table
CREATE TABLE IF NOT EXISTS autonomous_seo_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  current_stage TEXT,
  progress INTEGER DEFAULT 0,
  last_message TEXT,
  options JSONB DEFAULT '{}',
  result JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_autonomous_seo_runs_store_id ON autonomous_seo_runs(store_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_seo_runs_status ON autonomous_seo_runs(status);
CREATE INDEX IF NOT EXISTS idx_autonomous_seo_runs_started_at ON autonomous_seo_runs(started_at DESC);

-- Add auto SEO schedule columns to stores table if not exists
ALTER TABLE stores ADD COLUMN IF NOT EXISTS auto_seo_schedule TEXT DEFAULT 'disabled' CHECK (auto_seo_schedule IN ('disabled', 'daily', 'weekly', 'monthly'));
ALTER TABLE stores ADD COLUMN IF NOT EXISTS auto_seo_next_run TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE autonomous_seo_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's SEO runs"
  ON autonomous_seo_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE s.id = autonomous_seo_runs.store_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert SEO runs for their organization's stores"
  ON autonomous_seo_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE s.id = autonomous_seo_runs.store_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's SEO runs"
  ON autonomous_seo_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE s.id = autonomous_seo_runs.store_id
      AND om.user_id = auth.uid()
    )
  );

-- Service role bypass for cron jobs
CREATE POLICY "Service role can manage all SEO runs"
  ON autonomous_seo_runs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE autonomous_seo_runs IS 'Tracks autonomous SEO optimization runs for stores';
COMMENT ON COLUMN autonomous_seo_runs.status IS 'Current status: pending, running, completed, failed';
COMMENT ON COLUMN autonomous_seo_runs.current_stage IS 'Current stage: crawl, analysis, apply, complete';
COMMENT ON COLUMN autonomous_seo_runs.progress IS 'Progress percentage 0-100';
COMMENT ON COLUMN autonomous_seo_runs.options IS 'Options used for this run (applyImprovements, maxPages, etc)';
COMMENT ON COLUMN autonomous_seo_runs.result IS 'Full result data after completion';
