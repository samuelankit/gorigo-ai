"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, Phone, Loader2, Send, Clock, AlertTriangle, Check } from "lucide-react";
import { useToast } from "@/lib/use-toast";

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  agentId: number | null;
  status: string;
  contactList: string[];
  scheduledAt: string | null;
  totalContacts: number;
  completedCount: number;
  failedCount: number;
  callInterval: number;
  createdAt: string;
}

interface Agent {
  id: number;
  name: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
    case "scheduled":
      return <Badge className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">{status}</Badge>;
    case "active":
      return <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{status}</Badge>;
    case "paused":
      return <Badge className="no-default-hover-elevate bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">{status}</Badge>;
    case "completed":
      return <Badge className="no-default-hover-elevate">{status}</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="no-default-hover-elevate">{status}</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
  }
}

export default function CampaignsPage() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [contactListText, setContactListText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [callInterval, setCallInterval] = useState("30");

  const fetchCampaigns = () => {
    setLoading(true);
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCampaigns(data);
        }
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load campaigns", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  };

  const fetchAgents = () => {
    setLoadingAgents(true);
    fetch("/api/agents/multi")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.agents)) {
          setAgents(data.agents);
        } else if (data?.agent) {
          setAgents([data.agent]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAgents(false));
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const openDialog = () => {
    setName("");
    setDescription("");
    setAgentId("");
    setContactListText("");
    setScheduledAt("");
    setCallInterval("30");
    fetchAgents();
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Campaign name is required", variant: "destructive" });
      return;
    }

    const phones = contactListText
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          agentId: agentId ? parseInt(agentId) : null,
          contactList: phones,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          callInterval: parseInt(callInterval) || 30,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create campaign");
      }

      toast({ title: "Campaign Created", description: `"${name}" has been created successfully.` });
      setDialogOpen(false);
      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create campaign", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not scheduled";
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
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-campaigns-title">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your outbound calling campaigns</p>
        </div>
        <Button onClick={openDialog} data-testid="button-new-campaign">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Send className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm" data-testid="text-no-campaigns">
                No campaigns yet. Create your first campaign to start reaching out to contacts.
              </p>
              <Button onClick={openDialog} variant="outline" className="mt-4" data-testid="button-create-first-campaign">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{campaign.name}</CardTitle>
                  {getStatusBadge(campaign.status)}
                </div>
                {campaign.description && (
                  <CardDescription className="text-sm">{campaign.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-lg font-semibold text-foreground" data-testid={`text-total-contacts-${campaign.id}`}>
                      {campaign.totalContacts}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400" data-testid={`text-completed-contacts-${campaign.id}`}>
                      {campaign.completedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Done</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400" data-testid={`text-failed-contacts-${campaign.id}`}>
                      {campaign.failedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  {campaign.agentId && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>Agent #{campaign.agentId}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDate(campaign.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{campaign.callInterval}s between calls</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>Set up an outbound calling campaign for your contacts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g. Spring Follow-ups"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-campaign-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-description">Description</Label>
              <Input
                id="campaign-description"
                placeholder="Brief description of the campaign"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-campaign-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-agent">Agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger data-testid="select-campaign-agent">
                  <SelectValue placeholder={loadingAgents ? "Loading agents..." : "Select an agent"} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={String(agent.id)}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-contacts">Contact List (one phone number per line)</Label>
              <Textarea
                id="campaign-contacts"
                placeholder={"+1234567890\n+0987654321"}
                value={contactListText}
                onChange={(e) => setContactListText(e.target.value)}
                rows={4}
                data-testid="textarea-campaign-contacts"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-schedule">Schedule Date/Time</Label>
                <Input
                  id="campaign-schedule"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  data-testid="input-campaign-schedule"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-interval">Call Interval (seconds)</Label>
                <Input
                  id="campaign-interval"
                  type="number"
                  min="5"
                  value={callInterval}
                  onChange={(e) => setCallInterval(e.target.value)}
                  data-testid="input-campaign-interval"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-campaign">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} data-testid="button-submit-campaign">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
