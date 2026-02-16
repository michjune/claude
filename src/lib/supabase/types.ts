export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected' | 'archived';
export type ContentType = 'blog_post' | 'tweet' | 'linkedin_post' | 'instagram_caption' | 'facebook_post' | 'tiktok_caption' | 'youtube_description' | 'video_script';
export type Platform = 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'facebook' | 'youtube';
export type VideoStatus = 'pending' | 'generating_audio' | 'rendering' | 'completed' | 'failed';
export type PublishMode = 'auto' | 'approval_required';
export type UserRole = 'user' | 'editor' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  newsletter_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface Journal {
  id: string;
  name: string;
  issn: string | null;
  e_issn: string | null;
  openalex_id: string | null;
  impact_factor: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Paper {
  id: string;
  title: string;
  abstract: string | null;
  authors: string[];
  journal_name: string | null;
  journal_id: string | null;
  doi: string | null;
  pmid: string | null;
  openalex_id: string | null;
  published_date: string | null;
  citation_count: number;
  source_url: string | null;
  keywords: string[];
  mesh_terms: string[];
  source_type: string | null;
  evidence_level: string | null;
  key_finding: string | null;
  trial_id: string | null;
  content_generated: boolean;
  fetched_at: string;
  metadata: Record<string, unknown>;
}

export interface Content {
  id: string;
  paper_id: string | null;
  content_type: ContentType;
  title: string | null;
  slug: string | null;
  body: string;
  summary: string | null;
  status: ContentStatus;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  approved_by: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: Platform;
  platform_user_id: string;
  platform_username: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  content_id: string;
  social_account_id: string;
  platform: Platform;
  platform_post_id: string | null;
  post_url: string | null;
  status: 'pending' | 'published' | 'failed';
  error_message: string | null;
  likes_count: number;
  shares_count: number;
  comments_count: number;
  views_count: number;
  published_at: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  content_id: string | null;
  paper_id: string | null;
  script: string;
  voiceover_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: VideoStatus;
  progress: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  content_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  content_id: string;
  parent_id: string | null;
  body: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  is_confirmed: boolean;
  confirmation_token: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export interface PlatformSetting {
  id: string;
  platform: Platform;
  content_type: ContentType;
  publish_mode: PublishMode;
  max_posts_per_day: number;
  best_times: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CronJob {
  id: string;
  job_name: string;
  last_run_at: string | null;
  last_status: 'success' | 'failed' | 'running' | null;
  last_error: string | null;
  items_processed: number;
  created_at: string;
}

export interface AiToneSetting {
  id: string;
  setting_key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PageView {
  id: string;
  content_id: string | null;
  path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country: string | null;
  device_type: string | null;
  session_id: string | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  content_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
}

export interface DailyContentStats {
  id: string;
  content_id: string;
  date: string;
  views: number;
  unique_visitors: number;
  shares: number;
  bookmarks: number;
  avg_scroll_depth: number;
  avg_time_on_page: number;
}

export interface DailySiteStats {
  id: string;
  date: string;
  total_views: number;
  unique_visitors: number;
  top_referrers: Array<{ source: string; count: number }>;
  device_breakdown: Record<string, number>;
  utm_breakdown: Record<string, number>;
}

// Helper type for table definitions
type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile, Partial<Profile> & { id: string }>;
      journals: TableDef<Journal>;
      papers: TableDef<Paper>;
      content: TableDef<Content>;
      social_accounts: TableDef<SocialAccount>;
      social_posts: TableDef<SocialPost>;
      videos: TableDef<Video>;
      bookmarks: TableDef<Bookmark>;
      comments: TableDef<Comment>;
      newsletter_subscribers: TableDef<NewsletterSubscriber>;
      platform_settings: TableDef<PlatformSetting>;
      cron_jobs: TableDef<CronJob>;
      ai_tone_settings: TableDef<AiToneSetting>;
      activity_log: TableDef<ActivityLog>;
      page_views: TableDef<PageView>;
      analytics_events: TableDef<AnalyticsEvent>;
      daily_content_stats: TableDef<DailyContentStats>;
      daily_site_stats: TableDef<DailySiteStats>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      content_status: ContentStatus;
      content_type: ContentType;
      platform: Platform;
      video_status: VideoStatus;
      publish_mode: PublishMode;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
