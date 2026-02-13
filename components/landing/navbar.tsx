"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Platform", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Guide", href: "/guide" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 h-14">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 flex-wrap"
            data-testid="link-logo"
          >
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">G</span>
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">GoRigo</span>
          </Link>

          <div className="hidden items-center gap-0.5 md:flex flex-wrap">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors rounded-md",
                  isActive(link.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex flex-wrap">
          <ThemeToggle />
          <Link href="/login" data-testid="link-login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/register" data-testid="link-get-started">
            <Button size="sm">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden flex-wrap">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background md:hidden">
          <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-3 py-2 text-sm rounded-md",
                  isActive(link.href)
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground"
                )}
                data-testid={`link-mobile-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 border-t border-border/50" />
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 text-sm text-muted-foreground rounded-md"
              data-testid="link-mobile-login"
            >
              Log in
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)} data-testid="link-mobile-get-started">
              <Button size="sm" className="w-full mt-1">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
