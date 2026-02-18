"use client";

import Link from "next/link";
import { socialLinks } from "@/lib/social-links";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const platformLinks = [
  { label: "Capabilities", href: "/capabilities" },
  { label: "AI Agents", href: "/features/ai-agents" },
  { label: "Call Handling", href: "/features/call-handling" },
  { label: "Compliance", href: "/features/compliance" },
  { label: "Analytics", href: "/features/analytics" },
  { label: "Multi-Language", href: "/features/multi-language" },
  { label: "Pay Per Talk Time", href: "/features/pay-per-talk-time" },
];

const resourceLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "ROI Calculator", href: "/roi-calculator" },
  { label: "Partners", href: "/partners" },
  { label: "Documentation", href: "/docs" },
  { label: "Getting Started", href: "/guide" },
  { label: "Sitemap", href: "/sitemap" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Trust Centre", href: "/trust" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/policies/privacy" },
  { label: "Terms of Service", href: "/policies/terms" },
  { label: "Cookie Policy", href: "/policies/cookies" },
  { label: "Acceptable Use", href: "/policies/acceptable-use" },
  { label: "Service Level Agreement", href: "/sla" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/20" />
        <div className="relative mx-auto max-w-7xl px-6 py-14">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-3">
              <Link
                href="/"
                className="flex items-center flex-wrap"
                data-testid="link-footer-logo"
              >
                <span className="text-lg font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Go</span>
                  <span className="text-foreground">Rigo</span>
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">.ai</span>
                </span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                AI-powered call centre engine.
                <br />
                Run your call centre from your phone.
              </p>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  International Business Exchange Limited
                </p>
                <p className="text-xs text-muted-foreground">
                  UK Company No. 15985956
                </p>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap" data-testid="footer-social-icons">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/50 text-muted-foreground transition-colors hover-elevate"
                      aria-label={social.label}
                      data-testid={social.testId}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-foreground mb-4">
                Platform
              </h3>
              <ul className="flex flex-col gap-2.5">
                {platformLinks.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-foreground mb-4">
                Resources
              </h3>
              <ul className="flex flex-col gap-2.5">
                {resourceLinks.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-foreground mb-4">
                Company
              </h3>
              <ul className="flex flex-col gap-2.5">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground"
                      data-testid={`link-footer-${link.label.toLowerCase()}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-foreground mb-4">
                Legal
              </h3>
              <ul className="flex flex-col gap-2.5">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border/40 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                &copy; 2026 International Business Exchange Limited. All rights reserved.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <a
                  href="mailto:hello@gorigo.ai"
                  className="text-xs text-muted-foreground"
                  data-testid="link-footer-email"
                >
                  hello@gorigo.ai
                </a>
                <Link href="/register" data-testid="link-footer-get-started">
                  <Button variant="ghost" size="sm">
                    Get Started Free
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
