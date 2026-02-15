import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Content } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const POSTS_PER_PAGE = 12;

interface PostsPageProps {
  searchParams: { page?: string };
}

export const metadata = {
  title: 'Blog - StemCell Pulse',
  description: 'Latest articles on stem cell research, regenerative medicine, and related breakthroughs.',
};

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10));
  const offset = (page - 1) * POSTS_PER_PAGE;

  const supabase = createServerSupabaseClient();

  const { data: posts, count } = await supabase
    .from('content')
    .select('*', { count: 'exact' })
    .eq('content_type', 'blog_post')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + POSTS_PER_PAGE - 1);

  const totalPages = count ? Math.ceil(count / POSTS_PER_PAGE) : 1;
  const typedPosts = (posts || []) as Content[];

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Latest insights from stem cell research and regenerative medicine.
        </p>
      </div>

      {typedPosts.length === 0 && (
        <p className="text-center text-muted-foreground py-20">
          No posts published yet. Check back soon.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {typedPosts.map((post) => {
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

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-10">
          {page > 1 && (
            <Link
              href={`/posts?page=${page - 1}`}
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Previous
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/posts?page=${p}`}
              className={
                p === page
                  ? 'inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium'
                  : 'inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors'
              }
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link
              href={`/posts?page=${page + 1}`}
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
