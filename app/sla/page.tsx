import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Shield,
  ArrowRight,
  AlertTriangle,
  Database,
  Headphones,
  Scale,
  Users,
  Star,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Service Level Agreement (SLA) | GoRigo",
  description:
    "GoRigo's Service Level Agreement outlines our uptime guarantees, support response times, compensation policy, and data protection commitments for all deployment packages.",
  openGraph: {
    title: "Service Level Agreement (SLA) | GoRigo",
    description:
      "GoRigo's Service Level Agreement outlines our uptime guarantees, support response times, compensation policy, and data protection commitments.",
  },
  alternates: {
    canonical: "/sla",
  },
};

const uptimeCommitments = [
  {
    plan: "Managed",
    uptime: "99.9%",
    monthlyDowntime: "~43 minutes",
    description: "Enterprise-grade reliability with proactive monitoring and automatic failover.",
    accentColor: "from-amber-500 to-orange-500",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-600 dark:text-amber-400",
  },
  {
    plan: "Team",
    uptime: "99.9%",
    monthlyDowntime: "~43 minutes",
    description: "Same enterprise-grade reliability as Managed, with faster response times, dedicated escalation, and stronger accountability.",
    accentColor: "from-indigo-500 to-violet-500",
    badgeBg: "bg-indigo-500/10",
    badgeText: "text-indigo-600 dark:text-indigo-400",
  },
  {
    plan: "Self-Hosted",
    uptime: "Varies",
    monthlyDowntime: "Depends on your infrastructure",
    description: "You control the hosting. We provide the software updates, patches, and guidance.",
    accentColor: "from-blue-500 to-violet-500",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-600 dark:text-blue-400",
  },
  {
    plan: "Custom / Enterprise",
    uptime: "Negotiated",
    monthlyDowntime: "Per agreement",
    description: "Bespoke SLA tailored to your exact requirements, with dedicated uptime targets.",
    accentColor: "from-emerald-500 to-teal-500",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-600 dark:text-emerald-400",
  },
];

const supportTiers = [
  {
    plan: "Managed",
    critical: "1 hour",
    high: "4 hours",
    medium: "1 business day",
    low: "2 business days",
    channels: "Phone, Email, Live Chat, Dedicated Slack",
  },
  {
    plan: "Team",
    critical: "30 minutes",
    high: "2 hours",
    medium: "4 hours",
    low: "1 business day",
    channels: "Phone, Email, Live Chat, Dedicated Slack, Video Call Escalation",
  },
  {
    plan: "Self-Hosted",
    critical: "4 hours",
    high: "1 business day",
    medium: "2 business days",
    low: "5 business days",
    channels: "Email, Support Portal",
  },
  {
    plan: "Custom",
    critical: "Per agreement",
    high: "Per agreement",
    medium: "Per agreement",
    low: "Per agreement",
    channels: "Dedicated account manager + custom channels",
  },
];

const creditTiers = [
  { downtime: "Less than target but above 99.0%", managedCredit: "10%", teamCredit: "15%" },
  { downtime: "Between 98.0% and 99.0%", managedCredit: "25%", teamCredit: "35%" },
  { downtime: "Between 95.0% and 98.0%", managedCredit: "50%", teamCredit: "60%" },
  { downtime: "Below 95.0%", managedCredit: "100%", teamCredit: "100%" },
];

const sectionIcons = [
  { icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Headphones, color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Scale, color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: AlertTriangle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: Database, color: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: Scale, color: "text-amber-500", bg: "bg-amber-500/10" },
];

