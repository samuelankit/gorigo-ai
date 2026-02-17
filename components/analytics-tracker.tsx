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

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const CONVERSION_PAGES = ['/register', '/onboarding', '/dashboard'];
const FLUSH_INTERVAL = 5000;
const MAX_QUEUE_SIZE = 500;
const MAX_TIME_ON_PAGE_SECONDS = 1800;
const RETRY_KEY = 'gorigo_retry_queue';
const CONSENT_KEY = 'gorigo_analytics_consent';

const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /Googlebot/i, /Bingbot/i, /Baiduspider/i, /YandexBot/i,
  /DuckDuckBot/i, /facebookexternalhit/i, /Twitterbot/i,
  /LinkedInBot/i, /WhatsApp/i, /Applebot/i, /AhrefsBot/i,
  /SemrushBot/i, /MJ12bot/i, /DotBot/i, /PetalBot/i,
  /HeadlessChrome/i, /PhantomJS/i, /Puppeteer/i, /Selenium/i,
  /lighthouse/i, /GTmetrix/i, /PageSpeed/i,
];

function isBot(): boolean {
  const ua = navigator.userAgent;
  if (!ua) return true;
  if (BOT_PATTERNS.some((p) => p.test(ua))) return true;
  if (navigator.webdriver) return true;
  return false;
}

function isDNTEnabled(): boolean {
  return navigator.doNotTrack === '1' || (window as any).doNotTrack === '1';
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

export function grantAnalyticsConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'granted');
  } catch {}
}

export function revokeAnalyticsConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem('gorigo_vid');
    sessionStorage.removeItem('gorigo_sid');
    sessionStorage.removeItem('gorigo_sid_ts');
  } catch {}
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
  const key = 'gorigo_vid';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = generateId();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

function getSessionId(): string {
  const sessionKey = 'gorigo_sid';
  const tsKey = 'gorigo_sid_ts';
  const now = Date.now();

  try {
    const existingId = sessionStorage.getItem(sessionKey);
    const lastActivity = sessionStorage.getItem(tsKey);

    if (existingId && lastActivity) {
      const elapsed = now - Number(lastActivity);
      if (elapsed < SESSION_TIMEOUT_MS) {
        sessionStorage.setItem(tsKey, String(now));
        return existingId;
      }
    }

    const newId = generateId();
    sessionStorage.setItem(sessionKey, newId);
    sessionStorage.setItem(tsKey, String(now));
    return newId;
  } catch {
    return generateId();
  }
}

function touchSession(): void {
  try {
    sessionStorage.setItem('gorigo_sid_ts', String(Date.now()));
  } catch {}
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
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

function normalizeReferrer(ref: string): string {
  if (!ref) return '';
  try {
    const url = new URL(ref);
    let host = url.hostname.toLowerCase().replace(/^www\./, '');
    const domainMap: Record<string, string> = {
      'google': 'Google', 'bing': 'Bing', 'yahoo': 'Yahoo',
      'duckduckgo': 'DuckDuckGo', 'baidu': 'Baidu', 'yandex': 'Yandex',
      'facebook': 'Facebook', 'instagram': 'Instagram', 'twitter': 'Twitter',
      'x': 'Twitter', 'linkedin': 'LinkedIn', 'reddit': 'Reddit',
      'youtube': 'YouTube', 'tiktok': 'TikTok', 'pinterest': 'Pinterest',
    };
    for (const [key, label] of Object.entries(domainMap)) {
      if (host.includes(key)) return label;
    }
    return host;
  } catch {
    return ref;
  }
}

function sanitizeText(raw: string): string {
  const clean = raw.trim().slice(0, 50);
  return clean
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted]')
    .replace(/\+?\d[\d\s\-()]{6,}/g, '[redacted]');
}

function saveRetryQueue(events: AnalyticsEvent[]): void {
  try {
    const existing = JSON.parse(localStorage.getItem(RETRY_KEY) || '[]');
    const combined = [...existing, ...events].slice(-200);
    localStorage.setItem(RETRY_KEY, JSON.stringify(combined));
  } catch {}
}

