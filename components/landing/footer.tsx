"use client";

import Link from "next/link";
import { CallCtaBar } from "./call-cta-bar";
import { socialLinks } from "@/lib/social-links";

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
];

export function Footer() {
  return (
    <footer className="border-t border-border/50 pb-16">
      <CallCtaBar />
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-3">
            <Link
              href="/"
              className="flex items-center flex-wrap"
              data-testid="link-footer-logo"
            >
              <span className="text-lg font-bold tracking-tight">
                <span className="text-[#2DD4A8]">Go</span>
                <span className="text-foreground">Rigo</span>
                <span className="text-[#2DD4A8]">.ai</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              AI-powered call centre engine
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
                    className="text-muted-foreground hover:text-foreground transition-colors"
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
            <h3 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Capabilities
            </h3>
            <ul className="flex flex-col gap-2.5">
              {platformLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Resources
            </h3>
            <ul className="flex flex-col gap-2.5">
              {resourceLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Company
            </h3>
            <ul className="flex flex-col gap-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    data-testid={`link-footer-${link.label.toLowerCase()}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Legal
            </h3>
            <ul className="flex flex-col gap-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 International Business Exchange Limited. All rights
            reserved.
          </p>
          <a
            href="mailto:hello@gorigo.ai"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground flex-wrap"
            data-testid="link-footer-email"
          >
            hello@gorigo.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
