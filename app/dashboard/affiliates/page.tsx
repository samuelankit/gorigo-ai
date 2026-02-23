"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Plus, Copy, MousePointerClick, UserPlus, PoundSterling } from "lucide-react";
import { useToast } from "@/lib/use-toast";

interface Affiliate {
  id: number;
  code: string;
  name: string;
  email: string;
  commissionRate: number;
  commissionType: string;
  totalClicks: number;
  totalSignups: number;
  totalEarnings: number;
  pendingPayout: number;
  status: string;
  ownerType: string;
  createdAt: string;
}

interface Stats {
  totalClicks: number;
  totalSignups: number;
  totalEarnings: number;
}

export default function AffiliatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRate, setFormRate] = useState(10);
  const [formNotes, setFormNotes] = useState("");

  const { data, isLoading } = useQuery<{ affiliates: Affiliate[]; stats: Stats; canCreate: boolean }>({
    queryKey: ["/api/affiliates"],
  });

  const affiliates = data?.affiliates || [];
  const stats = data?.stats || { totalClicks: 0, totalSignups: 0, totalEarnings: 0 };
  const canCreate = data?.canCreate || false;

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; email: string; commissionRate: number; notes?: string }) =>
      apiRequest("/api/affiliates", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast({ title: "Affiliate created", description: "New affiliate link has been created successfully." });
      setDialogOpen(false);
      setFormName("");
      setFormEmail("");
      setFormRate(10);
      setFormNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to create affiliate.", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast({ title: "Validation error", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    if (formRate < 1 || formRate > 50) {
      toast({ title: "Validation error", description: "Commission rate must be between 1 and 50.", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      name: formName.trim(),
      email: formEmail.trim(),
      commissionRate: formRate,
      notes: formNotes.trim() || undefined,
    });
  };

  const copyReferralUrl = (code: string) => {
    const url = `${window.location.origin}/affiliate/track?ref=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Copied", description: "Referral URL copied to clipboard." });
    }).catch(() => {
      toast({ title: "Error", description: "Failed to copy URL.", variant: "destructive" });
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 no-default-hover-elevate" data-testid={`badge-status-${status}`}>
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 no-default-hover-elevate" data-testid={`badge-status-${status}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 shrink-0">
          <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-affiliates-title">
            My Affiliates
          </h1>
          <p className="text-sm text-muted-foreground">Create and manage affiliate referral links for your network</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-32 w-full rounded-md" data-testid="skeleton-stat-clicks" />
            <Skeleton className="h-32 w-full rounded-md" data-testid="skeleton-stat-signups" />
            <Skeleton className="h-32 w-full rounded-md" data-testid="skeleton-stat-earnings" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Clicks</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-stat-total-clicks">
                      {Number(stats.totalClicks).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                    <MousePointerClick className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Signups</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-stat-total-signups">
                      {Number(stats.totalSignups).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center shrink-0">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Earnings</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-stat-total-earnings">
                      £{Number(stats.totalEarnings).toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                    <PoundSterling className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {canCreate && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-affiliate">
                <Plus className="h-4 w-4 mr-2" />
                Create Affiliate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Affiliate Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="affiliate-name">Name</Label>
                  <Input
                    id="affiliate-name"
                    placeholder="Affiliate name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    data-testid="input-affiliate-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affiliate-email">Email</Label>
                  <Input
                    id="affiliate-email"
                    type="email"
                    placeholder="affiliate@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    data-testid="input-affiliate-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affiliate-rate">Commission Rate (%)</Label>
                  <Input
                    id="affiliate-rate"
                    type="number"
                    min={1}
                    max={50}
                    value={formRate}
                    onChange={(e) => setFormRate(Number(e.target.value))}
                    data-testid="input-affiliate-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affiliate-notes">Notes (optional)</Label>
                  <Textarea
                    id="affiliate-notes"
                    placeholder="Optional notes about this affiliate"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    data-testid="input-affiliate-notes"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  data-testid="button-submit-affiliate"
                >
                  {createMutation.isPending ? "Creating..." : "Create Affiliate"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Affiliate Links</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-table-row-${i}`} />
              ))}
            </div>
          ) : affiliates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" data-testid="empty-state-affiliates">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Link2 className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-muted-foreground text-sm">No affiliate links found.</p>
              {canCreate && (
                <p className="text-muted-foreground text-xs mt-1">Create your first affiliate link to get started.</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Commission %</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Signups</TableHead>
                  <TableHead>Earnings (£)</TableHead>
                  <TableHead>Pending (£)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((aff) => (
                  <TableRow key={aff.id} data-testid={`row-affiliate-${aff.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono" data-testid={`text-code-${aff.id}`}>{aff.code}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyReferralUrl(aff.code)}
                          data-testid={`button-copy-${aff.id}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-name-${aff.id}`}>{aff.name}</TableCell>
                    <TableCell className="text-sm" data-testid={`text-email-${aff.id}`}>{aff.email}</TableCell>
                    <TableCell className="text-sm" data-testid={`text-rate-${aff.id}`}>{aff.commissionRate}%</TableCell>
                    <TableCell className="text-sm" data-testid={`text-clicks-${aff.id}`}>{aff.totalClicks}</TableCell>
                    <TableCell className="text-sm" data-testid={`text-signups-${aff.id}`}>{aff.totalSignups}</TableCell>
                    <TableCell className="text-sm" data-testid={`text-earnings-${aff.id}`}>£{Number(aff.totalEarnings).toFixed(2)}</TableCell>
                    <TableCell className="text-sm" data-testid={`text-pending-${aff.id}`}>£{Number(aff.pendingPayout).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(aff.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
