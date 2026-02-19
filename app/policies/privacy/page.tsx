import { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import Link from "next/link";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy Policy | GoRigo",
  description:
    "Learn how GoRigo collects, uses, and protects your personal data. GDPR-compliant privacy practices.",
  openGraph: {
    title: "Privacy Policy | GoRigo",
    description:
      "Learn how GoRigo collects, uses, and protects your personal data. GDPR-compliant privacy practices.",
    siteName: "GoRigo",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | GoRigo",
    description:
      "Learn how GoRigo collects, uses, and protects your personal data. GDPR-compliant privacy practices.",
  },
  alternates: {
    canonical: "/policies/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-privacy-policy">
      <WebPageJsonLd
        title="Privacy Policy | GoRigo"
        description="Learn how GoRigo collects, uses, and protects your personal data. GDPR-compliant privacy practices."
        url="/policies/privacy"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Privacy Policy", url: "/policies/privacy" },
        ]}
      />
      <Navbar />

      <Breadcrumbs items={[{ label: "Privacy Policy" }]} />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1
          className="text-3xl sm:text-4xl font-light tracking-tight mb-2 text-foreground"
          data-testid="text-privacy-title"
        >
          Privacy Policy
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
              This Privacy Policy explains how International Business Exchange
              Limited (trading as GoRigo), a company registered in England and
              Wales with company number 15985956, collects, uses, discloses, and
              protects your personal data when you use our AI call centre
              platform and related services available at gorigo.ai (the
              &quot;Service&quot;).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We are committed to protecting your privacy and ensuring that your
              personal data is handled in accordance with the UK General Data
              Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              2. Information We Collect
            </h2>

            <h3 className="text-base font-medium mb-2 text-foreground">
              2.1 Account Information
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you register for an account, we collect your name, email
              address, company name, phone number, billing address, and payment
              information.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              2.2 Call Data
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We process call recordings, transcripts, call metadata (duration,
              timestamps, phone numbers), sentiment analysis results, and
              quality scores generated through the Service.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              2.3 Usage Data
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We collect information about how you interact with the Service,
              including features used, pages viewed, agent configurations,
              campaign settings, and API usage patterns.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              2.4 Technical Data
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We automatically collect your IP address, browser type and
              version, device information, operating system, time zone setting,
              and other technical identifiers when you access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              3. How We Use Your Information
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use your personal data to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>
                Provide, operate, and maintain the Service, including processing
                calls through AI agents, generating analytics, and managing your
                account.
              </li>
              <li>
                Improve and develop the platform by analysing usage patterns,
                call quality metrics, and user feedback to enhance performance
                and features.
              </li>
              <li>
                Ensure compliance with applicable laws and regulations,
                including GDPR, DNC registry requirements, and
                telecommunications regulations.
              </li>
              <li>
                Communicate with you regarding account notifications, service
                updates, security alerts, billing information, and marketing
                communications (where consented).
              </li>
              <li>
                Detect and prevent fraud, abuse, and security threats to protect
                the integrity of the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              4. Legal Basis for Processing
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Under Article 6 of the UK GDPR, we process your personal data on
              the following legal bases:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>
                <span className="text-foreground font-medium">
                  Performance of a contract:
                </span>{" "}
                Processing necessary to fulfil our contractual obligations to
                you, including providing the Service and managing your account.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Legitimate interests:
                </span>{" "}
                Processing necessary for our legitimate interests, such as
                improving the Service, ensuring security, and conducting
                analytics, where such interests are not overridden by your
                rights.
              </li>
              <li>
                <span className="text-foreground font-medium">Consent:</span>{" "}
                Where you have given explicit consent, such as for marketing
                communications or optional analytics cookies.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Legal obligation:
                </span>{" "}
                Processing necessary to comply with legal or regulatory
                requirements, including telecommunications regulations and
                financial reporting obligations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              5. Data Sharing
            </h2>

            <h3 className="text-base font-medium mb-2 text-foreground">
              5.1 Service Providers
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We share your data with trusted third-party service providers who
              assist us in operating the Service, including cloud hosting
              providers, telephony partners, payment processors, and AI model
              providers. All service providers are bound by data processing
              agreements.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              5.2 Legal Requirements
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We may disclose your data if required to do so by law, regulation,
              legal process, or governmental request, or to protect the rights,
              property, or safety of GoRigo, our users, or the public.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              5.3 Business Transfers
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              In the event of a merger, acquisition, reorganisation, or sale of
              assets, your personal data may be transferred as part of that
              transaction. We will notify you of any such change and any choices
              you may have regarding your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              6. International Transfers
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Your personal data may be transferred to and processed in
              countries outside the United Kingdom. Where we transfer data
              internationally, we ensure appropriate safeguards are in place,
              including reliance on UK adequacy decisions, standard contractual
              clauses approved by the Information Commissioner&apos;s Office (ICO),
              or other lawful transfer mechanisms under the UK GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              7. Data Retention
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data only for as long as necessary to
              fulfil the purposes for which it was collected, including to
              satisfy legal, accounting, or reporting requirements. Call
              recordings and transcripts are retained in accordance with your
              account settings and applicable regulatory requirements. When data
              is no longer required, it is securely deleted or anonymised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              8. Your Rights
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Under the UK GDPR, you have the following rights regarding your
              personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>
                <span className="text-foreground font-medium">
                  Right of access:
                </span>{" "}
                You may request a copy of the personal data we hold about you.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Right to rectification:
                </span>{" "}
                You may request that we correct any inaccurate or incomplete
                personal data.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Right to erasure:
                </span>{" "}
                You may request that we delete your personal data, subject to
                certain legal exceptions.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Right to restriction:
                </span>{" "}
                You may request that we restrict the processing of your personal
                data in certain circumstances.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Right to data portability:
                </span>{" "}
                You may request to receive your personal data in a structured,
                commonly used, and machine-readable format.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Right to object:
                </span>{" "}
                You may object to the processing of your personal data based on
                our legitimate interests.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a
                href="mailto:hello@gorigo.ai"
                className="text-primary underline"
                data-testid="link-privacy-email"
              >
                hello@gorigo.ai
              </a>
              . We will respond to your request within one month.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              9. Cookies
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to enhance your
              experience on the Service. For detailed information about the
              cookies we use and how to manage your cookie preferences, please
              refer to our{" "}
              <Link
                href="/policies/cookies"
                className="text-primary underline"
                data-testid="link-privacy-cookie-policy"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              10. Children&apos;s Privacy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for use by individuals under the age
              of 18. We do not knowingly collect personal data from children. If
              we become aware that we have collected personal data from a child,
              we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              11. Changes to This Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time to reflect
              changes in our practices or applicable laws. We will notify you of
              any material changes by posting the updated policy on the Service
              and updating the &quot;Last updated&quot; date. We encourage you to review
              this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              12. Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you have any questions about this Privacy Policy or wish to
              exercise your data protection rights, please contact us:
            </p>
            <div className="text-muted-foreground leading-relaxed space-y-1">
              <p>
                Email:{" "}
                <a
                  href="mailto:hello@gorigo.ai"
                  className="text-primary underline"
                  data-testid="link-privacy-contact-email"
                >
                  hello@gorigo.ai
                </a>
              </p>
              <p>
                Support:{" "}
                <a
                  href="mailto:support@gorigo.ai"
                  className="text-primary underline"
                  data-testid="link-privacy-support-email"
                >
                  support@gorigo.ai
                </a>
              </p>
              <p>International Business Exchange Limited</p>
              <p>Cotton Court Business Centre, Cotton Ct, Preston PR1 3BY, England</p>
              <p>UK Company No. 15985956</p>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You also have the right to lodge a complaint with the Information
              Commissioner&apos;s Office (ICO) if you believe your data protection
              rights have been infringed.
            </p>
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
