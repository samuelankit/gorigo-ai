import { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Terms of Service | GoRigo",
  description:
    "Terms of Service governing the use of the GoRigo AI call centre platform.",
  openGraph: {
    title: "Terms of Service | GoRigo",
    description:
      "Terms of Service governing the use of the GoRigo AI call centre platform.",
    siteName: "GoRigo",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service | GoRigo",
    description:
      "Terms of Service governing the use of the GoRigo AI call centre platform.",
  },
  alternates: {
    canonical: "/policies/terms",
  },
};

export default function TermsOfServicePage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-terms">
      <WebPageJsonLd
        title="Terms of Service | GoRigo"
        description="Terms of Service governing the use of the GoRigo AI call centre platform."
        url="/policies/terms"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Terms of Service", url: "/policies/terms" },
        ]}
      />
      <Navbar />

      <Breadcrumbs items={[{ label: "Terms of Service" }]} />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1
          className="text-3xl sm:text-4xl font-light tracking-tight mb-2 text-foreground"
          data-testid="text-terms-title"
        >
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: February 2026
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              1. Introduction
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use
              of the GoRigo AI call centre platform and related services (the
              &quot;Service&quot;) provided by International Business Exchange Limited, a
              company registered in England and Wales with company number
              15985956 (&quot;GoRigo&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the Service, you agree to be bound by these
              Terms. If you do not agree to these Terms, you must not use the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              2. Eligibility
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years of age and have the legal capacity
              to enter into binding agreements to use the Service. If you are
              using the Service on behalf of a business or organisation, you
              represent and warrant that you have the authority to bind that
              entity to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              3. Account Registration
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To access certain features of the Service, you must create an
              account. You agree to provide accurate, complete, and current
              information during registration and to keep your account
              information up to date.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You must notify us immediately of any unauthorised use of
              your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              4. Service Description
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              GoRigo provides an AI-powered call centre platform that enables
              businesses to deploy intelligent voice agents for inbound and
              outbound telephone calls. The Service includes, but is not limited
              to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>AI agent creation, configuration, and deployment</li>
              <li>Inbound and outbound call handling</li>
              <li>Call recording, transcription, and analytics</li>
              <li>Campaign management and scheduling</li>
              <li>Knowledge base management</li>
              <li>API access for integration with third-party systems</li>
              <li>Compliance tools including DNC registry and consent management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              5. Billing and Payment
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              GoRigo operates on a pay-per-use model based on actual talk time.
              Talk time covers all platform usage including calls, AI content
              generation, assistant queries, and knowledge processing. There are
              no seat licences, fixed subscriptions, or minimum commitments
              unless otherwise agreed in writing.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You must maintain a positive wallet balance or valid payment
              method to use the Service. Charges are deducted from your wallet
              balance in real time based on usage. You may top up your wallet at
              any time through the dashboard.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              All fees are quoted exclusive of VAT unless stated otherwise. We
              reserve the right to modify our pricing with reasonable notice.
              Continued use of the Service after a pricing change constitutes
              acceptance of the new pricing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              6. Acceptable Use
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is subject to our{" "}
              <a
                href="/policies/acceptable-use"
                className="text-primary underline"
                data-testid="link-terms-aup"
              >
                Acceptable Use Policy
              </a>
              , which is incorporated into these Terms by reference. You agree
              not to use the Service for any unlawful, harmful, or abusive
              purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              7. Intellectual Property
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The Service, including all software, algorithms, designs, text,
              graphics, logos, and other materials, is the intellectual property
              of GoRigo or its licensors and is protected by copyright,
              trademark, and other intellectual property laws.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all data and content you upload to the
              Service. By uploading content, you grant GoRigo a limited,
              non-exclusive licence to process that content solely for the
              purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              8. Limitation of Liability
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To the maximum extent permitted by applicable law, GoRigo shall
              not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including but not limited to
              loss of profits, revenue, data, or business opportunities,
              arising out of or in connection with your use of the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our total aggregate liability for any claims arising from or
              related to the Service shall not exceed the total amount paid by
              you to GoRigo in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              9. Indemnification
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless GoRigo, its
              officers, directors, employees, and agents from and against any
              claims, liabilities, damages, losses, and expenses (including
              reasonable legal fees) arising out of or in connection with your
              use of the Service, your violation of these Terms, or your
              infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              10. Termination
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You may terminate your account at any time by contacting us or
              through your account settings. We may suspend or terminate your
              access to the Service at any time, with or without cause, and with
              or without notice.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Upon termination, your right to use the Service will cease
              immediately. Any outstanding balance in your wallet may be
              refunded at our discretion, less any amounts owed for usage. We
              may retain certain data as required by law or for legitimate
              business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              11. Governing Law
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with
              the laws of England and Wales. Any disputes arising out of or in
              connection with these Terms shall be subject to the exclusive
              jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              12. Dispute Resolution
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Before initiating any formal legal proceedings, you agree to first
              contact us at{" "}
              <a
                href="mailto:hello@gorigo.ai"
                className="text-primary underline"
                data-testid="link-terms-dispute-email"
              >
                hello@gorigo.ai
              </a>{" "}
              to attempt to resolve any dispute informally. We will endeavour to
              resolve any complaint or dispute within thirty (30) days. If a
              resolution cannot be reached informally, either party may pursue
              formal legal proceedings in accordance with the governing law
              provisions above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              13. Changes to Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will
              provide notice of material changes by posting the updated Terms on
              the Service and updating the &quot;Last updated&quot; date. Your continued
              use of the Service after any such changes constitutes your
              acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              14. Contact
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="text-muted-foreground leading-relaxed space-y-1">
              <p>
                Email:{" "}
                <a
                  href="mailto:hello@gorigo.ai"
                  className="text-primary underline"
                  data-testid="link-terms-contact-email"
                >
                  hello@gorigo.ai
                </a>
              </p>
              <p>
                Support:{" "}
                <a
                  href="mailto:support@gorigo.ai"
                  className="text-primary underline"
                  data-testid="link-terms-support-email"
                >
                  support@gorigo.ai
                </a>
              </p>
              <p>International Business Exchange Limited</p>
              <p>UK Company No. 15985956</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-xs text-muted-foreground space-y-1">
          <p>International Business Exchange Limited</p>
          <p>UK Company No. 15985956</p>
          <p>Trading as GoRigo &mdash; gorigo.ai</p>
        </div>
      </div>

      <Footer />
    </div>
    </PublicLayout>
  );
}
