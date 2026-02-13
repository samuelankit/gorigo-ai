"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Globe, Loader2, AlertTriangle, Check, Clock, Webhook } from "lucide-react";
import { useToast } from "@/lib/use-toast";

interface WebhookItem {
  id: number;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggered: string | null;
  failureCount: number;
  createdAt: string;
}

const AVAILABLE_EVENTS = [
  "call.completed",
  "call.started",
  "call.handoff",
  "call.voicemail",
  "lead.captured",
  "campaign.completed",
  "sentiment.alert",
];

export default function WebhooksPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const fetchWebhooks = () => {
    setLoading(true);
    fetch("/api/webhooks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWebhooks(data);
        }
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load webhooks", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const openDialog = () => {
    setUrl("");
    setSelectedEvents([]);
    setDialogOpen(true);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSubmit = async () => {
    if (!url.trim()) {
      toast({ title: "Validation Error", description: "Webhook URL is required", variant: "destructive" });
      return;
    }
    if (selectedEvents.length === 0) {
      toast({ title: "Validation Error", description: "Select at least one event", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          events: selectedEvents,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create webhook");
      }

      toast({ title: "Webhook Added", description: "Your webhook has been configured successfully." });
      setDialogOpen(false);
      fetchWebhooks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create webhook", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/webhooks?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete webhook");
      toast({ title: "Webhook Deleted", description: "The webhook has been removed." });
      fetchWebhooks();
    } catch {
      toast({ title: "Error", description: "Failed to delete webhook", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-webhooks-title">Webhooks</h1>
          <p className="text-muted-foreground text-sm mt-1">Receive real-time notifications for events in your account</p>
        </div>
        <Button onClick={openDialog} data-testid="button-add-webhook">
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Webhook className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm" data-testid="text-no-webhooks">
                No webhooks configured. Add a webhook to receive event notifications via HTTP.
              </p>
              <Button onClick={openDialog} variant="outline" className="mt-4" data-testid="button-create-first-webhook">
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead>Failures</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id} data-testid={`row-webhook-${webhook.id}`}>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate" data-testid={`text-webhook-url-${webhook.id}`}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{webhook.url}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(webhook.events || []).map((event) => (
                            <Badge key={event} variant="secondary" className="no-default-hover-elevate text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {webhook.isActive ? (
                          <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="no-default-hover-elevate">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {formatDate(webhook.lastTriggered)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {webhook.failureCount > 0 ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                            <span className="text-yellow-600 dark:text-yellow-400">{webhook.failureCount}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(webhook.id)}
                          disabled={deletingId === webhook.id}
                          data-testid={`button-delete-webhook-${webhook.id}`}
                        >
                          {deletingId === webhook.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>Configure an endpoint to receive event notifications.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-server.com/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                data-testid="input-webhook-url"
              />
            </div>
            <div className="space-y-3">
              <Label>Events</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedEvents.includes(event)}
                      onCheckedChange={() => toggleEvent(event)}
                      data-testid={`checkbox-event-${event}`}
                    />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-webhook">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} data-testid="button-submit-webhook">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
