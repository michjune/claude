-- Analytics tables for tracking page views, engagement events, and aggregated stats

-- ============================================================
-- page_views: lightweight pageview tracking
-- ============================================================
CREATE TABLE page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,
  device_type TEXT, -- mobile, tablet, desktop
  session_id TEXT,  -- anonymous session fingerprint
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_views_content ON page_views(content_id);
CREATE INDEX idx_page_views_created ON page_views(created_at);
CREATE INDEX idx_page_views_session ON page_views(session_id);

-- ============================================================
-- analytics_events: engagement events (shares, bookmarks, scroll depth, etc.)
-- ============================================================
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'share', 'bookmark', 'scroll_25', 'scroll_50', 'scroll_75', 'scroll_100', 'click_cta', 'time_on_page'
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_content ON analytics_events(content_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_created ON analytics_events(created_at);

-- ============================================================
-- daily_content_stats: aggregated daily stats per content item
-- ============================================================
CREATE TABLE daily_content_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  shares INT DEFAULT 0,
  bookmarks INT DEFAULT 0,
  avg_scroll_depth FLOAT DEFAULT 0,
  avg_time_on_page FLOAT DEFAULT 0,
  UNIQUE(content_id, date)
);

CREATE INDEX idx_daily_stats_date ON daily_content_stats(date);
CREATE INDEX idx_daily_stats_content ON daily_content_stats(content_id);

-- ============================================================
-- daily_site_stats: aggregated daily site-wide stats
-- ============================================================
CREATE TABLE daily_site_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  top_referrers JSONB DEFAULT '[]',
  device_breakdown JSONB DEFAULT '{}',
  utm_breakdown JSONB DEFAULT '{}'
);

CREATE INDEX idx_site_stats_date ON daily_site_stats(date);

-- ============================================================
-- RLS Policies
-- ============================================================

-- page_views: INSERT-only for anon/authenticated, SELECT for admins
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page views"
  ON page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read page views"
  ON page_views FOR SELECT
  TO authenticated
  USING (is_admin());

-- analytics_events: INSERT-only for anon/authenticated, SELECT for admins
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read analytics events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (is_admin());

-- daily_content_stats: SELECT for admins, INSERT/UPDATE via service role only
ALTER TABLE daily_content_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read daily content stats"
  ON daily_content_stats FOR SELECT
  TO authenticated
  USING (is_admin());

-- daily_site_stats: SELECT for admins, INSERT/UPDATE via service role only
ALTER TABLE daily_site_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read daily site stats"
  ON daily_site_stats FOR SELECT
  TO authenticated
  USING (is_admin());