function loadAndClearRetryQueue(): AnalyticsEvent[] {
  try {
    const data = localStorage.getItem(RETRY_KEY);
    if (!data) return [];
    localStorage.removeItem(RETRY_KEY);
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function useAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queueRef = useRef<AnalyticsEvent[]>([]);
  const visitorIdRef = useRef<string>('');
  const sessionIdRef = useRef<string>('');
  const pageEntryTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);
  const scrollSentRef = useRef<boolean>(false);
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
  const isBotRef = useRef<boolean>(false);
  const isBlockedRef = useRef<boolean>(false);

  const createEvent = useCallback(
    (eventType: string, extra: Partial<AnalyticsEvent> = {}): AnalyticsEvent => {
      sessionIdRef.current = getSessionId();
      touchSession();
      return {
        sessionId: sessionIdRef.current,
        visitorId: visitorIdRef.current,
        eventType,
        page: pathname,
        pageTitle: document.title,
        referrer: normalizeReferrer(document.referrer),
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
      };
    },
    [pathname]
  );

  const enqueue = useCallback((event: AnalyticsEvent) => {
    if (isBlockedRef.current) return;
    if (queueRef.current.length >= MAX_QUEUE_SIZE) return;
    queueRef.current.push(event);
  }, []);

  const flush = useCallback((useBeacon = false) => {
    const events = queueRef.current.splice(0);
    if (events.length === 0) return;
    const batchId = generateId();
    const payload = JSON.stringify({ events, batchId });
    try {
      if (useBeacon && navigator.sendBeacon) {
        const sent = navigator.sendBeacon('/api/analytics/track', new Blob([payload], { type: 'application/json' }));
        if (!sent) saveRetryQueue(events);
      } else {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).then((res) => {
          if (res.status === 401) {
            window.location.href = '/login';
          }
        }).catch(() => {
          saveRetryQueue(events);
        });
      }
    } catch {
      saveRetryQueue(events);
    }
  }, []);

  useEffect(() => {
    if (isBot()) {
      isBotRef.current = true;
      isBlockedRef.current = true;
      return;
    }
    if (isDNTEnabled()) {
      isBlockedRef.current = true;
      return;
    }
    if (!hasConsent()) {
      isBlockedRef.current = true;
      return;
    }
    visitorIdRef.current = getVisitorId();
    sessionIdRef.current = getSessionId();
    utmRef.current = extractUTMParams();
    searchKeywordRef.current = extractSearchKeyword();

    const retryEvents = loadAndClearRetryQueue();
    if (retryEvents.length > 0) {
      queueRef.current.push(...retryEvents.slice(0, MAX_QUEUE_SIZE));
    }
  }, []);

  useEffect(() => {
    if (isBlockedRef.current) return;
    if (!visitorIdRef.current) return;
    if (pathname === prevPathnameRef.current) return;

    if (prevPathnameRef.current) {
      const rawTime = Math.round((Date.now() - pageEntryTimeRef.current) / 1000);
      const timeOnPage = Math.min(rawTime, MAX_TIME_ON_PAGE_SECONDS);
      if (timeOnPage > 0) {
        enqueue(createEvent('time_on_page', { page: prevPathnameRef.current, timeOnPage }));
      }
      if (scrollDepthRef.current > 0 && !scrollSentRef.current) {
        enqueue(createEvent('scroll_depth', { page: prevPathnameRef.current, scrollDepth: scrollDepthRef.current }));
      }
    }

    prevPathnameRef.current = pathname;
    pageEntryTimeRef.current = Date.now();
    scrollDepthRef.current = 0;
    scrollSentRef.current = false;

    const freshUtm = extractUTMParams();
    if (freshUtm.utmSource || freshUtm.utmMedium || freshUtm.utmCampaign) {
      utmRef.current = freshUtm;
    }
    searchKeywordRef.current = extractSearchKeyword();

    enqueue(createEvent('pageview'));

    if (CONVERSION_PAGES.some((p) => pathname.startsWith(p)) && !convertedPagesRef.current.has(pathname)) {
      convertedPagesRef.current.add(pathname);
      enqueue(createEvent('conversion'));
    }
  }, [pathname, searchParams, createEvent, enqueue]);

  useEffect(() => {
    if (isBlockedRef.current) return;
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) return;
      const depth = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      if (depth > scrollDepthRef.current) {
        scrollDepthRef.current = depth;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [createEvent, enqueue]);

  useEffect(() => {
    if (isBlockedRef.current) return;
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
    if (isBlockedRef.current) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const rawTime = Math.round((Date.now() - pageEntryTimeRef.current) / 1000);
        const timeOnPage = Math.min(rawTime, MAX_TIME_ON_PAGE_SECONDS);
        if (timeOnPage > 0) {
          enqueue(createEvent('time_on_page', { timeOnPage }));
        }
        if (scrollDepthRef.current > 0 && !scrollSentRef.current) {
          enqueue(createEvent('scroll_depth', { scrollDepth: scrollDepthRef.current }));
          scrollSentRef.current = true;
        }
        flush(true);
      }
    };

    const handleBeforeUnload = () => {
      const rawTime = Math.round((Date.now() - pageEntryTimeRef.current) / 1000);
      const timeOnPage = Math.min(rawTime, MAX_TIME_ON_PAGE_SECONDS);
      if (timeOnPage > 0) {
        enqueue(createEvent('time_on_page', { timeOnPage }));
      }
      if (scrollDepthRef.current > 0 && !scrollSentRef.current) {
        enqueue(createEvent('scroll_depth', { scrollDepth: scrollDepthRef.current }));
        scrollSentRef.current = true;
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
    if (isBlockedRef.current) return;
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
