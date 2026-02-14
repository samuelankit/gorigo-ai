import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact GoRigo | Book a Demo",
  description:
    "Get in touch with the GoRigo team. Book a demo, enquire about partnerships, or reach out for support. We respond within one business day.",
  openGraph: {
    title: "Contact GoRigo | Book a Demo",
    description:
      "Get in touch with the GoRigo team. Book a demo, enquire about partnerships, or reach out for support.",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-contact">
      <Navbar />

      <section
        className="relative"
        data-testid="section-contact-hero"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6" data-testid="badge-contact">
            Contact
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-contact-hero-title"
          >
            Get in touch
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Have a question, want to book a demo, or explore a partnership?
            We are here to help.
          </p>
        </div>
      </section>

      <section className="py-20" data-testid="section-contact-content">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3">
              <ContactForm />
            </div>

            <div className="lg:col-span-2 space-y-4">
              <Card data-testid="card-contact-email">
                <CardContent className="p-6">
                  <Mail className="h-5 w-5 text-cyan-500 mb-4" />
                  <h3 className="font-medium text-base mb-3">Email Us</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">General</p>
                      <a
                        href="mailto:hello@gorigo.ai"
                        className="text-sm text-foreground"
                        data-testid="link-email-general"
                      >
                        hello@gorigo.ai
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Partnerships
                      </p>
                      <a
                        href="mailto:partners@gorigo.ai"
                        className="text-sm text-foreground"
                        data-testid="link-email-partners"
                      >
                        partners@gorigo.ai
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Support</p>
                      <a
                        href="mailto:support@gorigo.ai"
                        className="text-sm text-foreground"
                        data-testid="link-email-support"
                      >
                        support@gorigo.ai
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-contact-phone">
                <CardContent className="p-6">
                  <Phone className="h-5 w-5 text-teal-500 mb-4" />
                  <h3 className="font-medium text-base mb-3">
                    Call Our AI Demo Line
                  </h3>
                  <p
                    className="text-sm text-foreground"
                    data-testid="text-phone-number"
                  >
                    +44 (0) 000 000 0000
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Experience GoRigo&apos;s AI agent firsthand. Available 24/7.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-contact-address">
                <CardContent className="p-6">
                  <MapPin className="h-5 w-5 text-rose-500 mb-4" />
                  <h3 className="font-medium text-base mb-3">Visit Us</h3>
                  <p
                    className="text-sm text-foreground"
                    data-testid="text-address-country"
                  >
                    United Kingdom
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    International Business Exchange Limited
                    <br />
                    Company No. 15985956
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
