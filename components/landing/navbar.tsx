"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Capabilities", href: "/capabilities" },
  { label: "Pricing", href: "/pricing" },
  { label: "ROI Calculator", href: "/roi-calculator" },
  { label: "Trust", href: "/trust" },
  { label: "AI Transparency", href: "/ai-transparency" },
  { label: "Partners", href: "/partners" },
  { label: "Contact", href: "/contact" },
  { label: "Docs", href: "/docs" },
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
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 h-14">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center flex-wrap"
            data-testid="link-logo"
          >
            <span className="text-xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[#E8604C] to-[#F5A623] bg-clip-text text-transparent">Go</span>
              <span className="text-foreground">Rigo</span>
              <span className="bg-gradient-to-r from-[#E8604C] to-[#F5A623] bg-clip-text text-transparent">.ai</span>
            </span>
          </Link>

          <div className="hidden items-center gap-0.5 md:flex flex-wrap">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors rounded-md",
                  isActive(link.href)
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
                data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
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

      <div className={cn(
        "border-t border-border/40 bg-background md:hidden overflow-hidden transition-all duration-200",
        mobileOpen ? "max-h-[500px] opacity-100 visible" : "max-h-0 opacity-0 invisible border-t-0 pointer-events-none"
      )} aria-hidden={!mobileOpen}>
          <div className={cn("mx-auto max-w-7xl px-6 flex flex-col gap-1", mobileOpen ? "py-4" : "py-0")}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-3 py-2 text-sm rounded-md",
                  isActive(link.href)
                    ? "text-foreground bg-muted font-medium"
                    : "text-muted-foreground/80"
                )}
                data-testid={`link-mobile-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 border-t border-border/40" />
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
    </header>
  );
}
