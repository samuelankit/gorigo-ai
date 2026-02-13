import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GoRigo - Getting Started Guide",
  description: "Step-by-step tutorials to help you get the most out of GoRigo AI Call Center Platform.",
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
