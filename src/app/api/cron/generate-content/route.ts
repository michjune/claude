import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runResearchPipeline } from '@/lib/ai/research-pipeline';
import { generateBlogPost } from '@/lib/ai/blog-generator';
import { generateSocialContent } from '@/lib/ai/social-generator';
import { generateVideoScript } from '@/lib/ai/script-generator';
import { generateBlogImage } from '@/lib/ai/image-generator';
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
        // Run research pipeline first (shared across all generators)
        console.log(`[cron] Running research pipeline for paper ${paper.id}...`);
        const research = await runResearchPipeline(paper as Paper);
        console.log(`[cron] Found ${research.literature.references.length} cross-references`);

        // Blog runs first, then social + video in parallel
        const blog = await generateBlogPost(paper as Paper, research);

        const [social, videoScript] = await Promise.all([
          generateSocialContent(paper as Paper, research),
          generateVideoScript(paper as Paper, research),
        ]);

        // Generate blog featured image
        let blogImageUrl: string | null = null;
        let imgMeta: Record<string, unknown> = {};
        try {
          const imageResult = await generateBlogImage(blog.title, blog.keywords, blog.slug);
          blogImageUrl = imageResult.og_image_url;
          if (imageResult.unsplash_author) {
            imgMeta = { unsplash_author: imageResult.unsplash_author, unsplash_author_url: imageResult.unsplash_author_url };
          }
        } catch (imgErr) {
          console.error(`Failed to generate blog image for paper ${paper.id}:`, imgErr);
        }

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
          og_image_url?: string | null;
          metadata: Record<string, unknown>;
        }> = [
          { paper_id: paper.id, content_type: 'blog_post', title: blog.title, slug: blog.slug, body: blog.body, summary: blog.summary, status: 'pending_review', seo_title: blog.seo_title, seo_description: blog.seo_description, og_image_url: blogImageUrl, metadata: { keywords: blog.keywords, ...imgMeta, research_refs: research.literature.references.length } },
          { paper_id: paper.id, content_type: 'tweet', title: null, slug: null, body: social.tweet, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: { fact_checked: true } },
          { paper_id: paper.id, content_type: 'linkedin_post', title: null, slug: null, body: social.linkedin_post, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: { fact_checked: true } },
          { paper_id: paper.id, content_type: 'instagram_caption', title: null, slug: null, body: social.instagram_caption, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: { fact_checked: true } },
          { paper_id: paper.id, content_type: 'facebook_post', title: null, slug: null, body: social.facebook_post, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: { fact_checked: true } },
          { paper_id: paper.id, content_type: 'tiktok_caption', title: null, slug: null, body: social.tiktok_caption, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: { fact_checked: true } },
          { paper_id: paper.id, content_type: 'youtube_description', title: null, slug: null, body: social.youtube_description, summary: null, status: 'pending_review', seo_title: null, seo_description: null, metadata: { fact_checked: true } },
          { paper_id: paper.id, content_type: 'video_script', title: null, slug: null, body: videoScript.script, summary: videoScript.hook, status: 'pending_review', seo_title: null, seo_description: null, metadata: { visual_cues: videoScript.visual_cues, fact_checked: true } },
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
