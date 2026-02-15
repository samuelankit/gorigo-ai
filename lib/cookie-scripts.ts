const CONSENT_KEY = "gorigo_cookie_consent";

interface ConsentState {
  level: "essential" | "analytics" | "all";
  version: string;
  timestamp: string;
}

export function getConsentState(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  const consent = getConsentState();
  if (!consent) return false;
  return consent.level === "analytics" || consent.level === "all";
}

export function hasMarketingConsent(): boolean {
  const consent = getConsentState();
  if (!consent) return false;
  return consent.level === "all";
}

export function loadScript(src: string, attrs?: Record<string, string>): void {
  if (typeof document === "undefined") return;

  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) return;

  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      script.setAttribute(key, value);
    }
  }
  document.head.appendChild(script);
}

export function loadConsentedScripts(): void {
  if (hasAnalyticsConsent()) {
    // placeholder: load analytics scripts when configured
    // example: loadScript("https://www.googletagmanager.com/gtag/js?id=GA_ID");
  }

  if (hasMarketingConsent()) {
    // placeholder: load marketing scripts when configured
  }
}

export function removeNonEssentialScripts(): void {
  if (typeof document === "undefined") return;
  const scripts = document.querySelectorAll("script[data-consent]");
  scripts.forEach((script) => script.remove());
}
