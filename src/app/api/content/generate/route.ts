import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateBlogPost } from '@/lib/ai/blog-generator';
import { generateSocialContent } from '@/lib/ai/social-generator';
import { generateVideoScript } from '@/lib/ai/script-generator';
import type { Paper, ContentType } from '@/lib/supabase/types';

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
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
    // Generate all content in parallel
    const [blog, social, videoScript] = await Promise.all([
      generateBlogPost(paper as Paper),
      generateSocialContent(paper as Paper),
      generateVideoScript(paper as Paper),
    ]);

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
        created_by: user.id,
        metadata: { keywords: blog.keywords },
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
        metadata: {},
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
        metadata: {},
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
        metadata: {},
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
        metadata: {},
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
        metadata: {},
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
        metadata: {},
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
        metadata: { visual_cues: videoScript.visual_cues },
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
      details: { content_types: contentItems.map((c) => c.content_type) },
    });

    return NextResponse.json({ success: true, count: contentItems.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
