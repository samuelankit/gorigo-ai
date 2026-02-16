import { Metadata } from "next";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
  title: "Pricing - Flexible AI Call Centre Packages | GoRigo",
  description:
    "Choose the right GoRigo deployment for your business. Talk-time only billing with no subscriptions. Managed, BYOK, Self-Hosted, or fully custom Enterprise packages available.",
  openGraph: {
    title: "Pricing - Flexible AI Call Centre Packages | GoRigo",
    description:
      "Choose the right GoRigo deployment for your business. Talk-time only billing with no subscriptions. Managed, BYOK, Self-Hosted, or Enterprise custom packages available.",
    type: "website",
    url: "/pricing",
  },
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
