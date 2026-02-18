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
  Shield,
  ArrowRight,
  Server,
  UserCheck,
  Wallet,
  Lock,
  Bot,
  Copyright,
  Ban,
  Users,
  AlertTriangle,
  LogOut,
  FileEdit,
  Scale,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions | GoRigo",
  description:
    "GoRigo's Terms & Conditions outline your rights and responsibilities when using our AI call centre platform, including billing, data protection, acceptable use, and governing law.",
  openGraph: {
    title: "Terms & Conditions | GoRigo",
    description:
      "GoRigo's Terms & Conditions outline your rights and responsibilities when using our AI call centre platform, including billing, data protection, and acceptable use.",
  },
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-background" data-testid="page-terms">
        <WebPageJsonLd
          title="Terms & Conditions | GoRigo"
          description="GoRigo's Terms & Conditions outline your rights and responsibilities when using our AI call centre platform, including billing, data protection, acceptable use, and governing law."
          url="/terms"
        />
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "/" },
            { name: "Terms & Conditions", url: "/terms" },
          ]}
        />
        <Navbar />
        <Breadcrumbs items={[{ label: "Terms & Conditions" }]} />

        <section className="relative" data-testid="section-terms-hero">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-20 text-center">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6" data-testid="badge-terms">
              Legal Agreement
            </p>
            <h1
              className="text-4xl sm:text-5xl font-light tracking-tight leading-[1.1]"
              data-testid="text-terms-hero-title"
            >
              Terms &amp;
              <br />
              <span className="font-normal">Conditions</span>
            </h1>
            <p
              className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
              data-testid="text-terms-hero-subtitle"
            >
              Everything you need to know about using the GoRigo platform,
              written in plain, straightforward language.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Last updated: February 2026
            </p>
          </div>
        </section>

        {/* 1. Acceptance of Terms */}
        <section className="py-16" data-testid="section-acceptance">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-acceptance-title">
                1. Acceptance of Terms
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              By creating an account on the GoRigo platform, you confirm that you have read,
              understood, and agree to be bound by these Terms &amp; Conditions. You must be
              at least 18 years of age to use this platform.
            </p>

            <Card>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Account creation constitutes acceptance of these terms in full.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>You must be 18 years of age or older to create an account and use GoRigo services.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>If you are accepting on behalf of an organisation, you confirm you have the authority to bind that organisation.</span>
                  </li>
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Terms version: 1.0 &mdash; Effective: February 2026
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 2. Platform Services */}
        <section className="py-16 border-t border-border/50" data-testid="section-services">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Server className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-services-title">
                2. Platform Services
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              GoRigo is a business-to-business (B2B) AI call centre platform. We provide
              the following core services to registered organisations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">Core Capabilities</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>AI call centre automation with intelligent voice agents.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Real-time analytics and conversation intelligence.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Partner and affiliate management.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Knowledge base management and processing.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Multi-agent orchestration across departments.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">AI Grounding</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>All AI interactions are RAG-grounded (Retrieval-Augmented Generation) to prevent hallucination.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>AI agents respond only from your verified knowledge base content.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>GoRigo is a B2B platform &mdash; not intended for direct consumer use.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 3. Account Responsibilities */}
        <section className="py-16 border-t border-border/50" data-testid="section-account">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-account-title">
                3. Account Responsibilities
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              You are responsible for maintaining the security and integrity of your
              account. The following obligations apply to all registered users.
            </p>

            <Card>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>You are solely responsible for safeguarding your login credentials and must not share them with third parties.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Strong passwords are required &mdash; minimum 8 characters with a mix of upper-case, lower-case, numbers, and symbols.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Email verification must be completed to activate your account.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Any suspicious or unauthorised activity must be reported to GoRigo within 24 hours of discovery.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>A maximum of 5 concurrent sessions per account is permitted.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4. Billing & Wallet */}
        <section className="py-16 border-t border-border/50" data-testid="section-billing">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-billing-title">
                4. Billing &amp; Wallet
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              GoRigo operates on a talk-time only billing model. Your wallet balance covers
              all platform usage including calls, AI content generation, assistant queries,
              and knowledge processing. All prices are in GBP (&pound;).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card data-testid="card-tier-explorer">
                <CardContent className="p-6">
                  <h3 className="font-medium mb-1">Explorer</h3>
                  <p className="text-2xl font-semibold text-primary mb-2">&pound;0.12<span className="text-sm font-normal text-muted-foreground">/min</span></p>
                  <p className="text-sm text-muted-foreground">Minimum deposit: &pound;49</p>
                </CardContent>
              </Card>
              <Card data-testid="card-tier-growth">
                <CardContent className="p-6">
                  <h3 className="font-medium mb-1">Growth</h3>
                  <p className="text-2xl font-semibold text-primary mb-2">&pound;0.09<span className="text-sm font-normal text-muted-foreground">/min</span></p>
                  <p className="text-sm text-muted-foreground">Minimum deposit: &pound;149</p>
                </CardContent>
              </Card>
              <Card data-testid="card-tier-enterprise">
                <CardContent className="p-6">
                  <h3 className="font-medium mb-1">Enterprise</h3>
                  <p className="text-2xl font-semibold text-primary mb-2">Custom</p>
                  <p className="text-sm text-muted-foreground">Tailored pricing and terms</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-3">Wallet Terms</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>GoRigo uses a prepaid wallet system with minimum deposit requirements per tier.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Talk-time billing covers ALL platform usage &mdash; calls, AI content generation, assistant queries, and knowledge processing.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Wallet top-ups are non-refundable except where a platform error has resulted in incorrect charges.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>All prices are quoted and charged in British Pounds Sterling (GBP / &pound;).</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 5. Data Protection & Privacy */}
        <section className="py-16 border-t border-border/50" data-testid="section-data-protection">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-data-protection-title">
                5. Data Protection &amp; Privacy
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              We take data protection seriously. GoRigo is fully GDPR compliant and
              committed to safeguarding your data. We will never sell your customer data.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">Data Handling</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Fully GDPR compliant across all services and data processing.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>PII is automatically redacted from call transcripts.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>All data stored in UK South Azure region.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">Security &amp; Rights</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Encryption at rest and in transit (TLS 1.2+ / AES-256).</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Users may request a full data export or deletion at any time.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>GoRigo does not sell, share, or monetise customer data under any circumstances.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 6. AI Disclosure & Compliance */}
        <section className="py-16 border-t border-border/50" data-testid="section-ai-disclosure">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-ai-disclosure-title">
                6. AI Disclosure &amp; Compliance
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              GoRigo is committed to transparent and responsible AI use. All AI-powered
              calls include mandatory disclosures and comply with relevant regulations.
            </p>

            <Card>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>All AI-initiated calls carry a mandatory AI disclosure at the start of the conversation.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Full TCPA and FCC Do Not Call (DNC) compliance is enforced across all outbound campaigns.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Active prompt injection detection protects against adversarial manipulation of AI agents.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Knowledge-grounded AI only &mdash; no ungrounded LLM queries are permitted on the platform.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 7. Intellectual Property */}
        <section className="py-16 border-t border-border/50" data-testid="section-ip">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Copyright className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-ip-title">
                7. Intellectual Property
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Clarity on who owns what &mdash; your content stays yours, and our platform remains ours.
            </p>

            <Card>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>The GoRigo platform, its design, code, and features are the intellectual property of International Business Exchange Limited.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Content you upload to your knowledge base remains your intellectual property at all times.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Analytics, reports, and insights generated by the platform are licensed to you for your use within your organisation.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 8. Acceptable Use */}
        <section className="py-16 border-t border-border/50" data-testid="section-acceptable-use">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Ban className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-acceptable-use-title">
                8. Acceptable Use
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              To maintain a safe and reliable platform for all users, the following
              activities are strictly prohibited.
            </p>

            <Card>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Ban className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>No illegal activity of any kind, including fraud, harassment, or activities that violate applicable law.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Ban className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>No circumventing security controls, authentication mechanisms, or access restrictions.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Ban className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>No automated scraping, crawling, or bulk data extraction from the platform.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Ban className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>No reselling of GoRigo services without an active partner agreement.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Ban className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>No uploading of malicious content, malware, or material designed to disrupt the platform.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 9. Partner & Affiliate Terms */}
        <section className="py-16 border-t border-border/50" data-testid="section-partners">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-partners-title">
                9. Partner &amp; Affiliate Terms
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              GoRigo operates a three-tier partner hierarchy. The following terms apply to
              all partner and affiliate relationships.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Business Partners</h3>
                  <p className="text-sm text-muted-foreground">Full platform resale rights with white-label options and dedicated support.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">D2C Partners</h3>
                  <p className="text-sm text-muted-foreground">Direct-to-customer sales with co-branded solutions and marketing support.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Affiliates</h3>
                  <p className="text-sm text-muted-foreground">Referral-based commissions for driving new customers to the GoRigo platform.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-3">Key Partner Terms</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Commission rates are defined in each individual partner agreement.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Commission clawback periods apply where referred customers cancel within the specified window.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Partner lifecycle statuses: pending, active, suspended, terminated, and archived.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 10. Limitation of Liability */}
        <section className="py-16 border-t border-border/50" data-testid="section-liability">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-liability-title">
                10. Limitation of Liability
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              GoRigo&apos;s liability is limited in the following circumstances. Our maximum
              aggregate liability is capped at the total fees you have paid in the
              preceding 12 months.
            </p>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-3">GoRigo is not liable for:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Third-party API outages or service disruptions beyond our control.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Inaccuracies in user-provided knowledge base content used by AI agents.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Missed calls or service interruptions resulting from insufficient wallet balance.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Force majeure events including natural disasters, war, or government action.</span>
                  </li>
                </ul>
                <p className="mt-4 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Maximum liability:</span> Capped at the total fees paid by you to GoRigo in the 12 months immediately preceding the event giving rise to the claim.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 11. Termination */}
        <section className="py-16 border-t border-border/50" data-testid="section-termination">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <LogOut className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-termination-title">
                11. Termination
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Either party may terminate this agreement. The following terms govern
              how termination works and what happens to your data and wallet balance.
            </p>

            <Card>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Either party may terminate with 30 days&apos; written notice.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>GoRigo reserves the right to terminate immediately for violations of these Terms &amp; Conditions.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Your data will be retained for 90 days following termination, after which it will be permanently deleted.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Any active wallet balance will be refunded minus any pending partner commissions or outstanding charges.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 12. Changes to Terms */}
        <section className="py-16 border-t border-border/50" data-testid="section-changes">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <FileEdit className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-changes-title">
                12. Changes to Terms
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              We may update these Terms &amp; Conditions from time to time. Here is how
              we handle changes and what your options are.
            </p>

            <Card>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>We will provide at least 30 days&apos; advance notice for any material changes, sent via email to your registered address.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Continued use of the platform after the notice period constitutes acceptance of the updated terms.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>If you disagree with any changes, you may terminate your account before the changes take effect.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 13. Governing Law */}
        <section className="py-16 border-t border-border/50" data-testid="section-governing-law">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-governing-law-title">
                13. Governing Law
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              These Terms &amp; Conditions are governed by and construed in accordance
              with the laws of England and Wales.
            </p>

            <Card>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>These terms shall be governed by and interpreted in accordance with the laws of England and Wales.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Any disputes arising from or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of England.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 14. Contact */}
        <section className="py-16 border-t border-border/50" data-testid="section-contact">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-light tracking-tight" data-testid="text-contact-title">
                14. Contact
              </h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              If you have any questions about these Terms &amp; Conditions, please
              get in touch with our team.
            </p>

            <Card>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Email: <a href="mailto:support@gorigo.ai" className="text-primary hover:underline">support@gorigo.ai</a></span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Website: <a href="https://gorigo.ai" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">gorigo.ai</a></span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <Link href="/sla" data-testid="link-terms-sla">
                <Button variant="outline">
                  View Service Level Agreement
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <ConversionCta />
        <Footer />
      </div>
    </PublicLayout>
  );
}