export default function SlaPage() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-background" data-testid="page-sla">
        <WebPageJsonLd
          title="Service Level Agreement (SLA) | GoRigo"
          description="GoRigo's Service Level Agreement outlines our uptime guarantees, support response times, compensation policy, and data protection commitments."
          url="/sla"
        />
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "/" },
            { name: "Service Level Agreement", url: "/sla" },
          ]}
        />
        <Navbar />
        <Breadcrumbs items={[{ label: "Service Level Agreement" }]} />

        <section className="relative overflow-hidden" data-testid="section-sla-hero">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-orange-500/8 dark:from-amber-500/5 dark:to-orange-500/5" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.10),transparent_65%)]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.06),transparent_70%)]" />
          <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-20 text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wide border-amber-500/30 text-amber-600 dark:text-amber-400" data-testid="badge-sla">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Our Promise to You
            </Badge>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]"
              data-testid="text-sla-hero-title"
            >
              Service Level
              <br />
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">Agreement</span>
            </h1>
            <p
              className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
              data-testid="text-sla-hero-subtitle"
            >
              We believe in transparency. Here is exactly what you can expect
              from GoRigo in plain, straightforward language.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Last updated: February 2026
            </p>
          </div>
        </section>

        <section className="py-16" data-testid="section-uptime">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${sectionIcons[0].bg}`}>
                <Shield className={`h-4 w-4 ${sectionIcons[0].color}`} />
              </span>
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-uptime-title">
                1. Uptime Guarantees
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              We commit to keeping GoRigo available and running. &quot;Uptime&quot; means
              the percentage of time our platform is accessible and working
              properly during any calendar month.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uptimeCommitments.map((item) => (
                <Card key={item.plan} data-testid={`card-uptime-${item.plan.toLowerCase().replace(/[\s/]+/g, "-")}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                      <h3 className="font-medium">{item.plan}</h3>
                      <span className={`text-lg font-semibold bg-gradient-to-r ${item.accentColor} bg-clip-text text-transparent`}>{item.uptime}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Max monthly downtime: {item.monthlyDowntime}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="font-medium mb-3">What counts as downtime?</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>The GoRigo platform or API is completely unreachable for more than 5 consecutive minutes.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Calls cannot be placed or received due to a fault on our side.</span>
                  </li>
                </ul>
                <h3 className="font-medium mb-3 mt-5">What does not count as downtime?</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>Scheduled maintenance (we give at least 48 hours&apos; notice via email and dashboard).</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>Outages caused by your own infrastructure, third-party API providers, or internet connectivity.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>Force majeure events (natural disasters, war, government action).</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="relative py-16" data-testid="section-support">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent dark:from-blue-500/[0.02]" />
          <div className="relative max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${sectionIcons[1].bg}`}>
                <Headphones className={`h-4 w-4 ${sectionIcons[1].color}`} />
              </span>
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-support-title">
                2. Support Response Times
              </h2>
            </div>
            <p className="text-muted-foreground mb-4 max-w-2xl">
              When something goes wrong, we respond quickly. Response time
              means the time from when you report an issue to when a real
              person acknowledges it and begins working on a fix.
            </p>
            <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
              <span className="font-medium text-foreground">Priority levels explained:</span>{" "}
              Critical = service is down or calls cannot be made. High = major feature broken but workaround exists.
              Medium = non-urgent bug or question. Low = feature request or general enquiry.
            </p>

            <Card data-testid="card-support-table">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Package</th>
                        <th className="text-center p-4 font-medium text-muted-foreground">Critical</th>
                        <th className="text-center p-4 font-medium text-muted-foreground">High</th>
                        <th className="text-center p-4 font-medium text-muted-foreground">Medium</th>
                        <th className="text-center p-4 font-medium text-muted-foreground">Low</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supportTiers.map((tier, i) => (
                        <tr
                          key={tier.plan}
                          className={i < supportTiers.length - 1 ? "border-b border-border/50" : ""}
                          data-testid={`row-support-${tier.plan.toLowerCase()}`}
                        >
                          <td className="p-4 font-medium">{tier.plan}</td>
                          <td className="p-4 text-center">{tier.critical}</td>
                          <td className="p-4 text-center">{tier.high}</td>
                          <td className="p-4 text-center">{tier.medium}</td>
                          <td className="p-4 text-center">{tier.low}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {supportTiers.slice(0, 3).map((tier) => (
                <Card key={tier.plan} data-testid={`card-channels-${tier.plan.toLowerCase()}`}>
                  <CardContent className="p-6">
                    <h3 className="font-medium mb-2">{tier.plan} Support Channels</h3>
                    <p className="text-sm text-muted-foreground">{tier.channels}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-16" data-testid="section-compensation">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.03] to-transparent dark:from-violet-500/[0.02]" />
          <div className="relative max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${sectionIcons[2].bg}`}>
                <Scale className={`h-4 w-4 ${sectionIcons[2].color}`} />
              </span>
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-compensation-title">
                3. What Happens If We Miss Our Targets
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              If we fail to meet the uptime commitment for your package, you
              are entitled to service credits. These credits are applied to your
              next billing period automatically -- you do not need to ask for them.
            </p>

            <Card data-testid="card-credits-table">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Monthly Uptime</th>
                        <th className="text-center p-4 font-medium text-muted-foreground">Managed Credit</th>
                        <th className="text-center p-4 font-medium text-indigo-600 dark:text-indigo-400">Team Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditTiers.map((tier, i) => (
                        <tr
                          key={tier.downtime}
                          className={i < creditTiers.length - 1 ? "border-b border-border/50" : ""}
                          data-testid={`row-credit-${i}`}
                        >
                          <td className="p-4">{tier.downtime}</td>
                          <td className="p-4 text-center font-medium">{tier.managedCredit}</td>
                          <td className="p-4 text-center font-medium text-indigo-600 dark:text-indigo-400">{tier.teamCredit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="font-medium mb-3">How credits work</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>Credits are calculated based on your talk-time spend in the affected month.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>For widespread outages, credits are applied automatically to your wallet within 5 business days.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>Credits cannot be converted to cash or transferred between accounts.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>Maximum credit in any single month is capped at 100% of that month&apos;s spend.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="relative py-16" data-testid="section-incidents">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] to-transparent dark:from-emerald-500/[0.02]" />
          <div className="relative max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${sectionIcons[3].bg}`}>
                <AlertTriangle className={`h-4 w-4 ${sectionIcons[3].color}`} />
              </span>
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-incidents-title">
                4. How We Handle Incidents
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              When something goes wrong, we follow a clear process to get things
              back on track and keep you informed every step of the way.
            </p>

            <div className="space-y-4">
              {[
                { step: 1, title: "Detection", description: "Our automated monitoring systems detect issues within seconds. We also accept reports from customers via support channels.", color: "text-amber-500", bg: "bg-amber-500/10" },
                { step: 2, title: "Acknowledgement", description: "We acknowledge the issue publicly on our status page and send notifications to affected customers via email and dashboard alerts.", color: "text-blue-500", bg: "bg-blue-500/10" },
                { step: 3, title: "Updates", description: "We post updates every 30 minutes for critical incidents and every 2 hours for high-priority issues until resolved. You will never be left wondering what is happening.", color: "text-violet-500", bg: "bg-violet-500/10" },
                { step: 4, title: "Resolution", description: "Once the issue is fixed, we confirm resolution and monitor closely for 24 hours to ensure stability.", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { step: 5, title: "Post-Incident Review", description: "Within 5 business days, we publish a Root Cause Analysis explaining what happened, why, and what we are doing to prevent it from happening again. Managed and Custom clients receive a private, detailed report. Team clients receive their post-mortem within 48 hours via their dedicated escalation contact.", color: "text-rose-500", bg: "bg-rose-500/10" },
              ].map((item) => (
                <Card key={item.step}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${item.bg} ${item.color} text-sm font-semibold shrink-0`}>{item.step}</div>
                      <div>
                        <h3 className="font-medium mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-16" data-testid="section-team-sla-extras">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.03] to-transparent dark:from-indigo-500/[0.02]" />
          <div className="relative max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-indigo-500/10">
                <Star className="h-4 w-4 text-indigo-500" />
              </span>
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-team-extras-title">
                4b. Team SLA Extras
              </h2>
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400" data-testid="badge-team-extras">
                Team Package
              </Badge>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Team package customers receive these additional SLA commitments
              beyond the standard Managed package, providing stronger accountability
              and faster resolution for your entire organisation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Dedicated Escalation Path",
                  description: "A named contact for escalation, not a ticket queue. Your issues go directly to a person who knows your account.",
                  icon: Users,
                },
                {
                  title: "Monthly SLA Review Call",
                  description: "A scheduled monthly call with your account manager to review SLA performance, discuss upcoming needs, and address any concerns.",
                  icon: Headphones,
                },
                {
                  title: "48-Hour Incident Post-Mortem",
                  description: "Receive a detailed post-mortem within 48 hours of any incident, compared to 5 business days for Managed clients.",
                  icon: Clock,
                },
                {
                  title: "Quarterly Capacity Planning",
                  description: "Proactive capacity planning reviews every quarter to ensure your infrastructure scales with your team's growth.",
                  icon: Database,
                },
                {
                  title: "Priority Incident Resolution",
                  description: "Team incidents are prioritised and resolved before the Managed queue, ensuring your organisation gets back online faster.",
                  icon: AlertTriangle,
                },
                {
                  title: "Enhanced Data Recovery",
                  description: "Recovery Time Objective (RTO): 2 hours (vs Managed's 4 hours). Recovery Point Objective (RPO): 30 minutes (vs Managed's 1 hour).",
                  icon: Shield,
                },
                {
                  title: "Budget Overspend Protection",
                  description: "Guarantee that department spending caps are enforced accurately. If a system error allows overspend, the excess amount is credited back.",
                  icon: Scale,
                },
              ].map((item) => (
                <Card key={item.title} data-testid={`card-team-extra-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-indigo-500/10 shrink-0">
                        <item.icon className="h-4 w-4 text-indigo-500" />
                      </span>
                      <div>
                        <h3 className="font-medium mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-16" data-testid="section-data-protection">
          <div className="absolute inset-0 bg-gradient-to-b from-rose-500/[0.03] to-transparent dark:from-rose-500/[0.02]" />
          <div className="relative max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${sectionIcons[4].bg}`}>
                <Database className={`h-4 w-4 ${sectionIcons[4].color}`} />
              </span>
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-data-title">
                5. Data Protection and Recovery
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Your data is important. Here is how we protect it across all
              deployment packages.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">Backups</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Automated daily backups with 30-day retention (Managed).</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Point-in-time recovery available for Managed clients (last 7 days).</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Self-Hosted clients manage their own backup schedule with our guidance.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">Recovery Targets</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span><span className="font-medium text-foreground">Recovery Time (RTO):</span> Team: 2 hours. Managed: 4 hours. Self-Hosted: your responsibility.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span><span className="font-medium text-foreground">Recovery Point (RPO):</span> Team: 30 minutes. Managed: 1 hour. Self-Hosted: your configuration.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">Encryption</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>All data encrypted in transit (TLS 1.2+) and at rest (AES-256).</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>Call recordings encrypted with per-organisation keys.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">Data Residency</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Database className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                      <span>Managed data hosted in the UK (London region) by default.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Database className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                      <span>Custom plans can specify alternative regions (EU, US, APAC).</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="relative py-16" data-testid="section-legal">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.03] to-transparent dark:from-amber-500/[0.02]" />
          <div className="relative max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${sectionIcons[5].bg}`}>
                <Scale className={`h-4 w-4 ${sectionIcons[5].color}`} />
              </span>
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-legal-title">
                6. Legal Terms
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              The important legal bits, written as clearly as we can.
            </p>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Who is this agreement between?</h3>
                  <p className="text-sm text-muted-foreground">
                    This SLA is between International Business Exchange Limited (trading as GoRigo, company number 15985956, registered in England and Wales, Cotton Court Business Centre, Cotton Ct, Preston PR1 3BY, England) and you, the customer using GoRigo services. It forms part of your service agreement with us and applies from the moment you start using any paid GoRigo service.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">How long does this agreement last?</h3>
                  <p className="text-sm text-muted-foreground">
                    This SLA applies for as long as you are an active GoRigo customer. It renews automatically each calendar month. We may update this SLA with 30 days&apos; written notice. If a change reduces your service level, you may terminate without penalty within that notice period.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Limitation of liability</h3>
                  <p className="text-sm text-muted-foreground">
                    Service credits described in Section 3 are your sole and exclusive remedy for any failure to meet the uptime commitment. Our total liability under this SLA shall not exceed the fees you paid to GoRigo in the 12 months immediately preceding the claim. Nothing in this SLA excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under English law.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Your responsibilities</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>Maintain a valid and funded wallet balance to ensure uninterrupted service.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>Report issues promptly through the appropriate support channels for your package.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>Keep your account credentials secure and enable two-factor authentication where available.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>For Self-Hosted customers: maintain your hosting infrastructure according to our minimum requirements.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Governing law</h3>
                  <p className="text-sm text-muted-foreground">
                    This SLA is governed by the laws of England and Wales. Any disputes arising under this SLA shall be subject to the exclusive jurisdiction of the courts of England and Wales. We will always attempt to resolve any disputes through good-faith negotiation before taking any formal legal action.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">How to make a claim</h3>
                  <p className="text-sm text-muted-foreground">
                    To request SLA credits, email <span className="font-medium text-foreground">support@gorigo.ai</span> within 30 days of the incident with your account details and a description of the issue. We will review your claim and respond within 10 business days. Credits, if applicable, will be applied to your wallet automatically.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border/50" data-testid="section-sla-cta">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-light tracking-tight mb-4" data-testid="text-sla-cta-title">
              Questions about our SLA?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Our team is happy to walk you through the details and discuss
              custom SLA terms for enterprise needs.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/contact">
                <Button size="lg" data-testid="button-sla-contact">
                  Talk to Us
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" data-testid="button-sla-pricing">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <ConversionCta talkToAiMessage="Talk to AI about our SLA commitments" />
        <Footer />
      </div>
    </PublicLayout>
  );
}
