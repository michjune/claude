import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data: posts } = await supabase
    .from('content')
    .select('title, slug, summary, seo_description, published_at')
    .eq('content_type', 'blog_post')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  const items = (posts || [])
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <description><![CDATA[${post.summary || post.seo_description || ''}]]></description>
      <pubDate>${new Date(post.published_at!).toUTCString()}</pubDate>
      <guid isPermaLink="true">${siteUrl}/posts/${post.slug}</guid>
    </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>StemCell Pulse</title>
    <link>${siteUrl}</link>
    <description>AI-powered stem cell research summaries from high-impact journals.</description>
    <language>en</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
