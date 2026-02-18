import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/social/oauth-crypto';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const CALLBACK_URL = `${SITE_URL}/api/social/oauth/callback`;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

// --- Twitter ---

async function exchangeTwitterCode(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: CALLBACK_URL,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Twitter token exchange failed: ${res.status} ${error}`);
  }
  return res.json();
}

async function fetchTwitterProfile(
  accessToken: string
): Promise<{ id: string; username: string }> {
  const res = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Twitter profile fetch failed: ${res.status}`);
  const { data } = await res.json();
  return { id: data.id, username: data.username };
}

// --- Instagram (via Facebook) ---

async function exchangeInstagramCode(code: string): Promise<TokenResponse> {
  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: CALLBACK_URL,
        code,
      }).toString()
  );

  if (!tokenRes.ok) {
    const error = await tokenRes.text();
    throw new Error(`Facebook token exchange failed: ${tokenRes.status} ${error}`);
  }

  const shortLived = await tokenRes.json();

  // Step 2: Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        fb_exchange_token: shortLived.access_token,
      }).toString()
  );

  if (!longRes.ok) {
    const error = await longRes.text();
    throw new Error(`Facebook long-lived token exchange failed: ${longRes.status} ${error}`);
  }

  const longLived = await longRes.json();
  return {
    access_token: longLived.access_token,
    expires_in: longLived.expires_in || 5184000, // 60 days default
  };
}

async function fetchInstagramProfile(
  accessToken: string
): Promise<{ id: string; username: string }> {
  // Get Facebook Pages the user manages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
  );
  if (!pagesRes.ok) throw new Error(`Facebook pages fetch failed: ${pagesRes.status}`);
  const pages = await pagesRes.json();

  if (!pages.data || pages.data.length === 0) {
    throw new Error('No Facebook Pages found. Instagram Business accounts require a linked Facebook Page.');
  }

  // Use the first page that has an Instagram Business Account
  for (const page of pages.data) {
    const igRes = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
    );
    if (!igRes.ok) continue;
    const igData = await igRes.json();

    if (igData.instagram_business_account) {
      const igId = igData.instagram_business_account.id;

      // Get Instagram username
      const profileRes = await fetch(
        `https://graph.facebook.com/v18.0/${igId}?fields=username&access_token=${accessToken}`
      );
      const profile = await profileRes.json();

      return { id: igId, username: profile.username || page.name };
    }
  }

  throw new Error('No Instagram Business Account found on any connected Facebook Page.');
}

// --- YouTube ---

async function exchangeYouTubeCode(code: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: CALLBACK_URL,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`YouTube token exchange failed: ${res.status} ${error}`);
  }
  return res.json();
}

async function fetchYouTubeProfile(
  accessToken: string
): Promise<{ id: string; username: string }> {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`YouTube profile fetch failed: ${res.status}`);
  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('No YouTube channel found for this account.');
  }

  const channel = data.items[0];
  return {
    id: channel.id,
    username: channel.snippet.customUrl?.replace('@', '') || channel.snippet.title,
  };
}

// --- Main callback handler ---

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    const desc = searchParams.get('error_description') || error;
    return NextResponse.redirect(
      `${SITE_URL}/admin/social?error=${encodeURIComponent(desc)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}/admin/social?error=${encodeURIComponent('Missing code or state parameter')}`
    );
  }

  // Read and validate state cookie
  const encryptedCookie = request.cookies.get('oauth_state')?.value;
  if (!encryptedCookie) {
    return NextResponse.redirect(
      `${SITE_URL}/admin/social?error=${encodeURIComponent('OAuth session expired. Please try again.')}`
    );
  }

  let cookieData: { state: string; verifier: string; platform: string };
  try {
    cookieData = JSON.parse(decrypt(encryptedCookie));
  } catch {
    return NextResponse.redirect(
      `${SITE_URL}/admin/social?error=${encodeURIComponent('Invalid OAuth session. Please try again.')}`
    );
  }

  if (cookieData.state !== state) {
    return NextResponse.redirect(
      `${SITE_URL}/admin/social?error=${encodeURIComponent('State mismatch. Possible CSRF attack.')}`
    );
  }

  const platform = cookieData.platform;

  try {
    let tokens: TokenResponse;
    let profile: { id: string; username: string };

    switch (platform) {
      case 'twitter': {
        tokens = await exchangeTwitterCode(code, cookieData.verifier);
        profile = await fetchTwitterProfile(tokens.access_token);
        break;
      }
      case 'instagram': {
        tokens = await exchangeInstagramCode(code);
        profile = await fetchInstagramProfile(tokens.access_token);
        break;
      }
      case 'youtube': {
        tokens = await exchangeYouTubeCode(code);
        profile = await fetchYouTubeProfile(tokens.access_token);
        break;
      }
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Upsert into social_accounts
    const supabase = createAdminClient();

    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error: upsertError } = await supabase
      .from('social_accounts')
      .upsert(
        {
          platform: platform as 'twitter' | 'instagram' | 'youtube',
          platform_user_id: profile.id,
          platform_username: profile.username,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          user_id: 'system', // Admin-level connection
        },
        { onConflict: 'platform,platform_user_id' }
      );

    if (upsertError) {
      throw new Error(`Failed to save account: ${upsertError.message}`);
    }

    // Clear the OAuth cookie
    const response = NextResponse.redirect(
      `${SITE_URL}/admin/social?connected=${platform}`
    );
    response.cookies.delete('oauth_state');
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`OAuth callback error (${platform}):`, message);
    return NextResponse.redirect(
      `${SITE_URL}/admin/social?error=${encodeURIComponent(message)}`
    );
  }
}
