"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  Phone,
  Shield,
  Bot,
  CreditCard,
  FileText,
} from "lucide-react";

interface AuditEntry {
  id: number;
  actorId: number | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const PAGE_SIZE = 25;

function getEntityIcon(entityType: string) {
  switch (entityType.toLowerCase()) {
    case "user":
    case "session":
      return <User className="w-4 h-4" />;
    case "agent":
      return <Bot className="w-4 h-4" />;
    case "call":
    case "call_log":
      return <Phone className="w-4 h-4" />;
    case "knowledge":
    case "document":
      return <FileText className="w-4 h-4" />;
    case "billing":
    case "wallet":
    case "payment":
      return <CreditCard className="w-4 h-4" />;
    case "compliance":
    case "dnc":
    case "consent":
      return <Shield className="w-4 h-4" />;
    case "settings":
    case "org":
      return <Settings className="w-4 h-4" />;
    default:
      return <ClipboardList className="w-4 h-4" />;
  }
}

function getActionBadgeClass(action: string) {
  if (action.startsWith("create") || action.startsWith("add")) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (action.startsWith("update") || action.startsWith("edit") || action.startsWith("save")) {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  }
  if (action.startsWith("delete") || action.startsWith("remove")) {
    return "bg-red-500/10 text-red-600 dark:text-red-400";
  }
  if (action.startsWith("login") || action.startsWith("logout")) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  return "bg-muted text-muted-foreground";
}

export default function ActivityPage() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<{ logs: AuditEntry[] }>({
    queryKey: ["/api/audit/client", { page }],
    queryFn: async () => {
      const res = await fetch(`/api/audit/client?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const logs = data?.logs || [];

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
          <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-activity-title">Activity Log</h1>
          <p className="text-sm text-muted-foreground">Review your recent account activity and changes.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <ClipboardList className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-muted-foreground text-sm" data-testid="text-no-activity">
                No activity recorded yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 p-3 rounded-md border"
                  data-testid={`row-activity-${entry.id}`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {getEntityIcon(entry.entityType)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="default"
                        className={`no-default-hover-elevate ${getActionBadgeClass(entry.action)}`}
                      >
                        {entry.action.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className="no-default-hover-elevate text-xs">
                        {entry.entityType}
                      </Badge>
                      {entry.entityId && (
                        <span className="text-xs text-muted-foreground">#{entry.entityId}</span>
                      )}
                    </div>
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {JSON.stringify(entry.details).substring(0, 120)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatTime(entry.createdAt)}
                      {entry.actorEmail && ` by ${entry.actorEmail}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-prev-activity">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={logs.length < PAGE_SIZE} onClick={() => setPage(page + 1)} data-testid="button-next-activity">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
