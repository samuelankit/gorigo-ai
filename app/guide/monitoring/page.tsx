"use client";

import { TutorialPage } from "@/components/guide/tutorial-page";
import { PhoneCall } from "lucide-react";

export default function MonitoringGuidePage() {
  return (
    <TutorialPage
      icon={PhoneCall}
      title="Call Monitoring & Analytics"
      subtitle="Track performance and quality in real-time"
      intro="GoRigo gives you complete visibility into every call across your platform. Monitor live calls as they happen, review quality scores, analyse sentiment trends, and drill into individual call recordings and transcripts. This is where you ensure your AI agents are performing at their best."
      steps={[
        {
          title: "Navigate to the Calls Page",
          description: "Click 'Calls' in the sidebar under Overview. You'll see today's call statistics at the top, followed by a searchable list of all calls.",
        },
        {
          title: "Read the KPI Cards",
          description: "Four cards at the top give you instant insight: Today's Calls (with total talk time), Total Calls (inbound vs outbound split), Average Quality (with sentiment score), and Outcomes (leads, handoffs, failed, active).",
        },
        {
          title: "Filter and Search Calls",
          description: "Use the search bar to find calls by caller number, agent name, or organisation. Filter by status (completed, in-progress, failed, missed) and direction (inbound, outbound).",
        },
        {
          title: "View Call Details",
          description: "Click any call row to open the detail dialog. You'll see everything: direction, duration, caller info, agent, quality score, sentiment, call state, AI disclosure status, lead info, summary, and full outcome.",
        },
        {
          title: "Analyse Quality Scores",
          description: "Each call gets an automatic quality score based on conversation flow, resolution, and customer sentiment. Low scores highlight calls that need attention.",
        },
        {
          title: "Explore the Analytics Dashboard",
          description: "Click 'Analytics' in the sidebar for deeper insights. Six tabs cover call trends, activity patterns, sentiment analysis, quality distribution, agent performance, and more.",
          detail: "Use the global date range picker at the top to analyse any time period.",
        },
        {
          title: "Export and Report",
          description: "Use the analytics data to create reports for stakeholders. The Revenue page combines financial data with call metrics for comprehensive business reporting.",
        },
      ]}
      tips={[
        { text: "Check the Calls page first thing each morning to review overnight activity." },
        { text: "Use the quality score filter to quickly find calls that need your review." },
        { text: "Monitor sentiment trends weekly - declining sentiment may indicate issues with agent configuration." },
        { text: "Pay special attention to 'failed' calls - these may reveal technical or configuration problems." },
        { text: "The Analytics dashboard is great for weekly and monthly reporting to stakeholders." },
      ]}
      troubleshooting={[
        {
          problem: "Call quality scores seem too low across the board",
          solution: "Review your agent's personality and FAQ settings. Also check if the knowledge base has up-to-date information for common questions.",
        },
        {
          problem: "I see many 'missed' calls in the log",
          solution: "This usually means no agent was available. Check your concurrent call limits and agent configuration.",
        },
        {
          problem: "Sentiment analysis shows mostly negative scores",
          solution: "Listen to a sample of calls to understand the pattern. It may be an issue with the agent's tone, or it could reflect a genuine customer service issue to address.",
        },
      ]}
      keyTerms={[
        { term: "Quality Score", definition: "An automatic rating (0-100) measuring how well the AI handled the conversation." },
        { term: "Sentiment", definition: "Whether the caller's mood was positive, neutral, or negative during the call." },
        { term: "Handoff", definition: "When the AI transfers a call to a human agent because it can't resolve the query." },
        { term: "Lead", definition: "A caller identified as a potential customer or business opportunity." },
        { term: "Call State", definition: "The current stage of a call in the system (ringing, connected, completed, etc.)." },
      ]}
      imageSrc="/guide/monitoring-hero.png"
      imageAlt="Call monitoring dashboard"
      videoSrc="/guide/monitoring-tutorial.mp4"
      videoTitle="Video: Monitoring Calls and Analysing Performance - Step by Step"
      prevModule={{ title: "Outbound Campaigns", href: "/guide/campaigns" }}
      nextModule={{ title: "Compliance & DNC", href: "/guide/compliance" }}
    />
  );
}
