import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data: posts } = await supabase
    .from('content')
    .select('title, slug, summary, seo_description, published_at, metadata')
    .eq('content_type', 'blog_post')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  const items = (posts || [])
    .map((post) => {
      const keywords = (post.metadata as Record<string, unknown>)?.keywords;
      const categoryTags = Array.isArray(keywords)
        ? keywords
            .map((kw: unknown) =>
              typeof kw === 'string' ? `\n      <category><![CDATA[${kw}]]></category>` : ''
            )
            .join('')
        : '';

      const description = post.summary || post.seo_description || '';

      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <description><![CDATA[${description}]]></description>
      <content:encoded><![CDATA[${description}]]></content:encoded>
      <dc:creator><![CDATA[StemCell Pulse]]></dc:creator>
      <pubDate>${new Date(post.published_at!).toUTCString()}</pubDate>
      <guid isPermaLink="true">${siteUrl}/posts/${post.slug}</guid>${categoryTags}
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
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
