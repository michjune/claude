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
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term']) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

interface SearchReferrer {
  engine: string;
  query: string;
}

function extractSearchQuery(referrer: string): SearchReferrer | null {
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();
    const params = url.searchParams;

    // Google (rarely has query, but check anyway)
    if (hostname.includes('google.')) {
      const q = params.get('q');
      if (q) return { engine: 'google', query: q };
      return null;
    }

    // Bing
    if (hostname.includes('bing.com')) {
      const q = params.get('q');
      if (q) return { engine: 'bing', query: q };
      return null;
    }

    // DuckDuckGo
    if (hostname.includes('duckduckgo.com')) {
      const q = params.get('q');
      if (q) return { engine: 'duckduckgo', query: q };
      return null;
    }

    // Yahoo
    if (hostname.includes('yahoo.com') || hostname.includes('search.yahoo.')) {
      const p = params.get('p');
      if (p) return { engine: 'yahoo', query: p };
      return null;
    }

    // Yandex
    if (hostname.includes('yandex.')) {
      const text = params.get('text');
      if (text) return { engine: 'yandex', query: text };
      return null;
    }

    // Baidu
    if (hostname.includes('baidu.com')) {
      const wd = params.get('wd');
      if (wd) return { engine: 'baidu', query: wd };
      return null;
    }

    // Ecosia
    if (hostname.includes('ecosia.org')) {
      const q = params.get('q');
      if (q) return { engine: 'ecosia', query: q };
      return null;
    }
  } catch {
    return null;
  }

  return null;
}

export function usePageView(contentId?: string) {
  useEffect(() => {
    const utm = getUtmParams();
    const referrer = document.referrer || null;
    const sessionId = getSessionId();
    const path = window.location.pathname;

    const payload = {
      content_id: contentId || null,
      path,
      referrer,
      utm_source: utm.utm_source || null,
      utm_medium: utm.utm_medium || null,
      utm_campaign: utm.utm_campaign || null,
      device_type: getDeviceType(),
      session_id: sessionId,
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/pageview', blob);

    // Track search engine referrer query if present
    const searchRef = extractSearchQuery(referrer || '');
    if (searchRef) {
      const searchPayload = {
        content_id: contentId || null,
        event_type: 'search_referrer',
        event_data: {
          query: searchRef.query,
          engine: searchRef.engine,
          landing_path: path,
        },
        session_id: sessionId,
      };
      const searchBlob = new Blob([JSON.stringify(searchPayload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/event', searchBlob);
    }

    // Track utm_term as a search query too (often used by paid search)
    if (utm.utm_term) {
      const utmPayload = {
        content_id: contentId || null,
        event_type: 'search_referrer',
        event_data: {
          query: utm.utm_term,
          engine: utm.utm_source || 'paid',
          landing_path: path,
          source: 'utm_term',
        },
        session_id: sessionId,
      };
      const utmBlob = new Blob([JSON.stringify(utmPayload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/event', utmBlob);
    }
  }, [contentId]);
}
