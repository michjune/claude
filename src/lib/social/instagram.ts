import type { SocialAccount } from '@/lib/supabase/types';

const GRAPH_API = 'https://graph.facebook.com/v18.0';

export async function postToInstagram(
  account: SocialAccount,
  caption: string,
  imageUrl: string
): Promise<{ id: string; url: string }> {
  // Step 1: Create media container
  const containerRes = await fetch(
    `${GRAPH_API}/${account.platform_user_id}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: account.access_token,
      }),
    }
  );

  if (!containerRes.ok) {
    const error = await containerRes.text();
    throw new Error(`Instagram container creation failed: ${containerRes.status} ${error}`);
  }

  const { id: containerId } = await containerRes.json();

  // Step 2: Publish the container
  const publishRes = await fetch(
    `${GRAPH_API}/${account.platform_user_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: account.access_token,
      }),
    }
  );

  if (!publishRes.ok) {
    const error = await publishRes.text();
    throw new Error(`Instagram publish failed: ${publishRes.status} ${error}`);
  }

  const { id: mediaId } = await publishRes.json();
  return {
    id: mediaId,
    url: `https://www.instagram.com/p/${mediaId}`,
  };
}

export async function postReelToInstagram(
  account: SocialAccount,
  caption: string,
  videoUrl: string
): Promise<{ id: string; url: string }> {
  const containerRes = await fetch(
    `${GRAPH_API}/${account.platform_user_id}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoUrl,
        caption,
        media_type: 'REELS',
        access_token: account.access_token,
      }),
    }
  );

  if (!containerRes.ok) throw new Error(`Instagram reel container failed: ${containerRes.status}`);
  const { id: containerId } = await containerRes.json();

  // Poll until ready
  let status = 'IN_PROGRESS';
  while (status === 'IN_PROGRESS') {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `${GRAPH_API}/${containerId}?fields=status_code&access_token=${account.access_token}`
    );
    const statusData = await statusRes.json();
    status = statusData.status_code;
    if (status === 'ERROR') throw new Error('Instagram reel processing failed');
  }

  const publishRes = await fetch(
    `${GRAPH_API}/${account.platform_user_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: account.access_token }),
    }
  );

  if (!publishRes.ok) throw new Error(`Instagram reel publish failed: ${publishRes.status}`);
  const { id: mediaId } = await publishRes.json();

  return { id: mediaId, url: `https://www.instagram.com/reel/${mediaId}` };
}
