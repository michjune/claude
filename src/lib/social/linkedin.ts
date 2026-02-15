import type { SocialAccount } from '@/lib/supabase/types';

const LINKEDIN_API = 'https://api.linkedin.com/v2';

export async function postToLinkedIn(
  account: SocialAccount,
  text: string
): Promise<{ id: string; url: string }> {
  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${account.platform_user_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`LinkedIn post failed: ${res.status} ${error}`);
  }

  const data = await res.json();
  const postId = data.id;
  return {
    id: postId,
    url: `https://www.linkedin.com/feed/update/${postId}`,
  };
}

export async function refreshLinkedInToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) throw new Error(`LinkedIn token refresh failed: ${res.status}`);
  return res.json();
}
