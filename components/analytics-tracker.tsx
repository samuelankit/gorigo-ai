'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface AnalyticsEvent {
  sessionId: string;
  visitorId: string;
  eventType: string;
  page: string;
  pageTitle: string;
  referrer: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  searchKeyword: string | null;
  deviceType: string;
  browser: string;
  os: string;
  screenWidth: number;
  screenHeight: number;
  scrollDepth: number | null;
  timeOnPage: number | null;
  elementId: string | null;
  elementText: string | null;
  timestamp: number;
}

function generateId(): string {
  const s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return s.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getVisitorId(): string {
  const key = 'gorigo_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateId();
    localStorage.setItem(key, id);
  }
  return id;
}

function getSessionId(): string {
  const key = 'gorigo_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return 'Other';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Other';
}

function extractUTMParams(): { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null } {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
    };
  } catch {
    return { utmSource: null, utmMedium: null, utmCampaign: null };
  }
}

function extractSearchKeyword(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return null;
    const url = new URL(ref);
    const host = url.hostname.toLowerCase();
    if (host.includes('google.')) return url.searchParams.get('q');
    if (host.includes('bing.')) return url.searchParams.get('q');
    if (host.includes('yahoo.')) return url.searchParams.get('p');
    if (host.includes('duckduckgo.')) return url.searchParams.get('q');
    return null;
  } catch {
    return null;
  }
}

const CONVERSION_PAGES = ['/register', '/onboarding', '/dashboard'];
const FLUSH_INTERVAL = 5000;

function useAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queueRef = useRef<AnalyticsEvent[]>([]);
  const visitorIdRef = useRef<string>('');
  const sessionIdRef = useRef<string>('');
  const pageEntryTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utmRef = useRef<{ utmSource: string | null; utmMedium: string | null; utmCampaign: string | null }>({
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
  });
  const searchKeywordRef = useRef<string | null>(null);
  const convertedPagesRef = useRef<Set<string>>(new Set());
  const prevPathnameRef = useRef<string>('');

  const createEvent = useCallback(
    (eventType: string, extra: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
      sessionId: sessionIdRef.current,
      visitorId: visitorIdRef.current,
      eventType,
      page: pathname,
      pageTitle: document.title,
      referrer: document.referrer,
      utmSource: utmRef.current.utmSource,
      utmMedium: utmRef.current.utmMedium,
      utmCampaign: utmRef.current.utmCampaign,
      searchKeyword: searchKeywordRef.current,
      deviceType: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      scrollDepth: null,
      timeOnPage: null,
      elementId: null,
      elementText: null,
      timestamp: Date.now(),
      ...extra,
    }),
    [pathname]
  );

  const enqueue = useCallback((event: AnalyticsEvent) => {
    queueRef.current.push(event);
  }, []);

  const flush = useCallback((useBeacon = false) => {
    const events = queueRef.current.splice(0);
    if (events.length === 0) return;
    const payload = JSON.stringify({ events });
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    visitorIdRef.current = getVisitorId();
    sessionIdRef.current = getSessionId();
    utmRef.current = extractUTMParams();
    searchKeywordRef.current = extractSearchKeyword();
  }, []);

  useEffect(() => {
    if (!visitorIdRef.current) return;
    if (pathname === prevPathnameRef.current) return;

    if (prevPathnameRef.current) {
      const timeOnPage = Math.round((Date.now() - pageEntryTimeRef.current) / 1000);
      if (timeOnPage > 0) {
        enqueue(createEvent('time_on_page', { page: prevPathnameRef.current, timeOnPage }));
      }
    }

    prevPathnameRef.current = pathname;
    pageEntryTimeRef.current = Date.now();
    scrollDepthRef.current = 0;

    enqueue(createEvent('pageview'));

    if (CONVERSION_PAGES.some((p) => pathname.startsWith(p)) && !convertedPagesRef.current.has(pathname)) {
      convertedPagesRef.current.add(pathname);
      enqueue(createEvent('conversion'));
    }
  }, [pathname, searchParams, createEvent, enqueue]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) return;
      const depth = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      if (depth > scrollDepthRef.current) {
        scrollDepthRef.current = depth;
      }
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        if (scrollDepthRef.current > 0) {
          enqueue(createEvent('scroll_depth', { scrollDepth: scrollDepthRef.current }));
        }
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [createEvent, enqueue]);

  useEffect(() => {
    const sanitizeText = (raw: string): string => {
      const clean = raw.trim().slice(0, 50);
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phonePattern = /\+?\d[\d\s\-()]{6,}/g;
      return clean.replace(emailPattern, '[redacted]').replace(phonePattern, '[redacted]');
    };

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-testid]');
      if (!target) return;
      const testId = target.getAttribute('data-testid');
      const tagName = (target as HTMLElement).tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return;
      const text = sanitizeText(target.textContent || '');
      enqueue(createEvent('click', { elementId: testId, elementText: text || null }));
    };

    document.addEventListener('click', handleClick, { passive: true, capture: true });
    return () => document.removeEventListener('click', handleClick, true);
  }, [createEvent, enqueue]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const timeOnPage = Math.round((Date.now() - pageEntryTimeRef.current) / 1000);
        if (timeOnPage > 0) {
          enqueue(createEvent('time_on_page', { timeOnPage }));
        }
        flush(true);
      }
    };

    const handleBeforeUnload = () => {
      const timeOnPage = Math.round((Date.now() - pageEntryTimeRef.current) / 1000);
      if (timeOnPage > 0) {
        enqueue(createEvent('time_on_page', { timeOnPage }));
      }
      flush(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [createEvent, enqueue, flush]);

  useEffect(() => {
    flushTimerRef.current = setInterval(() => flush(false), FLUSH_INTERVAL);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flush(true);
    };
  }, [flush]);
}

export function AnalyticsTracker() {
  useAnalyticsTracker();
  return null;
}
