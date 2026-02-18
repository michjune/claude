import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Content, Paper } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, ArrowLeft, Tag, ExternalLink } from 'lucide-react';
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
    description: `Research and articles about ${topic} in stem cell research and regenerative medicine.`,
    openGraph: {
      title: `${capitalized} - StemCell Pulse`,
      description: `Research and articles about ${topic} in stem cell research and regenerative medicine.`,
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
  const adminClient = createAdminClient();

  // Fetch blog posts matching the topic
  const [{ data: posts }, { data: paperPosts }] = await Promise.all([
    supabase
      .from('content')
      .select('*, papers(keywords)')
      .eq('content_type', 'blog_post')
      .eq('status', 'published')
      .or(`body.ilike.%${topic}%,title.ilike.%${topic}%`)
      .order('published_at', { ascending: false })
      .limit(30),
    supabase
      .from('content')
      .select('*, papers!inner(keywords)')
      .eq('content_type', 'blog_post')
      .eq('status', 'published')
      .ilike('papers.keywords', `%${topic}%`)
      .order('published_at', { ascending: false })
      .limit(30),
  ]);

  // Merge and deduplicate blog posts
  const allPosts = [...(posts || []), ...(paperPosts || [])] as (Content & {
    papers: Pick<Paper, 'keywords'> | null;
  })[];
  const seenPosts = new Set<string>();
  const uniquePosts = allPosts.filter((p) => {
    if (seenPosts.has(p.id)) return false;
    seenPosts.add(p.id);
    return true;
  });

  // Fetch papers matching the topic
  const { data: papers } = await adminClient
    .from('papers')
    .select('id, title, journal_name, published_date, key_finding, abstract, doi, source_url, keywords')
    .or(`title.ilike.%${topic}%,abstract.ilike.%${topic}%`)
    .order('published_date', { ascending: false })
    .limit(30);

  const totalCount = uniquePosts.length + (papers?.length || 0);
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
        description={`Research and articles about ${topic} in stem cell research and regenerative medicine.`}
        url={topicUrl}
      />

      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">{capitalized}</h1>
        </div>
        <p className="text-muted-foreground">
          {totalCount} result{totalCount !== 1 ? 's' : ''} on this topic.
        </p>
      </div>

      {totalCount === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No results found for this topic yet.</p>
          <p className="text-sm mt-1">New papers are indexed daily. Check back soon.</p>
        </div>
      )}

      {/* Blog Posts */}
      {uniquePosts.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Articles</h2>
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
                        <CardDescription className="line-clamp-2">
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
      )}

      {/* Research Papers */}
      {papers && papers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Research Papers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {papers.map((paper) => (
              <Link key={paper.id} href={`/research/${paper.id}`}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardContent className="pt-5">
                    {paper.journal_name && (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                        {paper.journal_name}
                      </span>
                    )}
                    <h3 className="text-[15px] font-semibold leading-snug mt-1 line-clamp-2">
                      {paper.title}
                    </h3>
                    {(paper.key_finding || paper.abstract) && (
                      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                        {paper.key_finding || paper.abstract}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      {paper.published_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(paper.published_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {paper.doi && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          DOI <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
