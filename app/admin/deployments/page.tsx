"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight, Cloud, Key, Server, AlertTriangle, Check, X,
  Clock, Phone, Search, ChevronRight, History, ShieldAlert,
} from "lucide-react";

type DeploymentModel = "managed" | "byok" | "self_hosted";

interface OrgItem {
  id: number;
  name: string;
  deploymentModel: string;
  byokMode: string;
  ownerEmail: string;
  balance: number;
  totalCalls: number;
  activeCalls: number;
  createdAt: string;
  lastModelChange: {
    oldModel: string;
    newModel: string;
    status: string;
    createdAt: string;
    initiatedByEmail: string;
  } | null;
}

interface ChangeHistoryItem {
  id: number;
  orgId: number;
  oldModel: string;
  newModel: string;
  status: string;
  reason: string | null;
  activeCallsAtSwitch: number;
  initiatedByEmail: string;
  effectiveAt: string;
  createdAt: string;
}

interface SwitchPrerequisite {
  ready: boolean;
  message: string;
}

interface SwitchDetails {
  org: { id: number; name: string; deploymentModel: string; byokMode: string };
  rates: Array<{ category: string; ratePerMinute: number; includesAiCost: boolean; includesTelephonyCost: boolean; label: string }>;
  activeCalls: number;
  byokStatus: {
    openai: { configured: boolean; masked: string; source: string };
    twilio: { configured: boolean; maskedSid: string; maskedPhone: string; source: string };
  };
  availableModels: Record<string, {
    rates: Array<{ category: string; ratePerMinute: number; label: string }>;
    prerequisites?: { met: boolean; details: Record<string, SwitchPrerequisite> };
  }>;
  changeHistory: ChangeHistoryItem[];
}

const MODEL_CONFIG: Record<DeploymentModel, { label: string; icon: typeof Cloud; color: string; bgColor: string; badgeClass: string; description: string }> = {
  managed: {
    label: "Managed",
    icon: Cloud,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description: "Full-service hosted. AI + telephony costs included.",
  },
  byok: {
    label: "BYOK",
    icon: Key,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    description: "Bring Your Own Keys. Platform fee only.",
  },
  self_hosted: {
    label: "Self-Hosted",
    icon: Server,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    description: "Client infrastructure. License fee per minute.",
  },
};

