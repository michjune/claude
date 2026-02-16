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
    // Scroll depth tracking
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const percent = Math.round((scrollTop / docHeight) * 100);
        trackScrollDepth(percent);
      }
    };

    // Time on page tracking
    const handleUnload = () => {
      if (hasTrackedUnload.current) return;
      hasTrackedUnload.current = true;
      const timeSpent = Math.round((performance.now() - startTime.current) / 1000);
      trackEvent('time_on_page', { seconds: timeSpent });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleUnload();
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [trackEvent, trackScrollDepth]);

  return null;
}
