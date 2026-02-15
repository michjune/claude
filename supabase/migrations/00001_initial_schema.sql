-- ============================================================================
-- StemCell Pulse - Initial Schema Migration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------

CREATE TYPE content_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'published',
  'rejected',
  'archived'
);

CREATE TYPE content_type AS ENUM (
  'blog_post',
  'tweet',
  'linkedin_post',
  'instagram_caption',
  'facebook_post',
  'tiktok_caption',
  'youtube_description',
  'video_script'
);

CREATE TYPE platform AS ENUM (
  'twitter',
  'instagram',
  'linkedin',
  'tiktok',
  'facebook',
  'youtube'
);

CREATE TYPE video_status AS ENUM (
  'pending',
  'generating_audio',
  'rendering',
  'completed',
  'failed'
);

CREATE TYPE publish_mode AS ENUM (
  'auto',
  'approval_required'
);

CREATE TYPE user_role AS ENUM (
  'user',
  'editor',
  'admin'
);

-- ----------------------------------------------------------------------------
-- 2. UTILITY FUNCTIONS
-- ----------------------------------------------------------------------------

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Full-text search vector update function
CREATE OR REPLACE FUNCTION content_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: check if current user is editor or admin
CREATE OR REPLACE FUNCTION is_editor_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('editor', 'admin')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. TABLES
-- ----------------------------------------------------------------------------

-- profiles
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       user_role    NOT NULL DEFAULT 'user',
  full_name  TEXT,
  avatar_url TEXT,
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- journals
CREATE TABLE journals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT    NOT NULL,
  issn          TEXT,
  e_issn        TEXT,
  openalex_id   TEXT,
  impact_factor NUMERIC,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- papers
CREATE TABLE papers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT    NOT NULL,
  abstract          TEXT,
  authors           TEXT[]  DEFAULT '{}',
  journal_name      TEXT,
  journal_id        UUID    REFERENCES journals(id) ON DELETE SET NULL,
  doi               TEXT    UNIQUE,
  pmid              TEXT    UNIQUE,
  openalex_id       TEXT,
  published_date    DATE,
  citation_count    INT     DEFAULT 0,
  source_url        TEXT,
  keywords          TEXT[]  DEFAULT '{}',
  mesh_terms        TEXT[]  DEFAULT '{}',
  content_generated BOOLEAN DEFAULT FALSE,
  fetched_at        TIMESTAMPTZ DEFAULT now(),
  metadata          JSONB   DEFAULT '{}'
);

-- content
CREATE TABLE content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id        UUID           REFERENCES papers(id) ON DELETE SET NULL,
  content_type    content_type   NOT NULL,
  title           TEXT,
  slug            TEXT           UNIQUE,
  body            TEXT           NOT NULL,
  summary         TEXT,
  status          content_status NOT NULL DEFAULT 'draft',
  seo_title       TEXT,
  seo_description TEXT,
  og_image_url    TEXT,
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  approved_by     UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  metadata        JSONB          DEFAULT '{}',
  search_vector   TSVECTOR,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- social_accounts
CREATE TABLE social_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID     NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform          platform NOT NULL,
  platform_user_id  TEXT     NOT NULL,
  platform_username TEXT,
  access_token      TEXT     NOT NULL,
  refresh_token     TEXT,
  token_expires_at  TIMESTAMPTZ,
  is_active         BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, platform_user_id)
);

-- social_posts
CREATE TABLE social_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id        UUID     NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  social_account_id UUID     NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform          platform NOT NULL,
  platform_post_id  TEXT,
  post_url          TEXT,
  status            TEXT     NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'published', 'failed')),
  error_message     TEXT,
  likes_count       INT      DEFAULT 0,
  shares_count      INT      DEFAULT 0,
  comments_count    INT      DEFAULT 0,
  views_count       INT      DEFAULT 0,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- videos
CREATE TABLE videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id       UUID         REFERENCES content(id) ON DELETE SET NULL,
  paper_id         UUID         REFERENCES papers(id) ON DELETE SET NULL,
  script           TEXT         NOT NULL,
  voiceover_url    TEXT,
  video_url        TEXT,
  thumbnail_url    TEXT,
  duration_seconds INT,
  status           video_status NOT NULL DEFAULT 'pending',
  progress         INT          DEFAULT 0,
  error_message    TEXT,
  metadata         JSONB        DEFAULT '{}',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- bookmarks
CREATE TABLE bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id)
);

-- comments
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID    NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  parent_id  UUID    REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT    NOT NULL,
  is_edited  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- newsletter_subscribers
