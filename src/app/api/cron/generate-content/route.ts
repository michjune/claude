import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateBlogPost } from '@/lib/ai/blog-generator';
import { generateSocialContent } from '@/lib/ai/social-generator';
import { generateVideoScript } from '@/lib/ai/script-generator';
import type { Paper, ContentType } from '@/lib/supabase/types';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const jobName = 'generate-content';

  try {
    await supabase
      .from('cron_jobs')
      .upsert({ job_name: jobName, last_run_at: new Date().toISOString(), last_status: 'running' }, { onConflict: 'job_name' });

    // Get papers without content (limit batch size)
    const { data: papers, error } = await supabase
      .from('papers')
      .select('*')
      .eq('content_generated', false)
      .order('fetched_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    if (!papers || papers.length === 0) {
      await supabase
        .from('cron_jobs')
        .update({ last_status: 'success', items_processed: 0, last_error: null })
        .eq('job_name', jobName);
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processed = 0;

    for (const paper of papers) {
      try {
        const [blog, social, videoScript] = await Promise.all([
          generateBlogPost(paper as Paper),
          generateSocialContent(paper as Paper),
          generateVideoScript(paper as Paper),
        ]);

        const contentItems: Array<{
          paper_id: string;
          content_type: ContentType;
          title: string | null;
          slug: string | null;
          body: string;
          summary: string | null;
          status: 'pending_review';
          seo_title: string | null;
          seo_description: string | null;
          metadata: Record<string, unknown>;
        }> = [
          { paper_id: paper.id, content_type: 'blog_post', title: blog.title, slug: blog.slug, body: blog.body, summary: blog.summary, status: 'pending_review', seo_title: blog.seo_title, seo_description: blog.seo_description, metadata: { keywords: blog.keywords } },
          { paper_id: paper.id, content_type: 'tweet', title: null, slug: null, body: social.tweet, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: {} },
          { paper_id: paper.id, content_type: 'linkedin_post', title: null, slug: null, body: social.linkedin_post, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: {} },
          { paper_id: paper.id, content_type: 'instagram_caption', title: null, slug: null, body: social.instagram_caption, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: {} },
          { paper_id: paper.id, content_type: 'facebook_post', title: null, slug: null, body: social.facebook_post, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: {} },
          { paper_id: paper.id, content_type: 'tiktok_caption', title: null, slug: null, body: social.tiktok_caption, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: {} },
          { paper_id: paper.id, content_type: 'youtube_description', title: null, slug: null, body: social.youtube_description, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: {} },
          { paper_id: paper.id, content_type: 'video_script', title: null, slug: null, body: videoScript.script, summary: videoScript.hook, status: 'pending_review', seo_title: null, seo_description: null, metadata: { visual_cues: videoScript.visual_cues } },
        ];

        await supabase.from('content').insert(contentItems);
        await supabase.from('papers').update({ content_generated: true }).eq('id', paper.id);
        processed++;
      } catch (err) {
        console.error(`Failed to generate content for paper ${paper.id}:`, err);
      }
    }

    await supabase
      .from('cron_jobs')
      .update({ last_status: 'success', items_processed: processed, last_error: null })
      .eq('job_name', jobName);

    return NextResponse.json({ success: true, processed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await supabase
      .from('cron_jobs')
      .update({ last_status: 'failed', last_error: message })
      .eq('job_name', jobName);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
