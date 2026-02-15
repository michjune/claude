import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';

interface UnsplashPhoto {
  urls: { regular: string; small: string };
  user: { name: string; links: { html: string } };
}

interface BlogImageResult {
  og_image_url: string;
  unsplash_author?: string;
  unsplash_author_url?: string;
}

export async function fetchUnsplashPhoto(query: string): Promise<UnsplashPhoto | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.results?.[0] || null;
  } catch {
    return null;
  }
}

export async function generateCardImage(
  title: string,
  backgroundUrl?: string
): Promise<Buffer> {
  const response = new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background */}
        {backgroundUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backgroundUrl}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '1200px',
                height: '630px',
                objectFit: 'cover',
              }}
            />
            {/* Dark gradient overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '1200px',
                height: '630px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%)',
              }}
            />
          </>
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1200px',
              height: '630px',
              background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)',
            }}
          />
        )}

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '60px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            SP
          </div>
          <span style={{ color: 'white', fontSize: '20px', fontWeight: 600, opacity: 0.9 }}>
            StemCell Pulse
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <span
            style={{
              color: '#10b981',
              fontSize: '16px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            Research Spotlight
          </span>
          <h1
            style={{
              color: 'white',
              fontSize: title.length > 80 ? '36px' : '44px',
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              maxWidth: '1000px',
            }}
          >
            {title.length > 120 ? title.slice(0, 117) + '...' : title}
          </h1>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadToSupabaseStorage(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from('blog-images')
    .upload(fileName, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from('blog-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function generateBlogImage(
  title: string,
  keywords: string[],
  slug: string
): Promise<BlogImageResult> {
  // Build search query from keywords
  const searchQuery = keywords.length > 0
    ? `${keywords.slice(0, 3).join(' ')} science research`
    : 'stem cell science research laboratory';

  // Try to get an Unsplash photo
  const photo = await fetchUnsplashPhoto(searchQuery);

  // Generate the card image
  const imageBuffer = await generateCardImage(
    title,
    photo?.urls.regular
  );

  // Upload to Supabase Storage
  const fileName = `${slug}-${Date.now()}.png`;
  const og_image_url = await uploadToSupabaseStorage(imageBuffer, fileName);

  return {
    og_image_url,
    ...(photo && {
      unsplash_author: photo.user.name,
      unsplash_author_url: photo.user.links.html,
    }),
  };
}
