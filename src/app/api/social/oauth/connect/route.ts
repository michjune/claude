import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { encrypt } from '@/lib/social/oauth-crypto';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const CALLBACK_URL = `${SITE_URL}/api/social/oauth/callback`;

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

function buildTwitterAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: CALLBACK_URL,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

function buildInstagramAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: CALLBACK_URL,
    scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
    response_type: 'code',
    state,
  });
  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

function buildYouTubeAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: CALLBACK_URL,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get('platform');

  if (!platform || !['twitter', 'instagram', 'youtube'].includes(platform)) {
    return NextResponse.json(
      { error: 'Invalid platform. Use: twitter, instagram, or youtube' },
      { status: 400 }
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  const { verifier, challenge } = generatePKCE();

  // Store state + verifier in an encrypted cookie
  const cookiePayload = JSON.stringify({ state, verifier, platform });
  const encrypted = encrypt(cookiePayload);

  let authUrl: string;

  switch (platform) {
    case 'twitter':
      authUrl = buildTwitterAuthUrl(state, challenge);
      break;
    case 'instagram':
      authUrl = buildInstagramAuthUrl(state);
      break;
    case 'youtube':
      authUrl = buildYouTubeAuthUrl(state);
      break;
    default:
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('oauth_state', encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
