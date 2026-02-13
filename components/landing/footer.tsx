"use client";

import Link from "next/link";

const platformLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/docs" },
  { label: "Getting Started Guide", href: "/guide" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Careers", href: "/contact" },
  { label: "Blog", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/policies/privacy" },
  { label: "Terms of Service", href: "/policies/terms" },
  { label: "Cookie Policy", href: "/policies/cookies" },
  { label: "Acceptable Use", href: "/policies/acceptable-use" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 flex-wrap"
              data-testid="link-footer-logo"
            >
              <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary-foreground">G</span>
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                GoRigo
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              AI-powered call centre platform
            </p>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                International Business Exchange Limited
              </p>
              <p className="text-xs text-muted-foreground">
                UK Company No. 15985956
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Platform
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
