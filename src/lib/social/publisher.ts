import { createAdminClient } from '@/lib/supabase/admin';
import type { Content, SocialAccount, Platform } from '@/lib/supabase/types';
import { postTweet, refreshTwitterToken } from './twitter';
import { postToLinkedIn, refreshLinkedInToken } from './linkedin';
import { postToFacebook } from './facebook';
import { postToTikTok, refreshTikTokToken } from './tiktok';
import { postToInstagram, refreshInstagramToken } from './instagram';
import { uploadYouTubeShort, refreshYouTubeToken } from './youtube';

interface PublishResult {
  platform: Platform;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

const PLATFORM_CONTENT_MAP: Record<Platform, string> = {
  twitter: 'tweet',
  linkedin: 'linkedin_post',
  instagram: 'instagram_caption',
  facebook: 'facebook_post',
  tiktok: 'tiktok_caption',
  youtube: 'youtube_description',
};

export async function publishContent(
  content: Content,
  account: SocialAccount
): Promise<PublishResult> {
  const platform = account.platform;

  try {
    // Refresh token if needed
    await ensureFreshToken(account);

    let result: { id: string; url: string };

    switch (platform) {
      case 'twitter':
        result = await postTweet(account, content.body);
        break;
      case 'linkedin':
        result = await postToLinkedIn(account, content.body);
        break;
      case 'facebook':
        result = await postToFacebook(account, content.body);
        break;
      case 'instagram':
        // Instagram requires an image - use OG image or placeholder
        result = await postToInstagram(
          account,
          content.body,
          content.og_image_url || `${process.env.NEXT_PUBLIC_SITE_URL}/api/og?title=${encodeURIComponent(content.title || 'StemCell Pulse')}`
        );
        break;
      case 'tiktok':
        // TikTok requires a video URL - this will be handled by video pipeline
        throw new Error('TikTok requires video content - use video publisher');
      case 'youtube': {
        // Find a completed video for this paper
        const db = createAdminClient();
        const { data: video } = await db
          .from('videos')
          .select('*')
          .eq('paper_id', content.paper_id)
          .eq('status', 'completed')
          .not('video_url', 'is', null)
          .limit(1)
          .single();

        if (!video || !video.video_url) {
          throw new Error('No completed video found for this paper. Render a video first.');
        }

        // Download video into buffer
        const videoRes = await fetch(video.video_url);
        if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

        const tags = (content.metadata as { tags?: string[] })?.tags || ['stemcells', 'science'];
        result = await uploadYouTubeShort(
          account,
          content.title || 'Stem Cell Research Update',
          content.body,
          videoBuffer,
          tags
        );
        break;
      }
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Record the social post
    const supabase = createAdminClient();
    await supabase.from('social_posts').insert({
      content_id: content.id,
      social_account_id: account.id,
      platform,
      platform_post_id: result.id,
      post_url: result.url,
      status: 'published',
      published_at: new Date().toISOString(),
    });

    return { platform, success: true, postId: result.id, postUrl: result.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    const supabase = createAdminClient();
    await supabase.from('social_posts').insert({
      content_id: content.id,
      social_account_id: account.id,
      platform,
      status: 'failed',
      error_message: message,
    });

    return { platform, success: false, error: message };
  }
}

async function ensureFreshToken(account: SocialAccount): Promise<void> {
  if (!account.token_expires_at) return;

  const expiresAt = new Date(account.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer

  if (expiresAt.getTime() - now.getTime() > bufferMs) return;

  if (!account.refresh_token) {
    throw new Error(`${account.platform} token expired and no refresh token available`);
  }

  const supabase = createAdminClient();
  let newToken: { access_token: string; refresh_token?: string; expires_in: number };

  switch (account.platform) {
    case 'twitter':
      newToken = await refreshTwitterToken(account.refresh_token);
      break;
    case 'linkedin':
      newToken = await refreshLinkedInToken(account.refresh_token);
      break;
    case 'tiktok':
      newToken = await refreshTikTokToken(account.refresh_token);
      break;
    case 'youtube':
      newToken = await refreshYouTubeToken(account.refresh_token);
      break;
    case 'instagram': {
      // Instagram uses access_token (not refresh_token) for refresh
      const igResult = await refreshInstagramToken(account.access_token);
      newToken = { ...igResult, refresh_token: undefined };
      break;
    }
    default:
      return; // Platform doesn't support refresh
  }

  const updates: Record<string, unknown> = {
    access_token: newToken.access_token,
    token_expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString(),
  };

  if (newToken.refresh_token) {
    updates.refresh_token = newToken.refresh_token;
  }

  await supabase
    .from('social_accounts')
    .update(updates)
    .eq('id', account.id);

  // Update the account object in memory
  account.access_token = newToken.access_token;
}

export async function publishToAllPlatforms(
  paperId: string
): Promise<PublishResult[]> {
  const supabase = createAdminClient();

  // Get all approved content for this paper
  const { data: contentItems } = await supabase
    .from('content')
    .select('*')
    .eq('paper_id', paperId)
    .eq('status', 'approved');

  if (!contentItems || contentItems.length === 0) return [];

  // Get all active social accounts
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('is_active', true);

  if (!accounts || accounts.length === 0) return [];

  const results: PublishResult[] = [];

  for (const account of accounts) {
    const acct = account as SocialAccount;
    const contentType = PLATFORM_CONTENT_MAP[acct.platform];
    const content = contentItems.find((c: { content_type: string }) => c.content_type === contentType);

    if (content) {
      const result = await publishContent(content as Content, account as SocialAccount);
      results.push(result);

      if (result.success) {
        // Mark content as published
        await supabase
          .from('content')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', content.id);
      }
    }
  }

  return results;
}
