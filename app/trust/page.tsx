import { Metadata } from "next";
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
  Shield,
  Lock,
  Eye,
  Server,
  Users,
  FileCheck,
  AlertTriangle,
  Globe,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Database,
  Key,
  Fingerprint,
  Ban,
  PhoneOff,
  Scale,
  Building2,
  MapPin,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Trust Centre - Security & Compliance | GoRigo",
  description:
    "Learn how GoRigo protects your data and customers. Our security practices include encryption, prompt injection detection, PII redaction, multi-tenant isolation, and UK regulatory compliance. Azure UK South data residency.",
  openGraph: {
    title: "Trust Centre - Security & Compliance | GoRigo",
    description:
      "Learn how GoRigo protects your data and customers. Encryption, prompt injection detection, PII redaction, and UK data residency.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trust Centre - Security & Compliance | GoRigo",
    description:
      "Learn how GoRigo protects your data and customers. Our security practices include encryption, prompt injection detection, PII redaction, and UK regulatory compliance.",
  },
  alternates: {
    canonical: "/trust",
  },
};

const securityPractices = [
  {
    icon: Lock,
    title: "Encryption in Transit",
    description:
      "All data transmitted between your browser, our servers, and third-party providers is encrypted using TLS 1.2+ with managed certificates. No unencrypted connections are accepted.",
    status: "active" as const,
  },
  {
    icon: Database,
    title: "Encryption at Rest",
    description:
      "Your data is stored in Azure-managed PostgreSQL with transparent data encryption (TDE) enabled by default. Backups are encrypted using Azure's platform-managed keys.",
    status: "active" as const,
  },
  {
    icon: ShieldCheck,
    title: "Prompt Injection Detection",
    description:
      "All user inputs to AI agents are screened through a multi-pattern detection system with 35+ attack signatures. Jailbreak attempts, system prompt extraction, and role manipulation are blocked before reaching the AI model.",
    status: "active" as const,
  },
  {
    icon: Eye,
    title: "PII Auto-Redaction",
    description:
      "Personally identifiable information — including names, phone numbers, email addresses, and card numbers — is automatically detected and redacted from call transcripts and logs.",
    status: "active" as const,
  },
  {
    icon: Users,
    title: "Multi-Tenant Isolation",
    description:
      "Every organisation's data is strictly isolated using unique organisation identifiers (orgId) enforced at the database query level. No client can access another client's data, agents, or call records.",
    status: "active" as const,
  },
  {
    icon: Key,
    title: "Session-Based Authentication",
    description:
      "User sessions are managed with secure, HTTP-only cookies and bcrypt password hashing. Sessions are invalidated on logout and expire automatically after inactivity.",
    status: "active" as const,
  },
  {
    icon: Fingerprint,
    title: "Role-Based Access Control",
    description:
      "Fine-grained permissions via globalRole assignments (SuperAdmin, OrgAdmin, Agent, Viewer). API routes enforce role checks before any data access or modification.",
    status: "active" as const,
  },
  {
    icon: AlertTriangle,
    title: "AI Agent Hardening",
    description:
      "Every AI agent's system prompt includes a security preamble that prevents instruction override, role manipulation, and cross-client agent attacks via phone interactions.",
    status: "active" as const,
  },
];

const compliancePractices = [
  {
    icon: Ban,
    title: "DNC / TPS Compliance",
    description:
      "Built-in Do Not Call registry management integrated with the UK Telephone Preference Service (TPS). Numbers on the DNC list are automatically blocked from outbound calls.",
    status: "active" as const,
  },
  {
    icon: PhoneOff,
    title: "AI Disclosure on Calls",
    description:
      "All AI-handled calls begin with a clear disclosure that the caller is speaking with an AI assistant. This meets emerging regulatory expectations for AI transparency in customer interactions.",
    status: "active" as const,
  },
  {
    icon: FileCheck,
    title: "Consent Management",
    description:
      "Call recording consent is captured at the start of each interaction. Consent records are stored and auditable. Callers can opt out at any time.",
    status: "active" as const,
  },
  {
    icon: Scale,
    title: "GDPR Data Handling",
    description:
      "Data processing follows GDPR principles: purpose limitation, data minimisation, and storage limitation. Users can request data access, correction, or deletion through their organisation admin.",
    status: "active" as const,
  },
];

const infrastructurePractices = [
  {
    icon: MapPin,
    title: "UK Data Residency",
    description:
      "All platform infrastructure is deployed in Azure UK South (London). Your data never leaves UK soil. This satisfies data sovereignty requirements for UK-regulated industries.",
  },
  {
    icon: Server,
    title: "Azure Container Apps",
    description:
      "Production workloads run on Azure Container Apps with auto-scaling, health checks, and zero-downtime deployments. Infrastructure is defined as code for repeatability.",
  },
  {
    icon: Globe,
    title: "DDoS Protection",
    description:
      "Azure Front Door provides enterprise-grade DDoS protection and Web Application Firewall (WAF) capabilities at the network edge.",
  },
  {
    icon: Database,
    title: "Managed Database",
    description:
      "Azure PostgreSQL Flexible Server with automated backups, point-in-time restore, and high availability. Database connections are encrypted and access is restricted to the application network.",
  },
];

