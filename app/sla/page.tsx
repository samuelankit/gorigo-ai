import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
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
  },
  {
    plan: "Self-Hosted",
    uptime: "Varies",
    monthlyDowntime: "Depends on your infrastructure",
    description: "You control the hosting. We provide the software updates, patches, and guidance.",
  },
  {
    plan: "Custom / Enterprise",
    uptime: "Negotiated",
    monthlyDowntime: "Per agreement",
    description: "Bespoke SLA tailored to your exact requirements, with dedicated uptime targets.",
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
  { downtime: "Less than target but above 99.0%", credit: "10% of monthly spend" },
  { downtime: "Between 98.0% and 99.0%", credit: "25% of monthly spend" },
  { downtime: "Between 95.0% and 98.0%", credit: "50% of monthly spend" },
  { downtime: "Below 95.0%", credit: "100% of monthly spend" },
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

        <section className="relative" data-testid="section-sla-hero">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-20 text-center">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6" data-testid="badge-sla">
              Our Promise to You
            </p>
            <h1
              className="text-4xl sm:text-5xl font-light tracking-tight leading-[1.1]"
              data-testid="text-sla-hero-title"
            >
              Service Level
              <br />
              <span className="font-normal">Agreement</span>
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
              <Shield className="h-5 w-5 text-primary" />
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
                      <span className="text-lg font-semibold text-primary">{item.uptime}</span>
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
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>The GoRigo platform or API is completely unreachable for more than 5 consecutive minutes.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Calls cannot be placed or received due to a fault on our side.</span>
                  </li>
                </ul>
                <h3 className="font-medium mb-3 mt-5">What does not count as downtime?</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Scheduled maintenance (we give at least 48 hours&apos; notice via email and dashboard).</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Outages caused by your own infrastructure, third-party API providers, or internet connectivity.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Force majeure events (natural disasters, war, government action).</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 border-t border-border/50" data-testid="section-support">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Headphones className="h-5 w-5 text-primary" />
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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {supportTiers.slice(0, 2).map((tier) => (
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

        <section className="py-16 border-t border-border/50" data-testid="section-compensation">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Scale className="h-5 w-5 text-primary" />
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
                        <th className="text-left p-4 font-medium text-muted-foreground">Credit Amount</th>
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
                          <td className="p-4 font-medium">{tier.credit}</td>
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
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Credits are calculated based on your talk-time spend in the affected month.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>For widespread outages, credits are applied automatically to your wallet within 5 business days.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Credits cannot be converted to cash or transferred between accounts.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Maximum credit in any single month is capped at 100% of that month&apos;s spend.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 border-t border-border/50" data-testid="section-incidents">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-incidents-title">
                4. How We Handle Incidents
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              When something goes wrong, we follow a clear process to get things
              back on track and keep you informed every step of the way.
            </p>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">1</div>
                    <div>
                      <h3 className="font-medium mb-1">Detection</h3>
                      <p className="text-sm text-muted-foreground">
                        Our automated monitoring systems detect issues within seconds. We also accept reports from customers via support channels.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">2</div>
                    <div>
                      <h3 className="font-medium mb-1">Acknowledgement</h3>
                      <p className="text-sm text-muted-foreground">
                        We acknowledge the issue publicly on our status page and send notifications to affected customers via email and dashboard alerts.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">3</div>
                    <div>
                      <h3 className="font-medium mb-1">Updates</h3>
                      <p className="text-sm text-muted-foreground">
                        We post updates every 30 minutes for critical incidents and every 2 hours for high-priority issues until resolved. You will never be left wondering what is happening.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">4</div>
                    <div>
                      <h3 className="font-medium mb-1">Resolution</h3>
                      <p className="text-sm text-muted-foreground">
                        Once the issue is fixed, we confirm resolution and monitor closely for 24 hours to ensure stability.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">5</div>
                    <div>
                      <h3 className="font-medium mb-1">Post-Incident Review</h3>
                      <p className="text-sm text-muted-foreground">
                        Within 5 business days, we publish a Root Cause Analysis explaining what happened, why, and what we are doing to prevent it from happening again. Managed and Custom clients receive a private, detailed report.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border/50" data-testid="section-data-protection">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-5 w-5 text-primary" />
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
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Automated daily backups with 30-day retention (Managed).</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Point-in-time recovery available for Managed clients (last 7 days).</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
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
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span><span className="font-medium text-foreground">Recovery Time (RTO):</span> Managed: 4 hours. Self-Hosted: your responsibility.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span><span className="font-medium text-foreground">Recovery Point (RPO):</span> Managed: 1 hour. Self-Hosted: your configuration.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">Encryption</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>All data encrypted in transit (TLS 1.2+) and at rest (AES-256).</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
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
                      <Database className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Managed data hosted in the UK (London region) by default.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Database className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Custom plans can specify alternative regions (EU, US, APAC).</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border/50" data-testid="section-legal">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Scale className="h-5 w-5 text-primary" />
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
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Maintain a valid and funded wallet balance to ensure uninterrupted service.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Report issues promptly through the appropriate support channels for your package.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Keep your account credentials secure and enable two-factor authentication where available.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
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
