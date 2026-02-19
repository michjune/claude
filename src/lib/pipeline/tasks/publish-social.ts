import { createAdminClient } from '@/lib/supabase/admin';
import { publishContent } from '@/lib/social/publisher';
import type { Content, SocialAccount, Platform } from '@/lib/supabase/types';

const PLATFORM_CONTENT_MAP: Record<Platform, string> = {
  twitter: 'tweet',
  linkedin: 'linkedin_post',
  instagram: 'instagram_caption',
  facebook: 'facebook_post',
  tiktok: 'tiktok_caption',
  youtube: 'youtube_description',
};

export async function publishSocialContent(): Promise<{ published: number }> {
  const supabase = createAdminClient();

  // Get platform settings
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('is_active', true);

  // Get active social accounts
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('is_active', true);

  if (!accounts || accounts.length === 0) {
    return { published: 0 };
  }

  // Get approved content that's scheduled for now or earlier
  const { data: contentItems } = await supabase
    .from('content')
    .select('*')
    .eq('status', 'approved')
    .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
    .neq('content_type', 'blog_post')
    .neq('content_type', 'video_script')
    .limit(20);

  if (!contentItems || contentItems.length === 0) {
    return { published: 0 };
  }

  let published = 0;

  for (const content of contentItems) {
    const platform = Object.entries(PLATFORM_CONTENT_MAP).find(
      ([, ct]) => ct === content.content_type,
    )?.[0] as Platform | undefined;

    if (!platform) continue;

    const platformSetting = settings?.find(
      (s) => s.platform === platform && s.content_type === content.content_type,
    );

    if (platformSetting?.publish_mode === 'approval_required') continue;

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('social_posts')
      .select('id', { count: 'exact', head: true })
      .eq('platform', platform)
      .eq('status', 'published')
      .gte('published_at', `${today}T00:00:00Z`);

    const maxPerDay = platformSetting?.max_posts_per_day || 3;
    if ((count || 0) >= maxPerDay) continue;

    const account = accounts.find((a) => (a as SocialAccount).platform === platform) as SocialAccount | undefined;
    if (!account) continue;

    const result = await publishContent(content as Content, account);
    const publishedAt = new Date().toISOString();
    if (result.success) {
      published++;
      await supabase
        .from('content')
        .update({ status: 'published', published_at: publishedAt })
        .eq('id', content.id);

      await supabase.from('activity_log').insert({
        action: 'publish_social',
        entity_type: 'content',
        entity_id: content.id,
        details: {
          platform,
          scheduled_at: content.scheduled_at,
          published_at: publishedAt,
          delay_minutes: content.scheduled_at
            ? Math.round((new Date(publishedAt).getTime() - new Date(content.scheduled_at).getTime()) / 60000)
            : null,
          post_url: result.postUrl,
        },
      });
    }
  }

  return { published };
}
