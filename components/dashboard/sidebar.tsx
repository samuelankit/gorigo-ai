"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Bot, PhoneCall, CreditCard, Settings, Headphones, Wallet, Link2, BarChart3, Shield, Send, Webhook, BookOpen, MessageSquare, ClipboardList, Key, Sparkles, Landmark, Receipt, ShoppingCart, FileText, Cloud, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Live Demo", url: "/dashboard/demo", icon: Sparkles },
];

const manageMenuItems = [
  { title: "Agents & Flow", url: "/dashboard/agent", icon: Bot },
  { title: "Agent Testing", url: "/dashboard/agent-test", icon: MessageSquare },
  { title: "Knowledge Base", url: "/dashboard/knowledge", icon: BookOpen },
  { title: "Campaigns", url: "/dashboard/campaigns", icon: Send },
  { title: "Call History", url: "/dashboard/calls", icon: PhoneCall },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Compliance", url: "/dashboard/compliance", icon: Shield },
  { title: "Webhooks", url: "/dashboard/webhooks", icon: Webhook },
];

const partnerMenuItems = [
  { title: "My Affiliates", url: "/dashboard/affiliates", icon: Link2 },
];

const financeMenuItems = [
  { title: "Finance Home", url: "/dashboard/finance", icon: Landmark },
  { title: "Sales & Invoices", url: "/dashboard/finance/sales", icon: Receipt },
  { title: "Purchases & Bills", url: "/dashboard/finance/purchases", icon: ShoppingCart },
  { title: "Reports", url: "/dashboard/finance/reports", icon: FileText },
];

const accountMenuItems = [
  { title: "Wallet", url: "/dashboard/wallet", icon: Wallet },
  { title: "Billing & Usage", url: "/dashboard/billing", icon: CreditCard },
  { title: "API Keys", url: "/dashboard/api-keys", icon: Key },
  { title: "Activity Log", url: "/dashboard/activity", icon: ClipboardList },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

const PACKAGE_BADGE: Record<string, { label: string; icon: typeof Cloud; className: string }> = {
  managed: { label: "Managed", icon: Cloud, className: "text-blue-600 dark:text-blue-400 border-blue-500/30" },
  byok: { label: "BYOK", icon: Key, className: "text-amber-600 dark:text-amber-400 border-amber-500/30" },
  self_hosted: { label: "Self-Hosted", icon: Server, className: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const [userType, setUserType] = useState("client");
  const [features, setFeatures] = useState<string[]>([]);
  const [deploymentModel, setDeploymentModel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/features")
      .then((res) => res.json())
      .then((data) => {
        if (data?.features) {
          setFeatures(data.features);
          setUserType(data.userType || "client");
        }
      })
      .catch(() => {});

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.org?.deploymentModel) setDeploymentModel(data.org.deploymentModel);
      })
      .catch(() => {});
  }, []);

  const renderMenuGroup = (
    label: string,
    items: typeof mainMenuItems,
    matchFn: (url: string) => boolean
  ) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-semibold text-sidebar-foreground/50 px-3 py-1.5 uppercase tracking-wide">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={matchFn(item.url)}
                tooltip={item.title}
              >
                <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <item.icon className="h-4 w-4" />
                  <span className="text-[13px]">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-3" style={{ height: "48px" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 h-full" data-testid="link-logo">
          <div className="flex items-center justify-center rounded h-8 w-8 bg-primary text-primary-foreground font-bold text-sm">
            <Headphones className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground">GoRigo</span>
            {deploymentModel && PACKAGE_BADGE[deploymentModel] && (() => {
              const pkg = PACKAGE_BADGE[deploymentModel];
              const Icon = pkg.icon;
              return (
                <Badge variant="outline" className={`no-default-hover-elevate text-[10px] px-1.5 py-0 ${pkg.className}`} data-testid="badge-sidebar-package">
                  <Icon className="h-2.5 w-2.5 mr-0.5" />
                  {pkg.label}
                </Badge>
              );
            })()}
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-1">
        {renderMenuGroup("Main", mainMenuItems, (url) => pathname === url)}
        {renderMenuGroup("Manage", manageMenuItems, (url) => pathname.startsWith(url))}
        {renderMenuGroup("Finance", financeMenuItems, (url) =>
          url === "/dashboard/finance" ? pathname === url : pathname.startsWith(url)
        )}
        {(userType === "partner" && features.includes("affiliates")) &&
          renderMenuGroup("Partner", partnerMenuItems, (url) => pathname.startsWith(url))
        }
        {renderMenuGroup("Account", accountMenuItems, (url) => pathname.startsWith(url))}
      </SidebarContent>
    </Sidebar>
  );
}