function ModelBadge({ model }: { model: string }) {
  const config = MODEL_CONFIG[model as DeploymentModel] || MODEL_CONFIG.managed;
  const Icon = config.icon;
  return (
    <Badge variant="default" className={cn("no-default-hover-elevate gap-1", config.badgeClass)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export default function DeploymentsPage() {
  const { toast } = useToast();
  const [orgList, setOrgList] = useState<OrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModel, setFilterModel] = useState("all");

  const [selectedOrg, setSelectedOrg] = useState<OrgItem | null>(null);
  const [switchDetails, setSwitchDetails] = useState<SwitchDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [targetModel, setTargetModel] = useState<DeploymentModel | "">("");
  const [switchReason, setSwitchReason] = useState("");
  const [switching, setSwitching] = useState(false);
  const [forceSwitch, setForceSwitch] = useState(false);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orgs");
      const data = await res.json();
      if (data?.orgs) setOrgList(data.orgs);
    } catch {
      toast({ title: "Error", description: "Failed to load organisations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const openSwitchDialog = async (org: OrgItem) => {
    setSelectedOrg(org);
    setShowSwitchDialog(true);
    setLoadingDetails(true);
    setTargetModel("");
    setSwitchReason("");
    setForceSwitch(false);

    try {
      const res = await fetch(`/api/admin/orgs/${org.id}/deployment-model`);
      const data = await res.json();
      setSwitchDetails(data);
    } catch {
      toast({ title: "Error", description: "Failed to load deployment details.", variant: "destructive" });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSwitch = async () => {
    if (!selectedOrg || !targetModel) return;
    setSwitching(true);

    try {
      const res = await fetch(`/api/admin/orgs/${selectedOrg.id}/deployment-model`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deploymentModel: targetModel,
          reason: switchReason || undefined,
          forceSwitch,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresForce) {
          setForceSwitch(true);
          toast({
            title: "Action Required",
            description: data.message || data.error,
            variant: "destructive",
          });
        } else {
          toast({ title: "Switch Failed", description: data.error || "Unknown error", variant: "destructive" });
        }
        return;
      }

      toast({
        title: "Deployment Model Switched",
        description: data.message,
      });

      setShowSwitchDialog(false);
      fetchOrgs();
    } catch {
      toast({ title: "Error", description: "Network error during switch.", variant: "destructive" });
    } finally {
      setSwitching(false);
    }
  };

  const filteredOrgs = orgList.filter((org) => {
    const matchesSearch = !search || org.name.toLowerCase().includes(search.toLowerCase()) || org.ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterModel === "all" || org.deploymentModel === filterModel;
    return matchesSearch && matchesFilter;
  });

  const modelCounts = orgList.reduce(
    (acc, org) => {
      const m = (org.deploymentModel || "managed") as string;
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const selectedTargetPrereqs = targetModel && switchDetails?.availableModels?.[targetModel]?.prerequisites;
  const selectedTargetRates = targetModel ? switchDetails?.availableModels?.[targetModel]?.rates : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center shrink-0">
          <ArrowLeftRight className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-deployments-title">Deployment Management</h1>
          <p className="text-sm text-muted-foreground">Switch client deployment models with prerequisite validation and audit trail.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["managed", "byok", "self_hosted"] as DeploymentModel[]).map((model) => {
          const config = MODEL_CONFIG[model];
          const Icon = config.icon;
          const count = modelCounts[model] || 0;
          return (
            <Card key={model}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg shrink-0", config.bgColor)}>
                  <Icon className={cn("w-5 h-5", config.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground" data-testid={`text-count-${model}`}>{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label} Clients</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Client Deployment Models</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  className="pl-8 w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-deployments"
                />
              </div>
              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger className="w-36" data-testid="select-filter-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  <SelectItem value="managed">Managed</SelectItem>
                  <SelectItem value="byok">BYOK</SelectItem>
                  <SelectItem value="self_hosted">Self-Hosted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground" data-testid="text-no-orgs">No organisations found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead>Last Change</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => (
                  <TableRow key={org.id} data-testid={`row-org-${org.id}`}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{org.ownerEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ModelBadge model={org.deploymentModel || "managed"} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">{formatCurrency(org.balance)}</TableCell>
                    <TableCell className="text-right text-sm">{org.totalCalls}</TableCell>
                    <TableCell className="text-right">
                      {org.activeCalls > 0 ? (
                        <Badge variant="default" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">
                          <Phone className="h-3 w-3 mr-1" />
                          {org.activeCalls}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {org.lastModelChange ? (
                        <div className="text-xs text-muted-foreground">
                          <span>{org.lastModelChange.oldModel}</span>
                          <ChevronRight className="inline h-3 w-3 mx-0.5" />
                          <span>{org.lastModelChange.newModel}</span>
                          <p className="mt-0.5">{formatDate(org.lastModelChange.createdAt)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never changed</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSwitchDialog(org)}
                        data-testid={`button-switch-org-${org.id}`}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
                        Switch
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Switch Deployment Model
            </DialogTitle>
            <DialogDescription>
              {selectedOrg?.name} - Currently on <strong>{MODEL_CONFIG[(selectedOrg?.deploymentModel || "managed") as DeploymentModel]?.label}</strong>
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : switchDetails ? (
            <div className="space-y-4 py-2">
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Current Rates</Label>
                  <div className="mt-1 space-y-1">
                    {switchDetails.rates.map((r) => (
                      <div key={r.category} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{r.category === "voice_inbound" ? "Inbound" : r.category === "voice_outbound" ? "Outbound" : "AI Chat"}</span>
                        <span className="font-mono font-medium">{"\u00A3"}{r.ratePerMinute.toFixed(4)}/min</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">BYOK Key Status</Label>
                  <div className="mt-1 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      {switchDetails.byokStatus.openai.configured ? (
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      )}
                      <span>OpenAI: {switchDetails.byokStatus.openai.masked}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {switchDetails.byokStatus.twilio.configured ? (
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      )}
                      <span>Twilio: {switchDetails.byokStatus.twilio.maskedSid}</span>
                    </div>
                  </div>
                </div>
              </div>

              {switchDetails.activeCalls > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {switchDetails.activeCalls} active call{switchDetails.activeCalls > 1 ? "s" : ""} in progress
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      Active calls will finish billing at the current rate. New calls will use the new rate.
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Switch To</Label>
                <Select value={targetModel} onValueChange={(v) => { setTargetModel(v as DeploymentModel); setForceSwitch(false); }}>
                  <SelectTrigger data-testid="select-target-model">
                    <SelectValue placeholder="Select target deployment model" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(switchDetails.availableModels).map(([model]) => {
                      const config = MODEL_CONFIG[model as DeploymentModel];
                      const Icon = config.icon;
                      return (
                        <SelectItem key={model} value={model}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", config.color)} />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {targetModel && selectedTargetRates && (
                <Card className="bg-muted/30">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Rates After Switch</p>
                    {selectedTargetRates.map((r) => (
                      <div key={r.category} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{r.category === "voice_inbound" ? "Inbound" : r.category === "voice_outbound" ? "Outbound" : "AI Chat"}</span>
                        <span className="font-mono font-medium">{"\u00A3"}{r.ratePerMinute.toFixed(4)}/min</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {selectedTargetPrereqs && typeof selectedTargetPrereqs === "object" && "met" in selectedTargetPrereqs && (
                <div className={cn("p-3 rounded-md border", selectedTargetPrereqs.met ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20")}>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedTargetPrereqs.met ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                    )}
                    <p className={cn("text-sm font-medium", selectedTargetPrereqs.met ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                      {selectedTargetPrereqs.met ? "All prerequisites met" : "Prerequisites not met"}
                    </p>
                  </div>
                  {"details" in selectedTargetPrereqs && selectedTargetPrereqs.details && Object.entries(selectedTargetPrereqs.details as Record<string, SwitchPrerequisite>).map(([key, prereq]) => (
                    <div key={key} className="flex items-start gap-2 ml-6 mt-1">
                      {prereq.ready ? (
                        <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <p className="text-xs text-muted-foreground">{prereq.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason for Switch (optional)</Label>
                <Textarea
                  placeholder="Client requested upgrade, contract renewal, etc."
                  value={switchReason}
                  onChange={(e) => setSwitchReason(e.target.value)}
                  className="resize-none"
                  data-testid="input-switch-reason"
                />
              </div>

              {forceSwitch && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-red-600 dark:text-red-400">Force switch enabled</p>
                    <p className="text-muted-foreground mt-0.5">
                      This will switch the model despite warnings. Active calls continue at the old rate. Missing API keys may cause new calls to fail.
                    </p>
                  </div>
                </div>
              )}

              {switchDetails.changeHistory.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Change History</Label>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {switchDetails.changeHistory.slice(0, 5).map((ch) => (
                        <div key={ch.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            <ModelBadge model={ch.oldModel} />
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <ModelBadge model={ch.newModel} />
                          </div>
                          <div className="text-right text-muted-foreground">
                            <p>{ch.initiatedByEmail || "System"}</p>
                            <p>{formatDate(ch.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSwitchDialog(false)} data-testid="button-cancel-switch">
              Cancel
            </Button>
            <Button
              onClick={handleSwitch}
              disabled={!targetModel || switching}
              data-testid="button-confirm-switch"
            >
              {switching ? (
                <>
                  <Clock className="h-4 w-4 mr-1.5 animate-spin" />
                  Switching...
                </>
              ) : forceSwitch ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Force Switch
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-4 w-4 mr-1.5" />
                  Switch Model
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
