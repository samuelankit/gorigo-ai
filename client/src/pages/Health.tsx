import AppShell from "@/components/AppShell";
import SectionCard from "@/components/SectionCard";
import StatusPill from "@/components/StatusPill";
import { useHealth } from "@/hooks/use-health";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, RefreshCcw, XCircle } from "lucide-react";

export default function HealthPage() {
  const { data, isLoading, error, refetch, isFetching } = useHealth();
  const ok = data?.ok === true;

  return (
    <AppShell title="Health" eyebrow="Observability">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <SectionCard
          title="API heartbeat"
          description="A focused status view for /api/health."
          right={
            isLoading ? (
              <StatusPill label="Checking…" tone="neutral" data-testid="health-pill" />
            ) : ok ? (
              <StatusPill label="OK" tone="success" data-testid="health-pill" />
            ) : (
              <StatusPill label="Error" tone="danger" data-testid="health-pill" />
            )
          }
          className="lg:col-span-2"
          data-testid="health-card"
        >
          <div className="rounded-xl border bg-background/60 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border bg-card p-2.5 shadow-sm">
                {isLoading || isFetching ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>

              <div className="flex-1">
                <div className="text-sm font-semibold" data-testid="health-result-title">
                  Result
                </div>
                <div className="mt-1 text-sm text-muted-foreground" data-testid="health-result-subtitle">
                  {isLoading
                    ? "Waiting for server…"
                    : ok
                      ? "Server responded with a healthy payload."
                      : "Server did not return a valid healthy response."}
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-card/70 p-4">
                    <div className="text-xs text-muted-foreground">Endpoint</div>
                    <div className="mt-1 font-mono text-sm" data-testid="health-endpoint">
                      /api/health
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card/70 p-4">
                    <div className="text-xs text-muted-foreground">Payload</div>
                    <div className="mt-1 font-mono text-sm" data-testid="health-payload">
                      {isLoading ? "…" : JSON.stringify(data ?? null)}
                    </div>
                  </div>
                </div>

                {error ? (
                  <pre
                    className="mt-4 max-w-full overflow-auto rounded-xl border bg-muted p-4 text-xs text-foreground/80"
                    data-testid="health-error"
                  >
                    {String(error)}
                  </pre>
                ) : null}

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    data-testid="health-refresh"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    {isFetching ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="What this proves"
          description="A starter contract you can build on."
          data-testid="health-explainer"
        >
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="rounded-xl border bg-background/60 p-4">
              <div className="text-foreground font-semibold">Query wiring</div>
              <div className="mt-1 text-xs">
                TanStack Query caches the health response; refresh is instant and controlled.
              </div>
            </li>
            <li className="rounded-xl border bg-background/60 p-4">
              <div className="text-foreground font-semibold">Zod validation</div>
              <div className="mt-1 text-xs">
                Responses are validated at runtime to avoid silent shape mismatches.
              </div>
            </li>
            <li className="rounded-xl border bg-background/60 p-4">
              <div className="text-foreground font-semibold">Design baseline</div>
              <div className="mt-1 text-xs">
                A minimal UI with polish: spacing rhythm, soft shadows, and focus rings.
              </div>
            </li>
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
