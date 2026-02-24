export function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GoRigo",
    legalName: "International Business Exchange Limited",
    url: "https://gorigo.ai",
    logo: "https://gorigo.ai/logo.png",
    foundingDate: "2024",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Cotton Court Business Centre",
      addressLocality: "Preston",
      postalCode: "PR1 3BY",
      addressCountry: "GB",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      url: "https://gorigo.ai/contact",
    },
    sameAs: [],
    description:
      "AI voice platform. AI voice agents, social media marketing, omnichannel messaging, campaigns, team tools, and compliance — run from your phone. Pay only for what you use.",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GoRigo",
    url: "https://gorigo.ai",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://gorigo.ai/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const navigationSchema = {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: "Main Navigation",
    hasPart: [
      { "@type": "SiteNavigationElement", name: "Capabilities", url: "https://gorigo.ai/capabilities" },
      { "@type": "SiteNavigationElement", name: "Pricing", url: "https://gorigo.ai/pricing" },
      { "@type": "SiteNavigationElement", name: "About", url: "https://gorigo.ai/about" },
      { "@type": "SiteNavigationElement", name: "Contact", url: "https://gorigo.ai/contact" },
      { "@type": "SiteNavigationElement", name: "Case Studies", url: "https://gorigo.ai/case-studies" },
      { "@type": "SiteNavigationElement", name: "Blog", url: "https://gorigo.ai/blog" },
      { "@type": "SiteNavigationElement", name: "Documentation", url: "https://gorigo.ai/docs" },
      { "@type": "SiteNavigationElement", name: "Partners", url: "https://gorigo.ai/partners" },
      { "@type": "SiteNavigationElement", name: "ROI Calculator", url: "https://gorigo.ai/roi-calculator" },
      { "@type": "SiteNavigationElement", name: "Trust & Security", url: "https://gorigo.ai/trust" },
    ],
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GoRigo AI Voice Platform",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
      description: "Pay only for talk time. No fixed monthly fees.",
    },
    featureList: [
      "AI Voice Agents",
      "Social Media Marketing",
      "Omnichannel Messaging",
      "Inbound Call Handling",
      "Outbound Campaigns",
      "Multi-Language Support",
      "Human Handoff",
      "GDPR Compliance",
      "Real-Time Analytics",
      "Knowledge Base Management",
      "Pay Per Talk Time Billing",
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://gorigo.ai" },
      { "@type": "ListItem", position: 2, name: "Capabilities", item: "https://gorigo.ai/capabilities" },
      { "@type": "ListItem", position: 3, name: "Pricing", item: "https://gorigo.ai/pricing" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(navigationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
