import type { SocialAccount } from '@/lib/supabase/types';

const TIKTOK_API = 'https://open.tiktokapis.com/v2';

export async function postToTikTok(
  account: SocialAccount,
  caption: string,
  videoUrl: string
): Promise<{ id: string; url: string }> {
  // Step 1: Initialize video upload
  const initRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_info: {
        title: caption,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_stitch: false,
        disable_comment: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    }),
  });

  if (!initRes.ok) {
    const error = await initRes.text();
    throw new Error(`TikTok upload init failed: ${initRes.status} ${error}`);
  }

  const initData = await initRes.json();
  const publishId = initData.data?.publish_id;

  if (!publishId) throw new Error('TikTok upload did not return publish_id');

  // Step 2: Poll for status
  let status = 'PROCESSING';
  let postId = '';

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusRes = await fetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      status = statusData.data?.status;

      if (status === 'PUBLISH_COMPLETE') {
        postId = statusData.data?.publicaly_available_post_id?.[0] || publishId;
        break;
      }
      if (status === 'FAILED') {
        throw new Error(`TikTok publish failed: ${statusData.data?.fail_reason}`);
      }
    }
  }

  if (status !== 'PUBLISH_COMPLETE') {
    throw new Error('TikTok publish timed out');
  }

  return {
    id: postId,
    url: `https://www.tiktok.com/@${account.platform_username}/video/${postId}`,
  };
}

export async function refreshTikTokToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`TikTok token refresh failed: ${res.status}`);
  return res.json();
}
