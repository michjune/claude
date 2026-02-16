'use client';

import { useEffect, useRef } from 'react';
import { usePageView } from '@/hooks/usePageView';
import { useTrackEvent } from '@/hooks/useTrackEvent';

interface PostAnalyticsProps {
  contentId: string;
}

export function PostAnalytics({ contentId }: PostAnalyticsProps) {
  usePageView(contentId);
  const { trackEvent, trackScrollDepth } = useTrackEvent(contentId);
  const startTime = useRef(performance.now());
  const hasTrackedUnload = useRef(false);

  useEffect(() => {
    // Scroll depth tracking (debounced)
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          const percent = Math.round((scrollTop / docHeight) * 100);
          trackScrollDepth(percent);
        }
      }, 150);
    };

    // Time on page tracking
    const handleUnload = () => {
      if (hasTrackedUnload.current) return;
      hasTrackedUnload.current = true;
      const timeSpent = Math.round((performance.now() - startTime.current) / 1000);
      trackEvent('time_on_page', { seconds: timeSpent });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleUnload();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [trackEvent, trackScrollDepth]);

  return null;
}
