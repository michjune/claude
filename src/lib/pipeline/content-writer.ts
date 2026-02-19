import { createAdminClient } from '@/lib/supabase/admin';
import type { ContentType } from '@/lib/supabase/types';

const supabase = () => createAdminClient();

interface BlogData {
  title: string;
  slug: string;
  body: string;
  summary: string;
  seo_title: string;
  seo_description: string;
  keywords: string[];
  og_image_url?: string | null;
  unsplash_author?: string;
  unsplash_author_url?: string;
}

interface SocialData {
  tweet: string;
  linkedin_post: string;
  instagram_caption: string;
  facebook_post: string;
  tiktok_caption: string;
  youtube_description: string;
  hashtags?: Record<string, string[]>;
}

interface ScriptData {
  script: string;
  visual_cues: string[];
  hook: string;
}

/**
 * Insert or update content for a paper. If content already exists for this
 * paper+type combo (from a previous run), update it instead of creating a duplicate.
 */
async function upsertContent(
  paperId: string,
  contentType: ContentType,
  fields: Record<string, unknown>,
): Promise<string> {
  const db = supabase();

  // Check if content already exists for this paper + type
  const { data: existing } = await db
    .from('content')
    .select('id')
    .eq('paper_id', paperId)
    .eq('content_type', contentType)
    .limit(1)
    .single();

  if (existing) {
    const { error } = await db
      .from('content')
      .update(fields)
      .eq('id', existing.id);
    if (error) throw new Error(`Failed to update ${contentType}: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await db
    .from('content')
    .insert({ paper_id: paperId, content_type: contentType, ...fields })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to insert ${contentType}: ${error.message}`);
  return data.id;
}

export async function insertBlogContent(
  paperId: string,
  blog: BlogData,
  presetId: string,
  presetName: string,
): Promise<string> {
  return upsertContent(paperId, 'blog_post', {
    title: blog.title,
    slug: blog.slug,
    body: blog.body,
    summary: blog.summary,
    status: 'pending_review',
    seo_title: blog.seo_title,
    seo_description: blog.seo_description,
    og_image_url: blog.og_image_url || null,
    metadata: {
      keywords: blog.keywords,
      ...(blog.unsplash_author && {
        unsplash_author: blog.unsplash_author,
        unsplash_author_url: blog.unsplash_author_url,
      }),
      fact_checked: true,
      ab_preset: presetId,
      ab_preset_name: presetName,
    },
  });
}

export async function insertSocialContent(
  paperId: string,
  social: SocialData,
  presetId: string,
  presetName: string,
): Promise<void> {
  const platformMap: Array<{ content_type: ContentType; body: string }> = [
    { content_type: 'tweet', body: social.tweet },
    { content_type: 'linkedin_post', body: social.linkedin_post },
    { content_type: 'instagram_caption', body: social.instagram_caption },
    { content_type: 'facebook_post', body: social.facebook_post },
    { content_type: 'tiktok_caption', body: social.tiktok_caption },
    { content_type: 'youtube_description', body: social.youtube_description },
  ];

  for (const item of platformMap) {
    try {
      await upsertContent(paperId, item.content_type, {
        title: null,
        slug: null,
        body: item.body,
        summary: null,
        status: 'pending_review',
        seo_title: null,
        seo_description: null,
        metadata: {
          hashtags: social.hashtags,
          fact_checked: true,
          ab_preset: presetId,
          ab_preset_name: presetName,
        },
      });
    } catch (err) {
      console.error(`Failed to insert ${item.content_type} for paper ${paperId}:`, err);
    }
  }
}

export async function insertScriptContent(
  paperId: string,
  script: ScriptData,
  presetId: string,
  presetName: string,
): Promise<void> {
  await upsertContent(paperId, 'video_script', {
    title: null,
    slug: null,
    body: script.script,
    summary: script.hook,
    status: 'pending_review',
    seo_title: null,
    seo_description: null,
    metadata: {
      visual_cues: script.visual_cues,
      fact_checked: true,
      ab_preset: presetId,
      ab_preset_name: presetName,
    },
  });
}

export async function updateBlogImage(
  paperId: string,
  ogImageUrl: string,
  unsplashAuthor?: string,
  unsplashAuthorUrl?: string,
): Promise<void> {
  const { data: blog } = await supabase()
    .from('content')
    .select('id, metadata')
    .eq('paper_id', paperId)
    .eq('content_type', 'blog_post')
    .single();

  if (!blog) throw new Error(`No blog content found for paper ${paperId}`);

  const metadata = (blog.metadata || {}) as Record<string, unknown>;
  if (unsplashAuthor) {
    metadata.unsplash_author = unsplashAuthor;
    metadata.unsplash_author_url = unsplashAuthorUrl;
  }

  const { error } = await supabase()
    .from('content')
    .update({ og_image_url: ogImageUrl, metadata })
    .eq('id', blog.id);

  if (error) throw new Error(`Failed to update blog image: ${error.message}`);
}
