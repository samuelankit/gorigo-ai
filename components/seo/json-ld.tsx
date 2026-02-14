export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GoRigo",
    legalName: "International Business Exchange Limited",
    url: "https://gorigo.ai",
    logo: "https://gorigo.ai/logo.png",
    description:
      "AI-powered call centre platform. Deploy intelligent voice agents that handle inbound and outbound calls 24/7 with natural conversation. Pay only for talk time.",
    foundingDate: "2024",
    address: {
      "@type": "PostalAddress",
      addressCountry: "GB",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@gorigo.ai",
      contactType: "sales",
      availableLanguage: ["English"],
    },
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebPageJsonLd({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `https://gorigo.ai${url}`,
    isPartOf: {
      "@type": "WebSite",
      name: "GoRigo",
      url: "https://gorigo.ai",
    },
    publisher: {
      "@type": "Organization",
      name: "International Business Exchange Limited",
      url: "https://gorigo.ai",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQJsonLd({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  if (!items.length) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `https://gorigo.ai${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GoRigo AI Call Centre",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      description: "Pay-per-talk-time pricing, no subscriptions",
    },
    provider: {
      "@type": "Organization",
      name: "International Business Exchange Limited",
    },
    description:
      "AI-powered call centre platform with 24/7 voice agents, analytics, compliance, and multi-language support.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
