"use client";

import { TutorialPage } from "@/components/guide/tutorial-page";
import { Users } from "lucide-react";

export default function ClientsGuidePage() {
  return (
    <TutorialPage
      icon={Users}
      title="Managing Clients & Partners"
      subtitle="Set up and manage your business relationships"
      intro="GoRigo supports a three-tier business hierarchy: Business Partners, Direct-to-Consumer (D2C) clients, and Affiliate Partners. This guide shows you how to add clients, assign deployment packages, manage partner relationships, and monitor client activity."
      steps={[
        {
          title: "Navigate to the Clients Page",
          description: "Click 'Clients' in the sidebar under Management. You'll see a table of all organisations with their status, package type, and key metrics.",
        },
        {
          title: "Add a New Client",
          description: "Click the 'Add Client' button. Fill in the company name, contact email, and phone number. Choose the deployment package that fits their needs.",
          detail: "Individual (single operator, full control) or Self-Hosted (they run it themselves).",
        },
        {
          title: "Select the Deployment Package",
          description: "Each package has a different pricing model: Individual at 20p/min, Self-Hosted at 12p/min. Choose based on the client's technical capability and budget.",
        },
        {
          title: "Set Up Partner Relationships",
          description: "Go to the Partners page to create Business Partners. Partners can have their own reseller clients underneath them, creating a multi-tier structure.",
          detail: "Partners earn commissions on their clients' usage based on the distribution engine settings.",
        },
        {
          title: "Configure Client Status",
          description: "Clients can be Active, Suspended, or Pending. You can change status from the client detail view. Suspended clients can't make calls until reactivated.",
        },
        {
          title: "Monitor Client Activity",
          description: "Click any client row to see their detailed view: call history, wallet balance, agent configuration, and usage analytics.",
        },
        {
          title: "Manage Affiliates",
          description: "Go to the Affiliates page to create affiliate links, track referral clicks and signups, and manage commission rates for your affiliate partners.",
        },
      ]}
      tips={[
        { text: "Start new clients on the Individual package - it's the easiest to get started with." },
        { text: "Set up spending caps for clients to prevent unexpected bills." },
        { text: "Use the automation settings to auto-suspend clients who exceed their spending limits." },
        { text: "Review client activity weekly to catch any issues early." },
        { text: "Partners with many active clients should have dedicated support attention." },
      ]}
      troubleshooting={[
        {
          problem: "A client's calls aren't going through",
          solution: "Check their wallet balance first - they may have run out of credit. Also verify their account status is 'Active'.",
        },
        {
          problem: "I can't change a client's deployment package",
          solution: "Package changes may require the client to be temporarily suspended. Contact support if the option isn't available.",
        },
        {
          problem: "Partner commissions aren't calculating correctly",
          solution: "Check the Distribution page to verify commission rates are set correctly for each tier in the waterfall.",
        },
      ]}
      keyTerms={[
        { term: "Deployment Package", definition: "The service tier a client is on - Individual, Team, or Self-Hosted." },
        { term: "Business Partner", definition: "A reseller who can bring in their own clients and earn commissions." },
        { term: "D2C", definition: "Direct-to-Consumer - clients who work directly with you, no middleman." },
        { term: "Affiliate", definition: "Someone who refers new clients via a tracking link and earns commission per signup." },
        { term: "Distribution Engine", definition: "The system that calculates and distributes commissions across partner tiers." },
      ]}
      imageSrc="/guide/clients-hero.png"
      imageAlt="Client management interface"
      videoSrc="/guide/clients-tutorial.mp4"
      videoTitle="Video: Setting Up Clients and Partners - Step by Step"
      prevModule={{ title: "Knowledge Base", href: "/guide/knowledge-base" }}
      nextModule={{ title: "Billing & Wallets", href: "/guide/billing" }}
    />
  );
}
