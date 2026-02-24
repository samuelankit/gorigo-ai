"use client";

import { TutorialPage } from "@/components/guide/tutorial-page";
import { Wallet } from "lucide-react";

export default function BillingGuidePage() {
  return (
    <TutorialPage
      icon={Wallet}
      title="Billing, Wallets & Pricing"
      subtitle="Understand how billing works and manage finances"
      intro="GoRigo uses a simple talk-time only billing model. Talk time covers all platform usage — calls, AI content generation, assistant queries, and knowledge processing. Every client has a prepaid wallet that gets deducted in real-time as they use the platform. This guide covers how to top up wallets, set spending caps, understand pricing tiers, and review transaction history."
      steps={[
        {
          title: "Navigate to the Wallets Page",
          description: "Click 'Wallets' in the sidebar under Management. You'll see all client wallets with their current balances, status, and last activity.",
        },
        {
          title: "Top Up a Client Wallet",
          description: "Click the 'Top Up' button next to any client. Enter the amount and confirm. The balance updates immediately and the client can start making calls.",
          detail: "Top-ups are processed through Stripe for secure payment handling.",
        },
        {
          title: "Set Spending Caps",
          description: "In the Automation settings, configure spending cap alerts. When a client's balance drops below a threshold, the system can automatically notify you or suspend their account.",
        },
        {
          title: "Review Transaction History",
          description: "Click any wallet to see the full transaction ledger: top-ups, call deductions, commission payments, and adjustments. Each entry shows the amount, type, and timestamp.",
        },
        {
          title: "Understand the Pricing Tiers",
          description: "Go to the Pricing page to see and manage rate cards. Rates vary by package tier and determine real-time deductions from client wallets.",
        },
        {
          title: "Monitor Revenue",
          description: "The Revenue dashboard shows your total earnings, commission breakdowns, top clients by spend, and revenue trends over time.",
        },
        {
          title: "Check Low Balance Alerts",
          description: "The Notifications centre will alert you when client wallets are running low. Set up automation rules to handle low balances automatically.",
        },
      ]}
      tips={[
        { text: "Set up auto-notification at 20% balance remaining so clients have time to top up." },
        { text: "Review the revenue dashboard weekly to track business health." },
        { text: "Use spending caps to protect against unexpected usage spikes." },
        { text: "The finance module uses double-entry bookkeeping for complete audit trails." },
        { text: "Encourage clients to set up auto top-up to avoid service interruptions." },
      ]}
      troubleshooting={[
        {
          problem: "A client's calls dropped mid-conversation",
          solution: "This usually means their wallet balance hit zero during the call. Top up their wallet and consider setting up spending alerts.",
        },
        {
          problem: "Revenue numbers don't match what I expected",
          solution: "Check the Distribution page - partner commissions are deducted automatically. Also verify rate card settings on the Pricing page.",
        },
        {
          problem: "Top-up payment isn't showing in the wallet",
          solution: "Check the transaction history for the payment status. If it shows 'pending', the payment may still be processing through Stripe.",
        },
      ]}
      keyTerms={[
        { term: "Talk-Time Billing", definition: "You only pay for actual platform usage — calls, AI content generation, assistant queries, and knowledge processing. No monthly fees or per-seat charges." },
        { term: "Wallet", definition: "A prepaid balance that gets deducted in real-time as you use the platform." },
        { term: "Spending Cap", definition: "A maximum amount a client can spend before being automatically suspended." },
        { term: "Rate Card", definition: "The pricing structure that determines how much each minute costs." },
        { term: "Double-Entry", definition: "An accounting method where every transaction has a debit and credit entry for accuracy." },
      ]}
      imageSrc="/guide/billing-hero.png"
      imageAlt="Billing and wallet management interface"
      videoSrc="/guide/billing-tutorial.mp4"
      videoTitle="Video: Managing Billing and Wallets - Step by Step"
      prevModule={{ title: "Clients & Partners", href: "/guide/clients" }}
      nextModule={{ title: "Outbound Campaigns", href: "/guide/campaigns" }}
    />
  );
}
