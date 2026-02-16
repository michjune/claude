'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useAuth } from '@/providers/AuthProvider';
import { useTrackEvent } from '@/hooks/useTrackEvent';

interface BookmarkButtonProps {
  contentId: string;
}

export function BookmarkButton({ contentId }: BookmarkButtonProps) {
  const { user } = useAuth();
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { trackEvent } = useTrackEvent(contentId);

  if (!user) return null;

  const bookmarked = isBookmarked(contentId);

  const handleClick = () => {
    if (bookmarked) {
      removeBookmark.mutate(contentId);
    } else {
      addBookmark.mutate(contentId);
      trackEvent('bookmark');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this post'}
    >
      {bookmarked ? (
        <BookmarkCheck className="h-4 w-4 text-primary" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      <span>{bookmarked ? 'Saved' : 'Save'}</span>
    </button>
  );
}
