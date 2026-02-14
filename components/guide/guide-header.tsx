"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Home,
  Menu,
  LayoutDashboard,
  Bot,
  Users,
  Wallet,
  Megaphone,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

const guideModules = [
  { title: "Platform Overview", href: "/guide/overview", icon: LayoutDashboard },
  { title: "AI Agents", href: "/guide/agents", icon: Bot },
  { title: "Knowledge Base", href: "/guide/knowledge-base", icon: BookOpen },
  { title: "Clients & Partners", href: "/guide/clients", icon: Users },
  { title: "Billing & Wallets", href: "/guide/billing", icon: Wallet },
  { title: "Outbound Campaigns", href: "/guide/campaigns", icon: Megaphone },
  { title: "Call Monitoring", href: "/guide/monitoring", icon: PhoneCall },
  { title: "Compliance & DNC", href: "/guide/compliance", icon: ShieldCheck },
];

interface GuideHeaderProps {
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  currentTitle?: string;
}

export function GuideHeader({
  showBack = false,
  backHref = "/guide",
  backLabel = "All Guides",
  currentTitle,
}: GuideHeaderProps) {
  const pathname = usePathname();
  const currentModule = guideModules.find((m) => m.href === pathname);
  const displayTitle = currentTitle || currentModule?.title;

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="max-w-5xl mx-auto px-6 pt-4 pb-0"
        data-testid="nav-guide-breadcrumbs"
      >
        <ol className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1">
            <Link
              href="/"
              className="hover:text-foreground transition-colors flex items-center gap-1"
              data-testid="breadcrumb-home"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            {displayTitle ? (
              <Link
                href="/guide"
                className="hover:text-foreground transition-colors"
                data-testid="breadcrumb-guide"
              >
                Guide
              </Link>
            ) : (
              <span
                className="text-foreground font-medium"
                aria-current="page"
                data-testid="breadcrumb-guide"
              >
                Guide
              </span>
            )}
          </li>
          {displayTitle && (
            <li className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
              <span
                className="text-foreground font-medium"
                aria-current="page"
                data-testid="breadcrumb-current"
              >
                {displayTitle}
              </span>
            </li>
          )}
        </ol>
      </nav>

      <header className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {showBack && (
              <Link href={backHref}>
                <Button variant="ghost" size="sm" data-testid="button-guide-back">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {backLabel}
                </Button>
              </Link>
            )}
            <Link href="/guide" className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold text-lg" data-testid="text-guide-logo">GoRigo Guide</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-guide-nav-menu">
                  <Menu className="h-4 w-4 mr-1.5" />
                  Modules
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {guideModules.map((mod) => {
                  const Icon = mod.icon;
                  const isActive = pathname === mod.href;
                  return (
                    <DropdownMenuItem key={mod.href} asChild>
                      <Link
                        href={mod.href}
                        className={isActive ? "font-medium" : ""}
                        data-testid={`link-guide-module-${mod.href.split("/").pop()}`}
                      >
                        <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                        {mod.title}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="button-goto-admin">
                Go to Admin Console
              </Button>
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
