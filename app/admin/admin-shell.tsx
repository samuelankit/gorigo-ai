"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { RigoAssistant } from "@/components/rigo-assistant";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

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
          if (data.user.globalRole !== "SUPERADMIN") {
            router.push("/dashboard");
            return;
          }
          setAuthenticated(true);
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground" data-testid="text-admin-loading">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-2 border-b p-3 sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-admin-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
      <RigoAssistant />
    </SidebarProvider>
  );
}
