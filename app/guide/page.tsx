"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GuideHeader } from "@/components/guide/guide-header";
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Users,
  Wallet,
  Megaphone,
  PhoneCall,
  ShieldCheck,
  ArrowRight,
  Clock,
} from "lucide-react";

const modules = [
  {
    title: "Platform Overview",
    description: "Learn how to navigate the dashboard, understand your KPI cards, and find your way around the admin console.",
    icon: LayoutDashboard,
    href: "/guide/overview",
    time: "5 min",
    color: "text-violet-500",
  },
  {
    title: "AI Agents",
    description: "Create and configure your AI call agents with custom voices, personalities, FAQs, and knowledge bases.",
    icon: Bot,
    href: "/guide/agents",
    time: "8 min",
    color: "text-teal-500",
  },
  {
    title: "Knowledge Base",
    description: "Upload documents, manage processing, and give your AI agents the information they need to handle calls.",
    icon: BookOpen,
    href: "/guide/knowledge-base",
    time: "6 min",
    color: "text-indigo-500",
  },
  {
    title: "Clients & Partners",
    description: "Add clients, set up business partners, manage D2C relationships, and configure partner tiers.",
    icon: Users,
    href: "/guide/clients",
    time: "7 min",
    color: "text-pink-500",
  },
  {
    title: "Billing & Wallets",
    description: "Understand talk-time billing, top up wallets, set spending caps, and track transaction history.",
    icon: Wallet,
    href: "/guide/billing",
    time: "5 min",
    color: "text-orange-500",
  },
  {
    title: "Outbound Campaigns",
    description: "Create call campaigns, upload contact lists, set schedules, and monitor campaign progress.",
    icon: Megaphone,
    href: "/guide/campaigns",
    time: "7 min",
    color: "text-rose-500",
  },
  {
    title: "Call Monitoring",
    description: "Monitor live calls in real-time, review quality scores, analyse sentiment, and track call outcomes.",
    icon: PhoneCall,
    href: "/guide/monitoring",
    time: "6 min",
    color: "text-cyan-500",
  },
  {
    title: "Compliance & DNC",
    description: "Manage Do Not Call lists, track consent records, and ensure regulatory compliance across operations.",
    icon: ShieldCheck,
    href: "/guide/compliance",
    time: "5 min",
    color: "text-blue-500",
  },
];

export default function GuidePage() {
  return (
    <>
      <GuideHeader />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-guide-title">Getting Started with GoRigo</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Step-by-step tutorials to help you set up and get the most from your AI call centre. 
            Each module includes text instructions, illustrations, and a video walkthrough.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <Link key={mod.href} href={mod.href}>
              <Card className="h-full hover-elevate cursor-pointer" data-testid={`card-module-${mod.href.split("/").pop()}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <mod.icon className={`h-5 w-5 ${mod.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold">{mod.title}</h3>
                        <Badge variant="secondary" className="shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {mod.time}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
                      <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
                        <span>Start tutorial</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
