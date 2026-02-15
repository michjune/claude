import type { SocialAccount } from '@/lib/supabase/types';

const GRAPH_API = 'https://graph.facebook.com/v18.0';

export async function postToFacebook(
  account: SocialAccount,
  message: string,
  link?: string
): Promise<{ id: string; url: string }> {
  const body: Record<string, string> = {
    message,
    access_token: account.access_token,
  };
  if (link) body.link = link;

  const res = await fetch(`${GRAPH_API}/${account.platform_user_id}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Facebook post failed: ${res.status} ${error}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    url: `https://www.facebook.com/${data.id}`,
  };
}

export async function postVideoToFacebook(
  account: SocialAccount,
  description: string,
  videoUrl: string
): Promise<{ id: string; url: string }> {
  const res = await fetch(`${GRAPH_API}/${account.platform_user_id}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_url: videoUrl,
      description,
      access_token: account.access_token,
    }),
  });

  if (!res.ok) throw new Error(`Facebook video post failed: ${res.status}`);
  const data = await res.json();
  return { id: data.id, url: `https://www.facebook.com/${data.id}` };
}
