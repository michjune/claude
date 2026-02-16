import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Content, Paper } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd, CollectionPageJsonLd } from '@/components/seo/JsonLd';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stemcellpulse.com';

interface TopicPageProps {
  params: Promise<{ topic: string }>;
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { topic: topicParam } = await params;
  const topic = decodeURIComponent(topicParam).replace(/-/g, ' ');
  const capitalized = topic
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const topicUrl = `${BASE_URL}/topics/${topicParam}`;

  return {
    title: `${capitalized} - StemCell Pulse`,
    description: `Articles about ${topic} in stem cell research and regenerative medicine.`,
    openGraph: {
      title: `${capitalized} - StemCell Pulse`,
      description: `Articles about ${topic} in stem cell research and regenerative medicine.`,
      type: 'website',
      url: topicUrl,
    },
    alternates: {
      canonical: topicUrl,
    },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic: topicParam } = await params;
  const topic = decodeURIComponent(topicParam).replace(/-/g, ' ');
  const capitalized = topic
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const supabase = await createServerSupabaseClient();

  // Fetch blog posts where metadata keywords contain the topic, or body mentions it
  const { data: posts } = await supabase
    .from('content')
    .select('*, papers(keywords)')
    .eq('content_type', 'blog_post')
    .eq('status', 'published')
    .or(`body.ilike.%${topic}%,title.ilike.%${topic}%`)
    .order('published_at', { ascending: false })
    .limit(30);

  // Also fetch posts whose linked paper keywords contain the topic
  const { data: paperPosts } = await supabase
    .from('content')
    .select('*, papers!inner(keywords)')
    .eq('content_type', 'blog_post')
    .eq('status', 'published')
    .ilike('papers.keywords', `%${topic}%`)
    .order('published_at', { ascending: false })
    .limit(30);

  // Merge and deduplicate
  const allPosts = [...(posts || []), ...(paperPosts || [])] as (Content & {
    papers: Pick<Paper, 'keywords'> | null;
  })[];
  const seen = new Set<string>();
  const uniquePosts = allPosts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const topicUrl = `${BASE_URL}/topics/${topicParam}`;

  return (
    <div className="container py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Blog', url: `${BASE_URL}/posts` },
          { name: capitalized, url: topicUrl },
        ]}
      />
      <CollectionPageJsonLd
        name={`${capitalized} - StemCell Pulse`}
        description={`Articles about ${topic} in stem cell research and regenerative medicine.`}
        url={topicUrl}
      />

      <Link
        href="/posts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">{capitalized}</h1>
        </div>
        <p className="text-muted-foreground">
          {uniquePosts.length} article{uniquePosts.length !== 1 ? 's' : ''} on this topic.
        </p>
      </div>

      {uniquePosts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No articles found for this topic.</p>
          <p className="text-sm mt-1">Try browsing other topics or searching.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uniquePosts.map((post) => {
          const keywords = (post.metadata?.keywords as string[]) || [];

          return (
            <Link key={post.id} href={`/posts/${post.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg leading-snug line-clamp-2">
                    {post.title}
                  </CardTitle>
                  {post.summary && (
                    <CardDescription className="line-clamp-3">
                      {post.summary}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Calendar className="h-3 w-3" />
                    {post.published_at
                      ? format(new Date(post.published_at), 'MMMM d, yyyy')
                      : format(new Date(post.created_at), 'MMMM d, yyyy')}
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.slice(0, 4).map((keyword) => (
                        <Badge key={keyword} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
