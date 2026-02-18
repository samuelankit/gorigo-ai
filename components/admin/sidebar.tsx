"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  FileText,
  Shield,
  LogOut,
  BarChart3,
  Wallet,
  Calculator,
  Network,
  Link2,
  Phone,
  Server,
  ArrowLeftRight,
  PoundSterling,
  Bell,
  ShieldCheck,
  KeyRound,
  Bot,
  BookOpen,
  PhoneCall,
  Megaphone,
  GraduationCap,
  MessageCircle,
  MessageSquare,
  Globe,
  Activity,
  MousePointerClick,
  Zap,
  BrainCircuit,
  Headset,
  Fingerprint,
  MessagesSquare,
  FolderKanban,
  UserCog,
} from "lucide-react";

const overviewItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Web Traffic", url: "/admin/web-traffic", icon: MousePointerClick },
  { title: "Revenue", url: "/admin/revenue", icon: PoundSterling },
  { title: "Unit Economics", url: "/admin/unit-economics", icon: Calculator },
  { title: "Calls", url: "/admin/calls", icon: PhoneCall },
  { title: "Operations", url: "/admin/operations", icon: Activity },
  { title: "Leads", url: "/admin/leads", icon: Zap },
  { title: "Chat Leads", url: "/admin/chats", icon: MessageCircle },
  { title: "Conversations", url: "/admin/conversations", icon: MessageSquare },
];

const managementItems = [
  { title: "Departments", url: "/admin/departments", icon: FolderKanban },
  { title: "Team", url: "/admin/team", icon: UserCog },
  { title: "Partners", url: "/admin/partners", icon: Building2 },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Agents", url: "/admin/agents", icon: Bot },
  { title: "Affiliates", url: "/admin/affiliates", icon: Link2 },
  { title: "Distribution", url: "/admin/distribution", icon: Network },
  { title: "Wallets", url: "/admin/wallets", icon: Wallet },
  { title: "Pricing", url: "/admin/pricing", icon: Calculator },
  { title: "Phone Numbers", url: "/admin/phone-numbers", icon: Phone },
  { title: "Countries", url: "/admin/countries", icon: Globe },
  { title: "International", url: "/admin/international", icon: Globe },
  { title: "Deployments", url: "/admin/deployments", icon: ArrowLeftRight },
  { title: "Campaigns", url: "/admin/campaigns", icon: Megaphone },
  { title: "Knowledge", url: "/admin/knowledge", icon: BookOpen },
  { title: "Compliance", url: "/admin/compliance", icon: ShieldCheck },
  { title: "API Keys", url: "/admin/api-keys", icon: KeyRound },
];

const enterpriseItems = [
  { title: "Conversation Analytics", url: "/admin/conversation-analytics", icon: BrainCircuit },
  { title: "Agent Assist", url: "/admin/agent-assist", icon: Headset },
  { title: "Voice Biometrics", url: "/admin/voice-biometrics", icon: Fingerprint },
  { title: "Omnichannel", url: "/admin/omnichannel", icon: MessagesSquare },
];

const systemItems = [
  { title: "Infrastructure", url: "/admin/infrastructure", icon: Server },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Platform Settings", url: "/admin/settings", icon: Settings },
  { title: "Audit Log", url: "/admin/audit", icon: FileText },
  { title: "Getting Started Guide", url: "/guide", icon: GraduationCap },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          setEmail(data.user.email || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      router.push("/");
    }
  };

  const getInitials = (email: string): string => {
    if (!email) return "A";
    const parts = email.split("@")[0].split(".");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const isActive = (url: string) => {
    if (url === "/admin") return pathname === "/admin";
    return pathname.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <Link href="/admin" className="flex items-center gap-3" data-testid="link-admin-logo">
          <div className="flex items-center justify-center rounded-lg h-10 w-10 bg-gradient-to-br from-violet-500 to-violet-600 text-white font-bold text-lg shadow-md">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0">
            <span className="text-sm font-bold text-sidebar-foreground">GoRigo</span>
            <span className="text-xs text-sidebar-foreground/60">Admin Console</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-xs font-semibold text-sidebar-foreground/60 px-4 py-2">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-xs font-semibold text-sidebar-foreground/60 px-4 py-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-xs font-semibold text-sidebar-foreground/60 px-4 py-2">
            Enterprise
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {enterpriseItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-xs font-semibold text-sidebar-foreground/60 px-4 py-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-0 py-0">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-violet-600 text-white text-xs font-semibold">
                {getInitials(email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate" data-testid="text-admin-role">
                Super Admin
              </p>
              {email && (
                <p className="text-xs text-sidebar-foreground/70 truncate" data-testid="text-admin-email">
                  {email}
                </p>
              )}
            </div>
          </div>
          <SidebarSeparator className="my-1" />
          <Button
            variant="ghost"
            className="w-full justify-start text-xs h-auto py-2"
            onClick={handleLogout}
            data-testid="button-admin-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
