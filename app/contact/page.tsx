import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { socialLinks } from "@/lib/social-links";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Phone,
  MapPin,
  CalendarCheck,
  Clock,
  ArrowRight,
  MessageSquare,
  Handshake,
  LifeBuoy,
  Building2,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Contact GoRigo | Book a Demo",
  description:
    "Get in touch with the GoRigo team. Book a demo, enquire about partnerships, or reach out for support. We respond within one business day.",
  openGraph: {
    title: "Contact GoRigo | Book a Demo",
    description:
      "Get in touch with the GoRigo team. Book a demo, enquire about partnerships, or reach out for support.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact GoRigo | Book a Demo",
    description:
      "Get in touch with the GoRigo team. Book a demo, enquire about partnerships, or reach out for support. We respond within one business day.",
  },
  alternates: {
    canonical: "/contact",
  },
};

const emailChannels = [
  {
    icon: MessageSquare,
    label: "General Enquiries",
    email: "hello@gorigo.ai",
    description: "Questions about our platform, features, or getting started.",
    testId: "link-email-general",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Handshake,
    label: "Partnerships",
    email: "partners@gorigo.ai",
    description: "White-label, reseller, and affiliate partnership opportunities.",
    testId: "link-email-partners",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    icon: LifeBuoy,
    label: "Support",
    email: "support@gorigo.ai",
    description: "Technical support and account assistance for existing clients.",
    testId: "link-email-support",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Building2,
    label: "Enterprise",
    email: "enterprise@gorigo.ai",
    description: "Custom deployments, SLAs, and enterprise-grade solutions.",
    testId: "link-email-enterprise",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];


export default function ContactPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-contact">
      <WebPageJsonLd
        title="Contact GoRigo | Book a Demo"
        description="Get in touch with the GoRigo team. Book a demo, enquire about partnerships, or reach out for support. We respond within one business day."
        url="/contact"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ]}
      />
      <Navbar />
      <Breadcrumbs items={[{ label: "Contact" }]} />

      <section className="relative overflow-hidden" data-testid="section-contact-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-violet-500/8 dark:from-blue-500/5 dark:to-violet-500/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12),transparent_65%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06),transparent_70%)]" />

        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wide border-blue-500/30 text-blue-600 dark:text-blue-400" data-testid="badge-contact">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            Contact
          </Badge>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            data-testid="text-contact-hero-title"
          >
            Let&apos;s{" "}
            <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">talk</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Whether you want to see GoRigo in action, explore a partnership, or
            need help with your account — reach out through the channel that
            suits you best.
          </p>
        </div>
      </section>

      <section className="pb-20" data-testid="section-book-demo">
        <div className="max-w-5xl mx-auto px-6">
          <Card className="border-violet-500/20 bg-gradient-to-r from-blue-500/[0.03] to-violet-500/[0.03]" data-testid="card-book-demo">
            <CardContent className="p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-md bg-gradient-to-br from-blue-500/15 to-violet-500/15 flex items-center justify-center shrink-0">
                  <CalendarCheck className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1" data-testid="text-demo-title">
                    Book a Live Demo
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-md">
                    See GoRigo handle real calls with AI agents. We&apos;ll walk
                    you through the platform, answer questions, and tailor the
                    demo to your business.
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                      <Clock className="h-3 w-3 mr-1" />
                      30 min
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      No commitment required
                    </span>
                  </div>
                </div>
              </div>
              <Button asChild size="lg" className="shrink-0" data-testid="button-book-demo">
                <a href="mailto:hello@gorigo.ai?subject=Book%20a%20Demo&body=Hi%20GoRigo%20team%2C%0A%0AI%27d%20like%20to%20book%20a%20live%20demo.%0A%0ACompany%3A%20%0APreferred%20date%2Ftime%3A%20%0A%0AThanks!">
                  Book a Demo
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="relative pb-20" data-testid="section-contact-channels">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.02] to-transparent dark:via-violet-500/[0.01]" />
        <div className="relative max-w-5xl mx-auto px-6">
          <h2 className="text-lg font-semibold mb-6" data-testid="text-channels-heading">
            Get in Touch
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {emailChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <Card key={channel.email} data-testid={`card-channel-${channel.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardContent className="p-5">
                    <div className={`h-9 w-9 rounded-md ${channel.bgColor} flex items-center justify-center mb-3`}>
                      <Icon className={`h-5 w-5 ${channel.color}`} />
                    </div>
                    <h3 className="font-medium text-sm mb-1">{channel.label}</h3>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      {channel.description}
                    </p>
                    <a
                      href={`mailto:${channel.email}`}
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      data-testid={channel.testId}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {channel.email}
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pb-20" data-testid="section-contact-details">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card data-testid="card-contact-phone">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-md bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Phone className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="font-medium text-base mb-2">AI Demo Line</h3>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" data-testid="badge-demo-line-status">
                  Coming Soon
                </Badge>
                <p className="text-xs text-muted-foreground mt-2" data-testid="text-phone-number">
                  Our dedicated AI demo line is being set up. In the meantime, book a live demo
                  or try the online chat to experience GoRigo&apos;s AI agent firsthand.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-contact-address">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-md bg-blue-500/10 flex items-center justify-center mb-4">
                  <MapPin className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="font-medium text-base mb-2">Our Office</h3>
                <p className="text-sm text-foreground" data-testid="text-address-country">
                  Cotton Court Business Centre
                  <br />
                  Cotton Ct, Preston PR1 3BY
                  <br />
                  England, United Kingdom
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  International Business Exchange Limited
                  <br />
                  Company No. 15985956
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-contact-response">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-md bg-violet-500/10 flex items-center justify-center mb-4">
                  <Clock className="h-5 w-5 text-violet-500" />
                </div>
                <h3 className="font-medium text-base mb-2">Response Times</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">General</span>
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs">1 business day</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Support</span>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">4 hours</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Enterprise</span>
                    <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 text-xs">Same day</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="relative pb-20" data-testid="section-connect-social">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.02] to-transparent dark:via-blue-500/[0.01]" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2" data-testid="text-social-heading">
              Connect With Us
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Follow GoRigo across our channels for demos, tutorials, industry insights,
              and community discussions.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              const purpose = social.purpose;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`card-social-${social.label.toLowerCase()}`}
                >
                  <Card className="h-full hover-elevate cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2.5 mb-2">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{social.label}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {purpose}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <ConversionCta
        headline="Ready to See GoRigo in Action?"
        subheadline="Book a personalised demo and discover how AI voice agents can transform your call centre operations."
        primaryAction={{ label: "Get Started", href: "/register" }}
        secondaryAction={{ label: "View Pricing", href: "/pricing" }}
        talkToAiMessage="Talk to AI — we're ready to help right now"
      />
      <Footer />
    </div>
    </PublicLayout>
  );
}
