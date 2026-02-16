'use client';

import { useEffect } from 'react';

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('_sp_session');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('_sp_session', sessionId);
  }
  return sessionId;
}

function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

export function usePageView(contentId?: string) {
  useEffect(() => {
    const utm = getUtmParams();
    const payload = {
      content_id: contentId || null,
      path: window.location.pathname,
      referrer: document.referrer || null,
      utm_source: utm.utm_source || null,
      utm_medium: utm.utm_medium || null,
      utm_campaign: utm.utm_campaign || null,
      device_type: getDeviceType(),
      session_id: getSessionId(),
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/pageview', blob);
  }, [contentId]);
}
