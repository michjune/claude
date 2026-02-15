'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Content } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const supabase = createClient();

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        // Use textSearch on search_vector column
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .eq('content_type', 'blog_post')
          .eq('status', 'published')
          .textSearch('search_vector', trimmed, { type: 'websearch' })
          .order('published_at', { ascending: false })
          .limit(20);

        if (error) {
          // Fallback: search with ilike on title and body
          const { data: fallbackData } = await supabase
            .from('content')
            .select('*')
            .eq('content_type', 'blog_post')
            .eq('status', 'published')
            .or(`title.ilike.%${trimmed}%,body.ilike.%${trimmed}%`)
            .order('published_at', { ascending: false })
            .limit(20);

          setResults((fallbackData || []) as Content[]);
        } else {
          setResults((data || []) as Content[]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div className="container py-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Search</h1>
        <p className="mt-2 text-muted-foreground">
          Find articles on stem cell research and regenerative medicine.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No results found for &quot;{query}&quot;</p>
          <p className="text-sm mt-1">Try different keywords or check your spelling.</p>
        </div>
      )}

      <div className="space-y-4">
        {results.map((post) => {
          const keywords = (post.metadata?.keywords as string[]) || [];

          return (
            <Link key={post.id} href={`/posts/${post.slug}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  {post.summary && (
                    <CardDescription className="line-clamp-2">
                      {post.summary}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {post.published_at
                        ? format(new Date(post.published_at), 'MMMM d, yyyy')
                        : format(new Date(post.created_at), 'MMMM d, yyyy')}
                    </div>
                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {keywords.slice(0, 3).map((kw) => (
                          <Badge key={kw} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
