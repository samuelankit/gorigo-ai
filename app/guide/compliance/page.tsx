"use client";

import { TutorialPage } from "@/components/guide/tutorial-page";
import { ShieldCheck } from "lucide-react";

export default function ComplianceGuidePage() {
  return (
    <TutorialPage
      icon={ShieldCheck}
      title="Compliance & DNC Management"
      subtitle="Stay compliant with calling regulations"
      intro="Compliance is critical for any call centre operation. GoRigo includes built-in tools for managing Do Not Call (DNC) lists, tracking consent records, ensuring AI disclosure on every call, and monitoring overall compliance health. This guide walks you through everything you need to stay on the right side of regulations."
      steps={[
        {
          title: "Navigate to the Compliance Page",
          description: "Click 'Compliance' in the sidebar under Management. You'll see your compliance dashboard with DNC statistics, consent records, and overall compliance score.",
        },
        {
          title: "Manage Your DNC List",
          description: "The DNC (Do Not Call) list shows all numbers that must not be contacted. You can add numbers individually or upload a list. The system automatically checks this before every outbound call.",
        },
        {
          title: "Add Numbers to the DNC List",
          description: "Click 'Add Number' and enter the phone number. You can also add notes about why the number was added (e.g., 'Customer requested removal', 'Regulatory requirement').",
          detail: "Numbers added here are blocked across all campaigns and agents platform-wide.",
        },
        {
          title: "Review Consent Records",
          description: "The consent section tracks who has given permission to be called, when, and how. This is your audit trail for regulatory compliance.",
        },
        {
          title: "Verify AI Disclosure Settings",
          description: "Check that AI disclosure is enabled on all your agents. This ensures every caller is informed they're speaking with an AI, which is a legal requirement in many jurisdictions.",
          detail: "Go to each agent's settings to verify the AI disclosure toggle is on.",
        },
        {
          title: "Monitor Compliance Score",
          description: "Your compliance dashboard shows an overall health score based on DNC list freshness, consent coverage, AI disclosure rates, and call quality metrics.",
        },
        {
          title: "Set Up Compliance Automation",
          description: "In Platform Settings, configure automatic compliance checks: DNC scrubbing before campaigns, consent verification on inbound, and regular compliance reports.",
        },
      ]}
      tips={[
        { text: "Update your DNC list regularly - ideally sync with the official TCPA/FCC registers monthly." },
        { text: "Keep consent records for at least 5 years to satisfy audit requirements." },
        { text: "Enable AI disclosure globally in Platform Settings to ensure no agent misses it." },
        { text: "Review compliance reports weekly and address any flagged issues immediately." },
        { text: "Train your team on data protection requirements - compliance is everyone's responsibility." },
      ]}
      troubleshooting={[
        {
          problem: "A number on the DNC list was still called",
          solution: "Check when the number was added vs when the call was made. DNC additions take effect immediately but won't stop calls already in progress.",
        },
        {
          problem: "Compliance score dropped suddenly",
          solution: "Check the compliance dashboard for specific failing checks. Common causes: expired consent records, agents with AI disclosure disabled, or DNC list not updated recently.",
        },
        {
          problem: "I need to export DNC data for an audit",
          solution: "Use the export feature on the Compliance page to download your full DNC list and consent records in CSV format.",
        },
      ]}
      keyTerms={[
        { term: "DNC", definition: "Do Not Call - a register of phone numbers that legally cannot be contacted for telemarketing." },
        { term: "TCPA", definition: "Telephone Consumer Protection Act - US law governing telemarketing calls and consent." },
        { term: "FCC", definition: "Federal Communications Commission - the US regulator overseeing telecommunications." },
        { term: "Consent", definition: "A person's explicit permission to receive automated calls, required by law." },
        { term: "AI Disclosure", definition: "The legal requirement to tell callers they're speaking with an artificial intelligence." },
        { term: "PII", definition: "Personally Identifiable Information - data that can identify a specific person, requiring special handling." },
      ]}
      imageSrc="/guide/compliance-hero.png"
      imageAlt="Compliance management interface"
      videoSrc="/guide/compliance-tutorial.mp4"
      videoTitle="Video: Managing Compliance and DNC Lists - Step by Step"
      prevModule={{ title: "Call Monitoring", href: "/guide/monitoring" }}
    />
  );
}
