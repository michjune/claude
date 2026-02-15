import type { SocialAccount } from '@/lib/supabase/types';

const TWITTER_API = 'https://api.twitter.com/2';

export async function postTweet(
  account: SocialAccount,
  text: string
): Promise<{ id: string; url: string }> {
  const res = await fetch(`${TWITTER_API}/tweets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Twitter post failed: ${res.status} ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return {
    id: data.data.id,
    url: `https://twitter.com/${account.platform_username}/status/${data.data.id}`,
  };
}

export async function refreshTwitterToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Twitter token refresh failed: ${res.status}`);
  return res.json();
}

export async function deleteTweet(account: SocialAccount, tweetId: string): Promise<void> {
  const res = await fetch(`${TWITTER_API}/tweets/${tweetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${account.access_token}` },
  });
  if (!res.ok) throw new Error(`Twitter delete failed: ${res.status}`);
}
