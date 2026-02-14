import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/get-user";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "GoRigo - Getting Started Guide",
  description: "Step-by-step tutorials to help you get the most out of GoRigo AI Call Center Platform.",
};

export default async function GuideLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    redirect("/login?redirect=/guide");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}
