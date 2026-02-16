import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runResearchPipeline } from '@/lib/ai/research-pipeline';
import { generateBlogPost } from '@/lib/ai/blog-generator';
import { generateSocialContent } from '@/lib/ai/social-generator';
import { generateVideoScript } from '@/lib/ai/script-generator';
import { generateBlogImage } from '@/lib/ai/image-generator';
import type { Paper, ContentType } from '@/lib/supabase/types';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { paperId } = await request.json();
  if (!paperId) return NextResponse.json({ error: 'paperId required' }, { status: 400 });

  const admin = createAdminClient();

  // Fetch paper
  const { data: paper, error: paperError } = await admin
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .single();

  if (paperError || !paper) {
    return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
  }

  try {
    // Step 0: Run research pipeline (shared across all generators)
    console.log('[generate] Running research pipeline...');
    const research = await runResearchPipeline(paper as Paper);
    console.log(`[generate] Found ${research.literature.references.length} cross-references`);

    // Generate all content with shared research context
    // Blog runs first (most complex), social + video can run in parallel after
    console.log('[generate] Generating blog post...');
    const blog = await generateBlogPost(paper as Paper, research);

    console.log('[generate] Generating social + video in parallel...');
    const [social, videoScript] = await Promise.all([
      generateSocialContent(paper as Paper, research),
      generateVideoScript(paper as Paper, research),
    ]);

    // Generate blog featured image
    let blogImageUrl: string | null = null;
    let imageMetadata: Record<string, unknown> = {};
    try {
      const imageResult = await generateBlogImage(
        blog.title,
        blog.keywords,
        blog.slug
      );
      blogImageUrl = imageResult.og_image_url;
      if (imageResult.unsplash_author) {
        imageMetadata = {
          unsplash_author: imageResult.unsplash_author,
          unsplash_author_url: imageResult.unsplash_author_url,
        };
      }
    } catch (err) {
      console.error('Failed to generate blog image:', err);
    }

    // Insert all content items
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
      created_by: string;
      metadata: Record<string, unknown>;
    }> = [
      {
        paper_id: paperId,
        content_type: 'blog_post',
        title: blog.title,
        slug: blog.slug,
        body: blog.body,
        summary: blog.summary,
        status: 'pending_review',
        seo_title: blog.seo_title,
        seo_description: blog.seo_description,
        og_image_url: blogImageUrl,
        created_by: user.id,
        metadata: {
          keywords: blog.keywords,
          ...imageMetadata,
          research_refs: research.literature.references.length,
        },
      },
      {
        paper_id: paperId,
        content_type: 'tweet',
        title: null,
        slug: null,
        body: social.tweet,
        summary: null,
        status: 'pending_review',
        seo_title: null,
        seo_description: null,
        created_by: user.id,
        metadata: { fact_checked: true },
      },
      {
        paper_id: paperId,
        content_type: 'linkedin_post',
        title: null,
        slug: null,
        body: social.linkedin_post,
        summary: null,
        status: 'pending_review',
        seo_title: null,
        seo_description: null,
        created_by: user.id,
        metadata: { fact_checked: true },
      },
      {
        paper_id: paperId,
        content_type: 'instagram_caption',
        title: null,
        slug: null,
        body: social.instagram_caption,
        summary: null,
        status: 'pending_review',
        seo_title: null,
        seo_description: null,
        created_by: user.id,
        metadata: { fact_checked: true },
      },
      {
        paper_id: paperId,
        content_type: 'facebook_post',
        title: null,
        slug: null,
        body: social.facebook_post,
        summary: null,
        status: 'pending_review',
        seo_title: null,
        seo_description: null,
        created_by: user.id,
        metadata: { fact_checked: true },
      },
      {
        paper_id: paperId,
        content_type: 'tiktok_caption',
        title: null,
        slug: null,
        body: social.tiktok_caption,
        summary: null,
        status: 'pending_review',
        seo_title: null,
        seo_description: null,
        created_by: user.id,
        metadata: { fact_checked: true },
      },
      {
        paper_id: paperId,
        content_type: 'youtube_description',
        title: null,
        slug: null,
        body: social.youtube_description,
        summary: null,
        status: 'pending_review',
        seo_title: null,
        seo_description: null,
        created_by: user.id,
        metadata: { fact_checked: true },
      },
      {
        paper_id: paperId,
        content_type: 'video_script',
        title: null,
        slug: null,
        body: videoScript.script,
        summary: videoScript.hook,
        status: 'pending_review',
        seo_title: null,
        seo_description: null,
        created_by: user.id,
        metadata: { visual_cues: videoScript.visual_cues, fact_checked: true },
      },
    ];

    const { error: insertError } = await admin.from('content').insert(contentItems);
    if (insertError) throw insertError;

    // Mark paper as content generated
    await admin.from('papers').update({ content_generated: true }).eq('id', paperId);

    await admin.from('activity_log').insert({
      user_id: user.id,
      action: 'generate_content',
      entity_type: 'paper',
      entity_id: paperId,
      details: {
        content_types: contentItems.map((c) => c.content_type),
        research_refs: research.literature.references.length,
      },
    });

    return NextResponse.json({ success: true, count: contentItems.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
