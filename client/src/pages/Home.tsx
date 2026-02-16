import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, Mic, BarChart3, Users, Zap, Shield, Globe, ArrowRight, Smartphone, Headphones, TrendingUp, Bot } from "lucide-react";
import { useHealth } from "@/hooks/use-health";

export default function Home() {
  const { data } = useHealth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Phone className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight" data-testid="text-brand">GoRigo</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild data-testid="link-web-app">
              <a href="/health">Status</a>
            </Button>
            <Button size="sm" data-testid="button-get-app">
              Get the App
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground" data-testid="badge-mobile-first">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              Mobile-First AI Call Center
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl" data-testid="text-hero-title">
              Run Your AI Call Center{" "}
              <span className="text-primary">From Your Phone</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg" data-testid="text-hero-subtitle">
              Manage calls, agents, and analytics entirely by voice. GoRigo puts
              the power of a full AI call center in your pocket.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-hero-get-app">
                <Smartphone className="h-4 w-4" />
                Get the App
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2" data-testid="button-hero-web-app">
                Use Web App
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-md grid-cols-3 gap-4 sm:mt-16">
            {[
              { icon: Mic, label: "Voice Control", value: "Primary" },
              { icon: Bot, label: "AI Agents", value: "Automated" },
              { icon: BarChart3, label: "Analytics", value: "Real-time" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1 rounded-md border bg-card p-3 text-center" data-testid={`stat-${item.label.toLowerCase().replace(" ", "-")}`}>
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-features-title">
              Everything You Need, Voice-First
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
              Control your entire call center operation with natural voice commands
              through Rigo, your AI assistant.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Mic,
                title: "Voice-First Control",
                desc: "Say 'How many calls today?' or 'Pause agent 3' and Rigo handles it instantly.",
              },
              {
                icon: Headphones,
                title: "Smart Call Routing",
                desc: "AI agents handle calls 24/7 with sentiment analysis, quality scoring, and real-time monitoring.",
              },
              {
                icon: TrendingUp,
                title: "Live Analytics",
                desc: "Dashboard stats, call trends, agent performance, and spending all updated in real-time.",
              },
              {
                icon: Users,
                title: "Multi-Tier Partners",
                desc: "Manage business partners, D2C clients, and affiliates with automated commission processing.",
              },
              {
                icon: Globe,
                title: "International Calling",
                desc: "Compliance profiles, rate cards, DNC management, and fraud detection across countries.",
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                desc: "TCPA/FCC compliance, PII auto-redaction, audit logging, and tiered rate limiting.",
              },
            ].map((feature) => (
              <Card key={feature.title} className="p-5" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="flex items-start gap-3">
                  <div className="rounded-md border bg-background p-2">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{feature.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-cta-title">
              Ready to Go Mobile?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Download the GoRigo app and start managing your AI call center from anywhere.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-cta-get-app">
                <Smartphone className="h-4 w-4" />
                Get the App
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2" data-testid="button-cta-web-app">
                Use Web App
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Phone className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold" data-testid="text-footer-brand">GoRigo</span>
          </div>
          <div className="flex items-center gap-1">
            {data?.ok && (
              <Zap className="h-3 w-3 text-primary" />
            )}
            <span className="text-xs text-muted-foreground" data-testid="text-footer-status">
              {data?.ok ? "All systems operational" : "Checking status..."}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            GoRigo AI Call Center Platform
          </span>
        </div>
      </footer>
    </div>
  );
}
