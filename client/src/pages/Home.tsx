import AppShell from "@/components/AppShell";
import SectionCard from "@/components/SectionCard";
import StatusPill from "@/components/StatusPill";
import { useHealth } from "@/hooks/use-health";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Activity, ArrowRight, ShieldCheck, UserPlus } from "lucide-react";

export default function Home() {
  const { data, isLoading, error, refetch, isFetching } = useHealth();

  const ok = data?.ok === true;

  return (
    <AppShell
      title="Minimal Admin"
      eyebrow="Clean minimal · premium UI"
      rightSlot={
        <Button
          variant="default"
          className="rounded-xl shadow-sm hover:shadow-md transition-all"
          data-testid="primary-cta"
          onClick={() => {}}
          asChild
        >
          <Link href="/users/new">
            <span className="inline-flex items-center gap-2">
              Create user <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <SectionCard
          title="System status"
          description="A live health check using TanStack Query (auto-refresh every 30s)."
          right={
            <div className="flex items-center gap-2">
              {isLoading ? (
                <StatusPill label="Checking…" tone="neutral" data-testid="health-pill" />
              ) : ok ? (
                <StatusPill label="All green" tone="success" data-testid="health-pill" />
              ) : (
                <StatusPill label="Degraded" tone="danger" data-testid="health-pill" />
              )}
            </div>
          }
          data-testid="card-health"
          className="lg:col-span-2"
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border bg-background/60 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border bg-card p-2.5 shadow-sm">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" data-testid="health-title">
                    API health endpoint
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground" data-testid="health-subtitle">
                    {isLoading
                      ? "Fetching /api/health…"
                      : ok
                        ? "Healthy response received: { ok: true }."
                        : "Could not confirm health. See error details below."}
                  </div>

                  {!isLoading && error ? (
                    <pre
                      className="mt-3 max-w-full overflow-auto rounded-lg border bg-muted p-3 text-xs text-foreground/80"
                      data-testid="health-error"
                    >
                      {String(error)}
                    </pre>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl"
                  data-testid="health-refetch"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? "Refreshing…" : "Refresh"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl justify-start"
                  data-testid="health-open-page"
                  onClick={() => {}}
                  asChild
                >
                  <Link href="/health">Open status page</Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MiniFeature
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Runtime validation"
                desc="Zod parses responses so UI fails loudly if the API changes."
                dataTestId="feature-zod"
              />
              <MiniFeature
                icon={<UserPlus className="h-4 w-4" />}
                title="Create user flow"
                desc="Form → mutation → toast → success card. Fully wired."
                dataTestId="feature-create-user"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Quick actions"
          description="A minimal set of routes to start building."
          data-testid="card-quick-actions"
        >
          <div className="flex flex-col gap-2">
            <Button
              className="rounded-xl justify-between group"
              data-testid="qa-create-user"
              onClick={() => {}}
              asChild
            >
              <Link href="/users/new">
                <span className="inline-flex items-center gap-2">
                  Create a user
                  <span className="text-primary-foreground/80">(POST /api/users)</span>
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>

            <Button
              variant="secondary"
              className="rounded-xl justify-between group"
              data-testid="qa-health"
              onClick={() => {}}
              asChild
            >
              <Link href="/health">
                <span className="inline-flex items-center gap-2">
                  View health status
                  <span className="text-muted-foreground">(GET /api/health)</span>
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 rounded-xl border bg-background/60 p-4">
            <p className="text-xs text-muted-foreground" data-testid="home-note">
              This project is intentionally minimal on features, not on craft.
            </p>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}

function MiniFeature({
  icon,
  title,
  desc,
  dataTestId,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  dataTestId: string;
}) {
  return (
    <div
      className="rounded-xl border bg-card/70 p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-[1px]"
      data-testid={dataTestId}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg border bg-background p-2 shadow-sm text-primary">{icon}</div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
    </div>
  );
}
