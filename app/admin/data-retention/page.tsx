"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Trash2, Database, Clock, RefreshCw, AlertTriangle } from "lucide-react";

interface RetentionPolicy {
  days: number;
  description: string;
}

interface RetentionData {
  policies: Record<string, RetentionPolicy>;
  pendingDeletion: Record<string, number>;
  totalRecords: Record<string, number>;
}

export default function DataRetentionPage() {
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useState(() => {
    fetch("/api/admin/data-retention")
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load retention data"); setLoading(false); });
  });

  async function triggerCleanup() {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/data-retention", { method: "POST" });
      const result = await res.json();
      setLastResult(result.result || result);
      const refreshRes = await fetch("/api/admin/data-retention");
      const refreshed = await refreshRes.json();
      setData(refreshed);
    } catch {
      setError("Cleanup failed");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="text-destructive bg-destructive/10 rounded-md p-4" data-testid="text-retention-error">{error}</div>
      </div>
    );
  }

  const totalPending = data ? Object.values(data.pendingDeletion).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-retention-title">
            <Shield className="h-6 w-6" />
            Data Retention & GDPR Compliance
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage data lifecycle policies and enforce retention periods
          </p>
        </div>
        <Button onClick={triggerCleanup} disabled={running} data-testid="button-run-cleanup">
          {running ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
          {running ? "Running..." : "Run Cleanup Now"}
        </Button>
      </div>

      {totalPending > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200" data-testid="text-pending-count">
              {totalPending} records past retention period
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              These records have exceeded their retention period and will be cleaned up in the next automated cycle or when you run cleanup manually.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data && Object.entries(data.policies).map(([key, policy]) => {
          const pending = data.pendingDeletion[key] || 0;
          const hasPending = pending > 0;
          return (
            <Card key={key} className={hasPending ? "border-amber-300 dark:border-amber-700" : ""} data-testid={`card-retention-${key}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </CardTitle>
                  <Badge variant={hasPending ? "destructive" : "secondary"} data-testid={`badge-pending-${key}`}>
                    {hasPending ? `${pending} pending` : "Clean"}
                  </Badge>
                </div>
                <CardDescription className="text-xs">{policy.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Retained for <strong>{policy.days} days</strong></span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data && Object.entries(data.totalRecords).map(([key, count]) => (
              <div key={key} className="text-center p-3 rounded-lg bg-muted/50" data-testid={`stat-total-${key}`}>
                <div className="text-2xl font-bold">{Number(count).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground capitalize mt-1">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className="border-green-300 dark:border-green-700">
          <CardHeader>
            <CardTitle className="text-lg text-green-700 dark:text-green-400">Cleanup Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto" data-testid="text-cleanup-result">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
