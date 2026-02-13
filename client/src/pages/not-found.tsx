import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <AppShell title="Page not found" eyebrow="404">
      <div className="enter rounded-2xl border bg-card/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/65 p-6 sm:p-10 grain">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="rounded-2xl border bg-background p-4 shadow-sm">
            <SearchX className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl">We couldn’t find that.</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-prose">
              The route doesn’t exist yet — but the design system is ready when you add it.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button
                asChild
                className="rounded-xl"
                data-testid="notfound-home"
                onClick={() => {}}
              >
                <Link href="/">
                  <span className="inline-flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                  </span>
                </Link>
              </Button>

              <Button
                variant="secondary"
                asChild
                className="rounded-xl"
                data-testid="notfound-create-user"
                onClick={() => {}}
              >
                <Link href="/users/new">Create user</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
