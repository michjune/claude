import type { SocialAccount } from '@/lib/supabase/types';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3';

export async function uploadToYouTube(
  account: SocialAccount,
  title: string,
  description: string,
  videoBuffer: Buffer,
  tags: string[] = []
): Promise<{ id: string; url: string }> {
  // Step 1: Initialize resumable upload
  const initRes = await fetch(
    `${YOUTUBE_UPLOAD}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': videoBuffer.length.toString(),
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          tags,
          categoryId: '28', // Science & Technology
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const error = await initRes.text();
    throw new Error(`YouTube upload init failed: ${initRes.status} ${error}`);
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube did not return upload URL');

  // Step 2: Upload the video
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': videoBuffer.length.toString(),
    },
    body: new Uint8Array(videoBuffer),
  });

  if (!uploadRes.ok) throw new Error(`YouTube upload failed: ${uploadRes.status}`);

  const data = await uploadRes.json();
  return {
    id: data.id,
    url: `https://www.youtube.com/watch?v=${data.id}`,
  };
}

export async function uploadYouTubeShort(
  account: SocialAccount,
  title: string,
  description: string,
  videoBuffer: Buffer,
  tags: string[] = []
): Promise<{ id: string; url: string }> {
  // Shorts are uploaded the same way, just with #Shorts in title
  const shortsTitle = title.includes('#Shorts') ? title : `${title} #Shorts`;
  return uploadToYouTube(account, shortsTitle, description, videoBuffer, tags);
}

export async function refreshYouTubeToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`YouTube token refresh failed: ${res.status}`);
  return res.json();
}
