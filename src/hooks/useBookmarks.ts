'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useBookmarks() {
  const queryClient = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await fetch('/api/blog/bookmarks');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const addBookmark = useMutation({
    mutationFn: async (contentId: string) => {
      const res = await fetch('/api/blog/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
      });
      if (!res.ok) throw new Error('Failed to bookmark');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookmarks'] }),
  });

  const removeBookmark = useMutation({
    mutationFn: async (contentId: string) => {
      const res = await fetch('/api/blog/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
      });
      if (!res.ok) throw new Error('Failed to remove bookmark');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookmarks'] }),
  });

  const isBookmarked = (contentId: string) =>
    bookmarks.some((b: { content_id: string }) => b.content_id === contentId);

  return { bookmarks, isLoading, addBookmark, removeBookmark, isBookmarked };
}
