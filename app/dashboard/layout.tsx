"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Bot, Send, Workflow, Settings, LogOut, ChevronDown } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setAuthenticated(true);
          setEmail(data.user.email || "");
          setBusinessName(data.user.businessName || "");
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      router.push("/");
    }
  }, [router]);

  const getInitials = (val: string): string => {
    if (!val) return "U";
    const parts = val.split("@")[0].split(".");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return val.substring(0, 2).toUpperCase();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/calls?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground" data-testid="text-loading">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header
            className="flex items-center gap-3 border-b px-3 sticky top-0 z-50 bg-background"
            style={{ height: "48px" }}
            data-testid="header-command-bar"
          >
            <SidebarTrigger data-testid="button-sidebar-toggle" />

            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search calls, agents, contacts..."
                  className="h-8 pl-8 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-global-search"
                />
              </div>
            </form>

            <div className="flex items-center gap-1 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" data-testid="button-create-new">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" data-testid="menu-create-new">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/agent">
                      <Bot className="h-4 w-4 mr-2" />
                      New Agent
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/campaigns">
                      <Send className="h-4 w-4 mr-2" />
                      New Campaign
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/agent">
                      <Workflow className="h-4 w-4 mr-2" />
                      New Flow
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <NotificationBell />
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-profile-menu">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {getInitials(email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" data-testid="menu-profile">
                  <div className="px-2 py-1.5">
                    {businessName && <p className="text-sm font-medium">{businessName}</p>}
                    <p className="text-xs text-muted-foreground">{email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-header-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-5">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
