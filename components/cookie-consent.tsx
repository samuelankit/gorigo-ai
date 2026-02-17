"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Settings2, Shield } from "lucide-react";
import { loadConsentedScripts, removeNonEssentialScripts } from "@/lib/cookie-scripts";

type ConsentLevel = "essential" | "analytics" | "all";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const CONSENT_KEY = "gorigo_cookie_consent";
const CONSENT_VERSION = "1";

function getStoredConsent(): { level: ConsentLevel; version: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
}

function storeConsent(level: ConsentLevel) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ level, version: CONSENT_VERSION, timestamp: new Date().toISOString() }));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent || consent.version !== CONSENT_VERSION) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      loadConsentedScripts();
    }
  }, []);

  function handleAcceptAll() {
    storeConsent("all");
    loadConsentedScripts();
    setVisible(false);
  }

  function handleAcceptEssential() {
    storeConsent("essential");
    removeNonEssentialScripts();
    setVisible(false);
  }

  function handleSavePreferences() {
    const level: ConsentLevel = preferences.analytics && preferences.marketing
      ? "all"
      : preferences.analytics
        ? "analytics"
        : "essential";
    storeConsent(level);
    if (level === "essential") {
      removeNonEssentialScripts();
    } else {
      loadConsentedScripts();
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4"
      data-testid="cookie-consent-banner"
    >
      <div className="mx-auto max-w-3xl rounded-md border bg-card p-4 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium" data-testid="text-cookie-title">
                Cookie Preferences
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-cookie-description">
                We use cookies to provide essential site functionality, analyse usage, and improve your experience.
                You can choose which cookies to accept. See our{" "}
                <a href="/policies/cookies" className="underline hover-elevate">
                  Cookie Policy
                </a>{" "}
                and{" "}
                <a href="/policies/privacy" className="underline hover-elevate">
                  Privacy Policy
                </a>{" "}
                for details.
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setVisible(false)}
            data-testid="button-cookie-dismiss"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {showDetails && (
          <div className="mt-3 space-y-2 border-t pt-3" data-testid="cookie-details">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked
                disabled
                className="rounded"
                data-testid="checkbox-essential"
              />
              <span className="font-medium">Essential</span>
              <span className="text-muted-foreground">— Required for the site to function (authentication, security)</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
                className="rounded"
                data-testid="checkbox-analytics"
              />
              <span className="font-medium">Analytics</span>
              <span className="text-muted-foreground">— Help us understand how the platform is used</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences((p) => ({ ...p, marketing: e.target.checked }))}
                className="rounded"
                data-testid="checkbox-marketing"
              />
              <span className="font-medium">Marketing</span>
              <span className="text-muted-foreground">— Personalised content and advertising</span>
            </label>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            data-testid="button-cookie-manage"
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            {showDetails ? "Hide Details" : "Manage"}
          </Button>
          {showDetails ? (
            <Button
              size="sm"
              onClick={handleSavePreferences}
              data-testid="button-cookie-save"
            >
              Save Preferences
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcceptEssential}
                data-testid="button-cookie-essential"
              >
                Essential Only
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                data-testid="button-cookie-accept-all"
              >
                Accept All
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
