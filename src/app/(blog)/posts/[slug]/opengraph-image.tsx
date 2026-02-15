import { ImageResponse } from 'next/og';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export const alt = 'StemCell Pulse blog post';

export default async function OGImage({ params }: { params: { slug: string } }) {
  // Try to redirect to stored OG image
  const supabase = createServerSupabaseClient();
  const { data: post } = await supabase
    .from('content')
    .select('og_image_url, title')
    .eq('slug', params.slug)
    .eq('content_type', 'blog_post')
    .single();

  // If we have a stored OG image, fetch and return it
  if (post?.og_image_url) {
    try {
      const res = await fetch(post.og_image_url);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return new Response(buffer, {
          headers: { 'Content-Type': 'image/png' },
        });
      }
    } catch {
      // Fall through to generated image
    }
  }

  // Fallback: generate on-the-fly
  const title = post?.title || params.slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
            fontSize: '24px',
            fontWeight: 700,
          }}
        >
          StemCell Pulse
        </div>

        <div
          style={{
            fontSize: title.length > 60 ? '40px' : '52px',
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: '900px',
            display: 'flex',
          }}
        >
          {title}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '60px',
            fontSize: '16px',
            opacity: 0.6,
            display: 'flex',
          }}
        >
          stemcellpulse.com
        </div>
      </div>
    ),
    { ...size }
  );
}
