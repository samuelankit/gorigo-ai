"use client";

import { TutorialPage } from "@/components/guide/tutorial-page";
import { Megaphone } from "lucide-react";

export default function CampaignsGuidePage() {
  return (
    <TutorialPage
      icon={Megaphone}
      title="Outbound Campaigns"
      subtitle="Launch and monitor automated call campaigns"
      intro="Outbound campaigns let you reach large lists of contacts automatically. Your AI agent calls each person, follows a script, and logs the outcomes. This guide shows you how to create a campaign, upload contacts, set the schedule, and track progress in real-time."
      steps={[
        {
          title: "Navigate to the Campaigns Page",
          description: "Click 'Campaigns' in the sidebar under Management. You'll see an overview of all campaigns with their status, progress, and contact statistics.",
        },
        {
          title: "Create a New Campaign",
          description: "Click 'Create Campaign'. Enter a name and description that clearly identifies the campaign purpose - e.g., 'January Follow-Up Calls' or 'Product Launch Outreach'.",
        },
        {
          title: "Select an AI Agent",
          description: "Choose which agent will make the calls. Make sure the agent is configured with the right personality, FAQs, and knowledge base for this campaign's topic.",
          detail: "If you haven't created an agent yet, see the AI Agents tutorial first.",
        },
        {
          title: "Upload Your Contact List",
          description: "Add the phone numbers you want to call. You can upload a CSV file with contact details or enter numbers manually.",
          detail: "Make sure your contacts have consented to be called and aren't on the DNC list.",
        },
        {
          title: "Configure Call Settings",
          description: "Set the call interval (time between each call), maximum retries for unanswered calls, and whether to leave voicemails.",
        },
        {
          title: "Schedule or Launch",
          description: "Choose to start immediately or schedule for a specific date and time. Consider your contacts' time zones and business hours.",
        },
        {
          title: "Monitor Progress",
          description: "Watch the campaign progress in real-time. The dashboard shows completed calls, failed attempts, and overall completion percentage with a progress bar.",
        },
        {
          title: "Review Results",
          description: "Once the campaign finishes (or while it's running), click the campaign row to see detailed outcomes: how many leads were generated, appointments booked, and calls that needed human handoff.",
        },
      ]}
      tips={[
        { text: "Start with a small test batch (10-20 contacts) before running the full campaign." },
        { text: "Schedule campaigns during business hours for best answer rates." },
        { text: "Set a reasonable call interval (30-60 seconds) to avoid overwhelming your system." },
        { text: "Always check your contact list against the DNC register before launching." },
        { text: "Use campaign descriptions to record the purpose - this helps with auditing later." },
      ]}
      troubleshooting={[
        {
          problem: "My campaign is stuck at 0% progress",
          solution: "Check that the assigned agent is active and your Twilio phone numbers are configured correctly. Also verify there's sufficient wallet balance.",
        },
        {
          problem: "Most calls are showing as 'failed'",
          solution: "Common causes: invalid phone numbers, insufficient wallet balance, or Twilio configuration issues. Check the call logs for specific error messages.",
        },
        {
          problem: "I want to pause a running campaign",
          solution: "Click the campaign and use the Pause button. You can resume later - it will continue from where it left off.",
        },
      ]}
      keyTerms={[
        { term: "Campaign", definition: "An automated outbound calling project targeting a list of contacts." },
        { term: "Call Interval", definition: "The time gap between each automated call to prevent system overload." },
        { term: "Max Retries", definition: "How many times the system will try to reach an unanswered contact." },
        { term: "Completion Rate", definition: "The percentage of contacts that were successfully reached." },
        { term: "DNC", definition: "Do Not Call - a register of numbers that must not be contacted." },
      ]}
      imageSrc="/guide/campaigns-hero.png"
      imageAlt="Campaign management interface"
      videoSrc="/guide/campaigns-tutorial.mp4"
      videoTitle="Video: Creating and Monitoring Outbound Campaigns - Step by Step"
      prevModule={{ title: "Billing & Wallets", href: "/guide/billing" }}
      nextModule={{ title: "Call Monitoring", href: "/guide/monitoring" }}
    />
  );
}
