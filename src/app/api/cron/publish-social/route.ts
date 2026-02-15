import { NextResponse } from 'next/server';
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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const jobName = 'publish-social';

  try {
    await supabase
      .from('cron_jobs')
      .upsert({ job_name: jobName, last_run_at: new Date().toISOString(), last_status: 'running' }, { onConflict: 'job_name' });

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
      await supabase
        .from('cron_jobs')
        .update({ last_status: 'success', items_processed: 0, last_error: null })
        .eq('job_name', jobName);
      return NextResponse.json({ success: true, published: 0 });
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
      await supabase
        .from('cron_jobs')
        .update({ last_status: 'success', items_processed: 0, last_error: null })
        .eq('job_name', jobName);
      return NextResponse.json({ success: true, published: 0 });
    }

    let published = 0;

    for (const content of contentItems) {
      // Find matching account for content type
      const platform = Object.entries(PLATFORM_CONTENT_MAP).find(
        ([, ct]) => ct === content.content_type
      )?.[0] as Platform | undefined;

      if (!platform) continue;

      // Check platform settings - auto mode?
      const platformSetting = settings?.find(
        (s) => s.platform === platform && s.content_type === content.content_type
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
      if (result.success) {
        published++;
        await supabase
          .from('content')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', content.id);
      }
    }

    await supabase
      .from('cron_jobs')
      .update({ last_status: 'success', items_processed: published, last_error: null })
      .eq('job_name', jobName);

    return NextResponse.json({ success: true, published });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await supabase
      .from('cron_jobs')
      .update({ last_status: 'failed', last_error: message })
      .eq('job_name', jobName);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
