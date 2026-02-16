import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";

interface ConversionCtaProps {
  headline?: string;
  subheadline?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  talkToAiMessage?: string;
}

export function ConversionCta({
  headline = "Ready to Transform Your Call Centre?",
  subheadline = "Join businesses across the UK using AI voice agents to handle calls 24/7. No subscriptions, no seat licences — just pay for talk time.",
  primaryAction = { label: "Get Started", href: "/contact" },
  secondaryAction = { label: "View Pricing", href: "/pricing" },
  talkToAiMessage = "Talk to Our AI",
}: ConversionCtaProps) {
  return (
    <section
      className="border-t border-border bg-muted/30"
      data-testid="section-conversion-cta"
    >
      <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20 text-center">
        <h2
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-4"
          data-testid="text-cta-headline"
        >
          {headline}
        </h2>
        <p
          className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
          data-testid="text-cta-subheadline"
        >
          {subheadline}
        </p>

        <div className="flex flex-col items-center gap-6">
          <Button variant="outline" asChild className="border-2 border-primary bg-primary/5">
            <a
              href="tel:+440000000000"
              data-testid="link-cta-talk-to-ai"
            >
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                <Phone className="relative h-5 w-5 text-primary-foreground" />
              </span>
              <span className="flex flex-col items-start">
                <span className="text-base font-semibold tracking-tight" data-testid="text-cta-talk-to-ai-message">
                  {talkToAiMessage}
                </span>
                <span className="text-sm text-muted-foreground" data-testid="text-cta-phone-number">+44 (0) 000 000 0000</span>
              </span>
              <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary" data-testid="text-cta-availability">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                24/7
              </span>
            </a>
          </Button>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button asChild data-testid="button-cta-primary">
              <Link href={primaryAction.href}>
                {primaryAction.label}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" asChild data-testid="button-cta-secondary">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground/70">
          International Business Exchange Limited
          <span className="mx-1.5">|</span>
          UK Company No. 15985956
          <span className="mx-1.5">|</span>
          <a href="mailto:hello@gorigo.ai" className="hover:text-foreground transition-colors">
            hello@gorigo.ai
          </a>
        </p>
      </div>
    </section>
  );
}
