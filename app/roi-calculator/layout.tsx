import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROI Calculator - See Your Real Savings | GoRigo",
  description:
    "Calculate exactly how much you could save by switching to AI-powered voice agents. Real Azure, OpenAI, and Twilio costs included. Interactive savings calculator with transparent pricing breakdown.",
  openGraph: {
    title: "ROI Calculator - See Your Real Savings | GoRigo",
    description:
      "Calculate exactly how much you could save by switching to AI-powered voice agents. Real costs, real numbers — no hidden fees.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ROI Calculator - See Your Real Savings | GoRigo",
    description:
      "Calculate your AI call centre savings with real Azure, OpenAI, and Twilio pricing. Interactive calculator with transparent cost breakdown.",
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