const roadmapItems = [
  {
    title: "SOC 2 Type I",
    description: "Independent audit of security controls design and implementation.",
    timeline: "Planned",
    icon: Shield,
  },
  {
    title: "SOC 2 Type II",
    description: "Ongoing audit of security controls effectiveness over time.",
    timeline: "Following Type I",
    icon: ShieldCheck,
  },
  {
    title: "ISO 27001",
    description: "International standard for information security management systems.",
    timeline: "Planned",
    icon: FileCheck,
  },
  {
    title: "ICO Registration",
    description: "Registration with the UK Information Commissioner's Office as a data processor.",
    timeline: "In Progress",
    icon: Building2,
  },
  {
    title: "Cyber Essentials",
    description: "UK government-backed certification for baseline cyber security practices.",
    timeline: "Planned",
    icon: Lock,
  },
];

function StatusBadge({ status }: { status: "active" | "planned" }) {
  if (status === "active") {
    return (
      <Badge variant="outline" className="text-xs" data-testid="badge-status-active">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs" data-testid="badge-status-planned">
      <Clock className="h-3 w-3 mr-1" />
      Planned
    </Badge>
  );
}

export default function TrustCenterPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-trust">
      <WebPageJsonLd
        title="Trust Centre - Security & Compliance | GoRigo"
        description="Learn how GoRigo protects your data and customers. Our security practices include encryption, prompt injection detection, PII redaction, multi-tenant isolation, and UK regulatory compliance."
        url="/trust"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Trust Centre", url: "/trust" },
        ]}
      />
      <Navbar />
      <Breadcrumbs items={[{ label: "Trust Centre" }]} />

      <section className="relative" data-testid="section-trust-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <p
            className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6"
            data-testid="badge-trust"
          >
            Security & Compliance
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-trust-hero-title"
          >
            How we protect
            <br />
            <span className="font-normal">your data</span>
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
            data-testid="text-trust-hero-subtitle"
          >
            Transparency is the foundation of trust. Here is exactly what we do —
            and what we are working towards — to keep your data and your
            customers safe.
          </p>
        </div>
      </section>

      <section className="py-20" data-testid="section-security-practices">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              What We Do Today
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-security-title">
              Security practices in production
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              These are the security measures actively protecting your data right
              now. Every item listed here is implemented and operational — not
              aspirational.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {securityPractices.map((practice) => (
              <Card
                key={practice.title}
                data-testid={`card-security-${practice.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <practice.icon className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-medium text-sm">{practice.title}</h3>
                    </div>
                    <StatusBadge status={practice.status} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {practice.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border/50" data-testid="section-compliance">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Regulatory Compliance
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-compliance-title">
              UK regulatory alignment
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              GoRigo is built to comply with UK regulations governing AI in customer
              communications, data protection, and telephone marketing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {compliancePractices.map((practice) => (
              <Card
                key={practice.title}
                data-testid={`card-compliance-${practice.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <practice.icon className="h-4 w-4 text-blue-500 shrink-0" />
                      <h3 className="font-medium text-sm">{practice.title}</h3>
                    </div>
                    <StatusBadge status={practice.status} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {practice.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border/50" data-testid="section-infrastructure">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Infrastructure
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-infra-title">
              Where your data lives
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              GoRigo runs entirely within Microsoft Azure's UK South region.
              Your data is processed and stored on UK soil.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {infrastructurePractices.map((practice) => (
              <Card
                key={practice.title}
                data-testid={`card-infra-${practice.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-6">
                  <practice.icon className="h-4 w-4 text-violet-500 mb-3" />
                  <h3 className="font-medium text-sm mb-2">{practice.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {practice.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border/50" data-testid="section-roadmap">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Compliance Roadmap
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-roadmap-title">
              What we are working towards
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              We believe in honesty. These certifications are on our roadmap but
              have not yet been achieved. We will update this page as each
              milestone is completed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmapItems.map((item) => (
              <Card
                key={item.title}
                data-testid={`card-roadmap-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <h3 className="font-medium text-sm">{item.title}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-roadmap-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <Clock className="h-3 w-3 mr-1" />
                      {item.timeline}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-border/50" data-testid="section-commitment">
        <div className="max-w-4xl mx-auto px-6">
          <Card data-testid="card-commitment">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <Shield className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-lg mb-2">Our Commitment</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    GoRigo is operated by International Business Exchange Limited
                    (UK Company No. 15985956). We are committed to protecting your
                    data with the same rigour we expect from our own service
                    providers. If you have security questions or need to report a
                    vulnerability, please contact us directly.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href="/contact">
                      <Button size="sm" data-testid="button-trust-contact">
                        Contact Security Team
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <a href="mailto:security@gorigo.ai">
                      <Button variant="outline" size="sm" data-testid="button-trust-email">
                        security@gorigo.ai
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <ConversionCta
        headline="Questions About Security?"
        subheadline="Our team is happy to walk through our security practices, answer compliance questions, or discuss specific requirements for your industry."
        primaryAction={{ label: "Talk to Us", href: "/contact" }}
        secondaryAction={{ label: "View Pricing", href: "/pricing" }}
      />
      <Footer />
    </div>
    </PublicLayout>
  );
}
