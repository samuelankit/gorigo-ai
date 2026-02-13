import AppShell from "@/components/AppShell";
import SectionCard from "@/components/SectionCard";
import { useCreateUser } from "@/hooks/use-users";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, Sparkles, User } from "lucide-react";
import { useMemo, useState } from "react";

export default function CreateUserPage() {
  const { toast } = useToast();
  const createUser = useCreateUser();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = useMemo(() => username.trim().length >= 2 && password.length >= 4, [username, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || createUser.isPending) return;

    try {
      const created = await createUser.mutateAsync({ username: username.trim(), password });
      toast({
        title: "User created",
        description: `Created ${created.username} (${created.id}).`,
      });
      setUsername("");
      setPassword("");
    } catch (err) {
      toast({
        title: "Could not create user",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <AppShell title="Create user" eyebrow="POST /api/users">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <SectionCard
          title="New account"
          description="A simple, validated form wired to the API contract."
          className="lg:col-span-2"
          data-testid="create-user-card"
        >
          <form onSubmit={onSubmit} className="space-y-4" data-testid="create-user-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" data-testid="label-username">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. studio-admin"
                    className="pl-10 rounded-xl border-2 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    data-testid="input-username"
                    autoComplete="username"
                  />
                </div>
                <p className="text-xs text-muted-foreground" data-testid="hint-username">
                  Minimum 2 characters.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" data-testid="label-password">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 rounded-xl border-2 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    data-testid="input-password"
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground" data-testid="hint-password">
                  Minimum 4 characters (demo).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <Button
                type="submit"
                className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all"
                disabled={!canSubmit || createUser.isPending}
                data-testid="submit-create-user"
                onClick={() => {}}
              >
                {createUser.isPending ? "Creating…" : "Create user"}
              </Button>

              <div className="text-xs text-muted-foreground" data-testid="create-user-meta">
                Uses Zod-validated input + typed error handling.
              </div>
            </div>

            {createUser.error ? (
              <Alert variant="destructive" className="rounded-2xl" data-testid="create-user-error">
                <AlertTitle>Request failed</AlertTitle>
                <AlertDescription>{createUser.error.message}</AlertDescription>
              </Alert>
            ) : null}

            {createUser.data ? (
              <div
                className="rounded-2xl border bg-emerald-500/5 p-4 sm:p-5 shadow-sm"
                data-testid="create-user-success"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border bg-card p-2.5 shadow-sm">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Success</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Created <span className="font-medium text-foreground">{createUser.data.username}</span> with id{" "}
                      <span className="font-mono text-xs">{createUser.data.id}</span>.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </form>
        </SectionCard>

        <SectionCard
          title="Notes"
          description="Small details that make it feel premium."
          data-testid="create-user-notes"
        >
          <div className="space-y-3">
            <div className="rounded-xl border bg-background/60 p-4">
              <div className="text-sm font-semibold">Accessibility</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Strong focus rings, labels, and clear error messaging.
              </p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <div className="text-sm font-semibold">Micro-interactions</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Buttons lift on hover; surfaces have subtle depth and grain.
              </p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <div className="text-sm font-semibold">Next steps</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Add list/search endpoints and reuse the same hook patterns for full CRUD.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
