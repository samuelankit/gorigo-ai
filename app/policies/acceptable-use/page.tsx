import { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | GoRigo",
  description:
    "Acceptable Use Policy for the GoRigo AI call centre platform. Understand what is and is not permitted.",
  openGraph: {
    title: "Acceptable Use Policy | GoRigo",
    description:
      "Acceptable Use Policy for the GoRigo AI call centre platform. Understand what is and is not permitted.",
    siteName: "GoRigo",
  },
  twitter: {
    card: "summary",
    title: "Acceptable Use Policy | GoRigo",
    description:
      "Acceptable Use Policy for the GoRigo AI call centre platform. Understand what is and is not permitted.",
  },
  alternates: {
    canonical: "/policies/acceptable-use",
  },
};

export default function AcceptableUsePolicyPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-acceptable-use">
      <WebPageJsonLd
        title="Acceptable Use Policy | GoRigo"
        description="Acceptable Use Policy for the GoRigo AI call centre platform. Understand what is and is not permitted."
        url="/policies/acceptable-use"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Acceptable Use Policy", url: "/policies/acceptable-use" },
        ]}
      />
      <Navbar />

      <Breadcrumbs items={[{ label: "Acceptable Use Policy" }]} />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1
          className="text-3xl sm:text-4xl font-light tracking-tight mb-2 text-foreground"
          data-testid="text-aup-title"
        >
          Acceptable Use Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: February 2026
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              1. Introduction
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              This Acceptable Use Policy (&quot;AUP&quot;) governs your use of the
              GoRigo AI call centre platform and related services (the
              &quot;Service&quot;) provided by International Business Exchange Limited
              (company number 15985956). This AUP is incorporated into and
              forms part of our Terms of Service. By using the Service, you
              agree to comply with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              2. Permitted Use
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The Service is designed for legitimate business communications,
              including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>Customer service and support call handling</li>
              <li>Appointment scheduling and confirmation</li>
              <li>Order processing and status updates</li>
              <li>Lead qualification and follow-up (with proper consent)</li>
              <li>Survey collection and feedback gathering</li>
              <li>Account notifications and reminders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              3. Prohibited Activities
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You must not use the Service to engage in any of the following
              activities:
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              3.1 Spam and Unsolicited Communications
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sending unsolicited bulk calls, robocalls, or automated messages
              to individuals who have not provided prior consent. This includes
              cold calling without a lawful basis under applicable
              telecommunications regulations.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              3.2 Harassment and Abuse
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Using the Service to harass, threaten, intimidate, stalk, or
              abuse any individual. This includes making repeated unwanted calls
              to the same number, using threatening language in AI agent
              scripts, or targeting vulnerable individuals.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              3.3 Illegal Content and Activities
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Using the Service to promote, facilitate, or engage in any
              illegal activity, including but not limited to fraud, deception,
              money laundering, terrorist financing, or the promotion of
              illegal goods or services.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              3.4 Reverse Engineering
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Attempting to reverse engineer, decompile, disassemble, or
              otherwise derive the source code of the Service, its algorithms,
              AI models, or underlying technology, except to the extent
              expressly permitted by applicable law.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              3.5 Abuse of API
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Overloading, disrupting, or attempting to gain unauthorised access
              to the Service or its infrastructure through the API or other
              means. This includes exceeding rate limits, scraping data,
              injecting malicious code, or using the API to circumvent usage
              restrictions or billing mechanisms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              4. Call Compliance
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When using the Service for outbound calls, you must comply with
              all applicable laws and regulations, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>
                <span className="text-foreground font-medium">
                  Do Not Call (DNC) Compliance:
                </span>{" "}
                You must check all outbound call numbers against the Telephone
                Preference Service (TPS) and Corporate Telephone Preference
                Service (CTPS) registers, as well as your own internal
                suppression lists. You must not call numbers that are
                registered on these lists unless a specific exemption applies.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  AI Disclosure:
                </span>{" "}
                You must clearly disclose to call recipients that they are
                speaking with an AI-powered agent at the beginning of each
                call. Misrepresenting an AI agent as a human is strictly
                prohibited and may violate consumer protection laws.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Consent:
                </span>{" "}
                You must obtain and maintain records of appropriate consent
                before making outbound calls, in accordance with GDPR, PECR,
                and other applicable regulations.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Calling Hours:
                </span>{" "}
                You must respect reasonable calling hours and not make calls at
                unsociable times unless specifically requested by the recipient.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              5. Consequences of Violation
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Violation of this Acceptable Use Policy may result in one or more
              of the following actions, at our sole discretion:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>A formal warning notice</li>
              <li>Temporary suspension of your account and Service access</li>
              <li>Permanent termination of your account</li>
              <li>Forfeiture of any remaining wallet balance</li>
              <li>Reporting of the violation to relevant authorities or regulatory bodies</li>
              <li>Legal action to recover damages or enforce compliance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              6. Reporting Violations
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you become aware of any violation of this Acceptable Use
              Policy, we encourage you to report it immediately. You can report
              violations by contacting us at{" "}
              <a
                href="mailto:support@gorigo.ai"
                className="text-primary underline"
                data-testid="link-aup-report-email"
              >
                support@gorigo.ai
              </a>
              . All reports will be investigated promptly and treated
              confidentially.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              7. Changes to This Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify this Acceptable Use Policy at any
              time. Changes will be posted on the Service and the &quot;Last
              updated&quot; date will be revised. Your continued use of the Service
              after any changes constitutes your acceptance of the updated
              policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              8. Contact
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you have any questions about this Acceptable Use Policy, please
              contact us:
            </p>
            <div className="text-muted-foreground leading-relaxed space-y-1">
              <p>
                Email:{" "}
                <a
                  href="mailto:hello@gorigo.ai"
                  className="text-primary underline"
                  data-testid="link-aup-contact-email"
                >
                  hello@gorigo.ai
                </a>
              </p>
              <p>
                Support:{" "}
                <a
                  href="mailto:support@gorigo.ai"
                  className="text-primary underline"
                  data-testid="link-aup-support-email"
                >
                  support@gorigo.ai
                </a>
              </p>
              <p>International Business Exchange Limited</p>
              <p>Cotton Court Business Centre, Cotton Ct, Preston PR1 3BY, England</p>
              <p>UK Company No. 15985956</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-xs text-muted-foreground space-y-1">
          <p>International Business Exchange Limited</p>
          <p>Cotton Court Business Centre, Cotton Ct, Preston PR1 3BY, England</p>
          <p>UK Company No. 15985956</p>
          <p>Trading as GoRigo &mdash; gorigo.ai</p>
        </div>
      </div>

      <Footer />
    </div>
    </PublicLayout>
  );
}
