import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/", label: "Dashboard", icon: Sparkles },
  { href: "/users/new", label: "Create User", icon: UserPlus },
  { href: "/health", label: "Health", icon: Activity },
] as const;

export default function AppShell({
  title,
  eyebrow,
  children,
  rightSlot,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const [location] = useLocation();

  return (
    <div className="min-h-dvh app-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <header className="enter">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/90" />
                <span data-testid="app-eyebrow">{eyebrow ?? "Starter kit"}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-[2.6rem] leading-[1.05]">
                {title}
              </h1>
              <p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
                A clean minimal interface with premium fit & finish: crisp type, gentle depth, and subtle motion.
              </p>
            </div>

            <div className="flex items-center gap-2" data-testid="header-actions">
              {rightSlot}
              <Button
                asChild
                variant="secondary"
                className="rounded-xl shadow-sm hover:shadow-md transition-shadow"
                data-testid="header-github"
                onClick={() => {}}
              >
                <Link href="/users/new">Get started</Link>
              </Button>
            </div>
          </div>

          <nav className="mt-6">
            <div className="rounded-2xl border bg-card/70 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/55 grain">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  {nav.map((item) => {
                    const Icon = item.icon;
                    const active = location === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                          "hover:bg-muted/70 hover:-translate-y-[1px]",
                          active
                            ? "bg-foreground text-background shadow-sm"
                            : "text-foreground/80"
                        )}
                        data-testid={`nav-${item.href}`}
                      >
                        <Icon className={cn("h-4 w-4", active ? "opacity-95" : "opacity-70")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 px-2 pb-1 sm:pb-0 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Built with React · Query · Wouter</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="hidden md:inline">Theme:</span>
                    <ThemeToggle />
                  </span>
                </div>
              </div>
            </div>
          </nav>
        </header>

        <main className="mt-6 sm:mt-8">{children}</main>

        <footer className="mt-10 pb-10 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span data-testid="footer-left">Minimal Starter UI</span>
            <span data-testid="footer-right">
              Tip: Try creating a user — success + error states are fully wired.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const setDark = (dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-xl"
        data-testid="theme-toggle"
        onClick={() => setDark(!isDark)}
      >
        <span className="text-xs">{isDark ? "Dark" : "Light"}</span>
      </Button>
    </div>
  );
}