CREATE TABLE newsletter_subscribers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT        NOT NULL UNIQUE,
  is_confirmed       BOOLEAN     NOT NULL DEFAULT FALSE,
  confirmation_token UUID        DEFAULT gen_random_uuid(),
  subscribed_at      TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at    TIMESTAMPTZ
);

-- platform_settings
CREATE TABLE platform_settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         platform     NOT NULL,
  content_type     content_type NOT NULL,
  publish_mode     publish_mode NOT NULL DEFAULT 'approval_required',
  max_posts_per_day INT         DEFAULT 3,
  best_times       TEXT[]       DEFAULT '{}',
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (platform, content_type)
);

-- cron_jobs
CREATE TABLE cron_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name        TEXT NOT NULL UNIQUE,
  last_run_at     TIMESTAMPTZ,
  last_status     TEXT CHECK (last_status IN ('success', 'failed', 'running')),
  last_error      TEXT,
  items_processed INT  DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- activity_log
CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX idx_papers_doi            ON papers(doi);
CREATE INDEX idx_papers_pmid           ON papers(pmid);
CREATE INDEX idx_content_slug          ON content(slug);
CREATE INDEX idx_content_status        ON content(status);
CREATE INDEX idx_content_content_type  ON content(content_type);
CREATE INDEX idx_content_paper_id      ON content(paper_id);
CREATE INDEX idx_content_search_vector ON content USING GIN (search_vector);
CREATE INDEX idx_social_posts_content  ON social_posts(content_id);
CREATE INDEX idx_comments_content      ON comments(content_id);
CREATE INDEX idx_bookmarks_user        ON bookmarks(user_id);

-- ----------------------------------------------------------------------------
-- 5. TRIGGERS
-- ----------------------------------------------------------------------------

-- updated_at triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Full-text search trigger on content
CREATE TRIGGER content_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, body ON content
  FOR EACH ROW EXECUTE FUNCTION content_search_vector_update();

-- Auto-create profile on new auth user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE content               ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log          ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Allow profile creation via trigger"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- ---- journals ----
CREATE POLICY "Admins can manage journals"
  ON journals FOR ALL
  USING (is_admin());

CREATE POLICY "Authenticated users can read journals"
  ON journals FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---- papers ----
CREATE POLICY "Admins can manage papers"
  ON papers FOR ALL
  USING (is_admin());

CREATE POLICY "Authenticated users can read papers"
  ON papers FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---- content ----
CREATE POLICY "Published blog posts are publicly readable"
  ON content FOR SELECT
  USING (
    status = 'published' AND content_type = 'blog_post'
  );

CREATE POLICY "Admins and editors can read all content"
  ON content FOR SELECT
  USING (is_editor_or_admin());

CREATE POLICY "Admins and editors can insert content"
  ON content FOR INSERT
  WITH CHECK (is_editor_or_admin());

CREATE POLICY "Admins and editors can update content"
  ON content FOR UPDATE
  USING (is_editor_or_admin())
  WITH CHECK (is_editor_or_admin());

CREATE POLICY "Admins and editors can delete content"
  ON content FOR DELETE
  USING (is_editor_or_admin());

-- ---- social_accounts ----
CREATE POLICY "Admins can manage social accounts"
  ON social_accounts FOR ALL
  USING (is_admin());

-- ---- social_posts ----
CREATE POLICY "Admins can manage social posts"
  ON social_posts FOR ALL
  USING (is_admin());

-- ---- videos ----
CREATE POLICY "Admins can manage videos"
  ON videos FOR ALL
  USING (is_admin());

-- ---- bookmarks ----
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (user_id = auth.uid());

-- ---- comments ----
CREATE POLICY "Anyone can read comments on published content"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = comments.content_id
        AND content.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can insert comments"
  ON comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());

-- ---- newsletter_subscribers ----
CREATE POLICY "Admins can manage newsletter subscribers"
  ON newsletter_subscribers FOR ALL
  USING (is_admin());

CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (TRUE);

-- ---- platform_settings ----
CREATE POLICY "Admins can manage platform settings"
  ON platform_settings FOR ALL
  USING (is_admin());

-- ---- cron_jobs ----
CREATE POLICY "Admins can manage cron jobs"
  ON cron_jobs FOR ALL
  USING (is_admin());

-- ---- activity_log ----
CREATE POLICY "Admins can view activity log"
  ON activity_log FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert activity log"
  ON activity_log FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "System can insert activity log"
  ON activity_log FOR INSERT
  WITH CHECK (TRUE);
