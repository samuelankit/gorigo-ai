import { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Cookie Policy | GoRigo",
  description:
    "Learn about the cookies GoRigo uses, why we use them, and how to manage your cookie preferences.",
  openGraph: {
    title: "Cookie Policy | GoRigo",
    description:
      "Learn about the cookies GoRigo uses, why we use them, and how to manage your cookie preferences.",
    siteName: "GoRigo",
  },
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-cookie-policy">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1
          className="text-3xl sm:text-4xl font-light tracking-tight mb-2 text-foreground"
          data-testid="text-cookies-title"
        >
          Cookie Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: February 2026
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              1. What Are Cookies
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files that are placed on your device when
              you visit a website. They are widely used to make websites work
              more efficiently, provide information to website owners, and
              enhance your browsing experience. Cookies may be set by the
              website you are visiting (&quot;first-party cookies&quot;) or by third-party
              services that the website uses (&quot;third-party cookies&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              2. Cookies We Use
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following categories of cookies on the GoRigo platform:
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              2.1 Essential Cookies
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These cookies are strictly necessary for the operation of the
              Service. They enable core functionality such as user
              authentication, session management, security features, and
              remembering your preferences. Without these cookies, the Service
              cannot function properly. Essential cookies do not require your
              consent.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              2.2 Analytics Cookies
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Analytics cookies help us understand how visitors interact with
              the Service by collecting and reporting information anonymously.
              This data allows us to improve the performance and user
              experience of the platform. These cookies track metrics such as
              page views, session duration, feature usage, and error rates.
            </p>

            <h3 className="text-base font-medium mb-2 text-foreground">
              2.3 Preference Cookies
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Preference cookies allow the Service to remember choices you have
              made, such as your preferred language, theme (light or dark mode),
              timezone settings, and dashboard layout configurations. These
              cookies enhance your experience by personalising the Service to
              your preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              3. Managing Cookies
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Most web browsers allow you to manage your cookie preferences
              through the browser settings. You can choose to block or delete
              cookies, though this may affect the functionality of the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To manage cookies in your browser, refer to the help documentation
              for your specific browser:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>Google Chrome: Settings &gt; Privacy and Security &gt; Cookies</li>
              <li>Mozilla Firefox: Options &gt; Privacy &amp; Security</li>
              <li>Safari: Preferences &gt; Privacy</li>
              <li>Microsoft Edge: Settings &gt; Cookies and Site Permissions</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Please note that disabling essential cookies will prevent you from
              using core features of the Service, including authentication and
              session management.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              4. Third-Party Cookies
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Some cookies on the Service are set by third-party services that
              we use, such as analytics providers and payment processors. These
              third parties may use cookies to collect information about your
              online activities across different websites. We do not control
              third-party cookies, and their use is governed by the respective
              privacy policies of those third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              5. Updates to This Cookie Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time to reflect
              changes in the cookies we use or for operational, legal, or
              regulatory reasons. We will post any changes on this page and
              update the &quot;Last updated&quot; date. We encourage you to review this
              policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-foreground">
              6. Contact
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you have any questions about our use of cookies, please contact
              us:
            </p>
            <div className="text-muted-foreground leading-relaxed space-y-1">
              <p>
                Email:{" "}
                <a
                  href="mailto:hello@gorigo.ai"
                  className="text-primary underline"
                  data-testid="link-cookies-contact-email"
                >
                  hello@gorigo.ai
                </a>
              </p>
              <p>
                Support:{" "}
                <a
                  href="mailto:support@gorigo.ai"
                  className="text-primary underline"
                  data-testid="link-cookies-support-email"
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
  );
}
