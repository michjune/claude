'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Bookmark, Content } from '@/lib/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Bookmark as BookmarkIcon, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

type BookmarkWithContent = Bookmark & {
  content: Pick<Content, 'title' | 'slug' | 'summary' | 'content_type'> | null;
};

export default function BookmarksPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const {
    data: bookmarks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-bookmarks'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bookmarks')
        .select('*, content(title, slug, summary, content_type)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BookmarkWithContent[];
    },
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: async (bookmarkId: string) => {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookmarks'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>
        <p className="text-muted-foreground mt-1">Your saved articles and posts.</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              {(error as Error).message === 'Not authenticated'
                ? 'Please sign in to view your bookmarks.'
                : `Failed to load bookmarks: ${(error as Error).message}`}
            </p>
          </CardContent>
        </Card>
      )}

      {bookmarks && bookmarks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookmarkIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>You haven&apos;t bookmarked any posts yet.</p>
            <Link
              href="/posts"
              className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
            >
              Browse posts <ExternalLink className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      )}

      {bookmarks && bookmarks.length > 0 && (
        <div className="space-y-3">
          {bookmarks.map((bookmark) => {
            const post = bookmark.content;
            const postUrl = post?.slug ? `/posts/${post.slug}` : '#';

            return (
              <Card key={bookmark.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-start justify-between py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={postUrl}
                      className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                    >
                      {post?.title || 'Untitled post'}
                    </Link>
                    {post?.summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {post.summary}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Bookmarked {format(new Date(bookmark.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <button
                    onClick={() => removeBookmarkMutation.mutate(bookmark.id)}
                    disabled={removeBookmarkMutation.isPending}
                    className="shrink-0 p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                    title="Remove bookmark"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
