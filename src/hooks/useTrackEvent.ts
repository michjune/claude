'use client';

import { useCallback, useRef } from 'react';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('_sp_session');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('_sp_session', sessionId);
  }
  return sessionId;
}

export function useTrackEvent(contentId?: string) {
  const firedScrollDepths = useRef(new Set<number>());

  const trackEvent = useCallback(
    (eventType: string, eventData: Record<string, unknown> = {}) => {
      const payload = {
        content_id: contentId || null,
        event_type: eventType,
        event_data: eventData,
        session_id: getSessionId(),
      };

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/event', blob);
    },
    [contentId]
  );

  const trackScrollDepth = useCallback(
    (depth: number) => {
      const thresholds = [25, 50, 75, 100];
      for (const t of thresholds) {
        if (depth >= t && !firedScrollDepths.current.has(t)) {
          firedScrollDepths.current.add(t);
          trackEvent(`scroll_${t}`, { depth: t });
        }
      }
    },
    [trackEvent]
  );

  return { trackEvent, trackScrollDepth };
}
