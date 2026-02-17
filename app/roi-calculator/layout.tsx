import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROI Calculator - See Your Real Savings | GoRigo",
  description:
    "Calculate how much you could save by switching to AI-powered voice agents. Interactive savings calculator for business owners, technical teams, and channel partners.",
  openGraph: {
    title: "ROI Calculator - See Your Real Savings | GoRigo",
    description:
      "See your potential savings with AI call centre automation. Choose your profile and get personalised results instantly.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ROI Calculator - See Your Real Savings | GoRigo",
    description:
      "Calculate your AI call centre savings instantly. Personalised results for business owners, technical teams, and partners.",
  },
  alternates: {
    canonical: "/roi-calculator",
  },
};

export default function RoiCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
