"use client";

import { TutorialPage } from "@/components/guide/tutorial-page";
import { LayoutDashboard } from "lucide-react";

export default function OverviewGuidePage() {
  return (
    <TutorialPage
      icon={LayoutDashboard}
      title="Platform Overview"
      subtitle="Navigate the GoRigo dashboard with confidence"
      intro="GoRigo's admin console is your command centre for managing AI call operations. This guide walks you through the dashboard layout, key metrics, and how to find everything you need. By the end, you'll know your way around like a pro."
      steps={[
        {
          title: "Log in to the Admin Console",
          description: "Go to your GoRigo URL and sign in with your admin email and password. You'll land on the main dashboard.",
          detail: "If this is your first time, use the credentials provided during onboarding.",
        },
        {
          title: "Understand the Sidebar Navigation",
          description: "The left sidebar is your main menu. It's organised into three sections: Overview (Dashboard, Analytics, Revenue, Calls), Management (Partners, Clients, Agents, etc.), and System (Infrastructure, Settings, Audit Log).",
          detail: "Click the hamburger icon at the top to collapse or expand the sidebar.",
        },
        {
          title: "Read Your KPI Cards",
          description: "The dashboard shows key metrics at a glance: total calls today, active agents, revenue, and wallet balances. Each card updates in real-time.",
        },
        {
          title: "Explore the Analytics Section",
          description: "Click 'Analytics' in the sidebar to see detailed charts covering call trends, sentiment analysis, quality scores, and agent performance over time.",
        },
        {
          title: "Check Revenue Overview",
          description: "The Revenue page shows your earnings, commission breakdowns, client rankings, and transaction history. Use the date filter to view specific periods.",
        },
        {
          title: "Monitor Live Calls",
          description: "Click 'Calls' to see what's happening right now - active calls, recent completions, and today's call statistics. Click any call row for full details.",
        },
      ]}
      tips={[
        { text: "Bookmark your admin dashboard URL for quick access." },
        { text: "The sidebar remembers your collapsed/expanded preference between sessions." },
        { text: "Use the top command bar to quickly search across the platform." },
        { text: "Check the Infrastructure page periodically to monitor system health." },
      ]}
      troubleshooting={[
        {
          problem: "I can't see the admin dashboard after logging in",
          solution: "Your account needs SuperAdmin access. Contact the platform administrator to upgrade your role.",
        },
        {
          problem: "KPI cards show zero even though I've made calls",
          solution: "Check that your date filter is set correctly. Some cards show 'today only' data by default.",
        },
      ]}
      keyTerms={[
        { term: "KPI", definition: "Key Performance Indicator - a measurable value showing how well something is performing." },
        { term: "SuperAdmin", definition: "The highest access level with full control over all platform features and settings." },
        { term: "Talk Time", definition: "All platform usage — calls, AI content generation, assistant queries, and knowledge processing. This is what you are billed for." },
        { term: "Agent", definition: "An AI-powered virtual assistant that handles phone calls on your behalf." },
      ]}
      imageSrc="/guide/overview-hero.png"
      imageAlt="GoRigo admin dashboard overview"
      videoSrc="/guide/overview-tutorial.mp4"
      videoTitle="Video: Navigating the GoRigo Dashboard - Step by Step"
      nextModule={{ title: "AI Agents", href: "/guide/agents" }}
    />
  );
}
