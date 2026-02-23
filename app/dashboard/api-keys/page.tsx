"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/lib/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface ApiKeyItem {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  revokedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "calls:read", "agents:read", "analytics:read", "billing:read",
  ]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keysData, isLoading: loading } = useQuery<{ keys: ApiKeyItem[] }>({
    queryKey: ["/api/api-keys"],
  });
  const keys = keysData?.keys || [];

  const createMutation = useMutation({
    mutationFn: (body: { name: string; scopes: string[]; expiresInDays: number | null }) =>
      apiRequest("/api/api-keys", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data: any) => {
      setCreatedSecret(data.secretKey);
      setCopied(false);
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: number) => {
      setRevoking(keyId);
      return apiRequest("/api/api-keys/revoke", { method: "PUT", body: JSON.stringify({ keyId }) });
    },
    onSuccess: () => {
      toast({ title: "Revoked", description: "API key has been revoked." });
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to revoke key.", variant: "destructive" });
    },
    onSettled: () => {
      setRevoking(null);
    },
  });

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    const expiresInDays = newKeyExpiry === "never" ? null : parseInt(newKeyExpiry);
    createMutation.mutate({ name: newKeyName.trim(), scopes: selectedScopes, expiresInDays });
  };

  const handleRevoke = async (keyId: number) => {
    revokeMutation.mutate(keyId);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied", description: "API key copied to clipboard." });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy.", variant: "destructive" });
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const activeKeys = keys.filter((k) => !k.isRevoked && (!k.expiresAt || new Date(k.expiresAt) > new Date()));
  const inactiveKeys = keys.filter((k) => k.isRevoked || (k.expiresAt && new Date(k.expiresAt) <= new Date()));

  const keysNeedingRotation = activeKeys.filter((k) => {
    const ageMs = Date.now() - new Date(k.createdAt).getTime();
    return ageMs > 90 * 24 * 60 * 60 * 1000;
  });

  const keysExpiringSoon = activeKeys.filter((k) => {
    if (!k.expiresAt) return false;
    const daysLeft = Math.ceil((new Date(k.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= 14;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
            <Key className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-api-keys-title">
              API Keys
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage API keys for programmatic access to your account.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setCreateOpen(true);
            setNewKeyName("");
            setNewKeyExpiry("never");
            setSelectedScopes(["calls:read", "agents:read", "analytics:read", "billing:read"]);
            setCreatedSecret(null);
          }}
          data-testid="button-create-key"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Key
        </Button>
      </div>

      {keysNeedingRotation.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium" data-testid="text-rotation-warning">
                  {keysNeedingRotation.length} key{keysNeedingRotation.length > 1 ? "s" : ""} older than 90 days
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Security best practice: rotate API keys every 90 days. Create a new key and revoke the old one.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {keysNeedingRotation.map((k) => {
                    const ageDays = Math.floor((Date.now() - new Date(k.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <Badge key={k.id} variant="outline" className="no-default-hover-elevate text-xs">
                        {k.name} ({ageDays}d old)
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {keysExpiringSoon.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium" data-testid="text-expiry-warning">
                  {keysExpiringSoon.length} key{keysExpiringSoon.length > 1 ? "s" : ""} expiring soon
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {keysExpiringSoon.map((k) => {
                    const daysLeft = Math.ceil((new Date(k.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <Badge key={k.id} variant="outline" className="no-default-hover-elevate text-xs">
                        {k.name} ({daysLeft}d left)
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Active Keys</CardTitle>
          <CardDescription>
            {activeKeys.length} of 10 keys used
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activeKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeKeys.map((key) => {
                  const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                  return (
                    <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key.keyPrefix}...****</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(key.scopes && key.scopes.length > 0) ? (
                            key.scopes.length <= 3 ? key.scopes.map((s: string) => (
                              <Badge key={s} variant="secondary" className="no-default-hover-elevate text-xs">
                                {s.replace(":", " ")}
                              </Badge>
                            )) : (
                              <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                                {key.scopes.length} scopes
                              </Badge>
                            )
                          ) : (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">full access</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(key.createdAt)}</TableCell>
                      <TableCell>
                        {key.expiresAt ? (
                          <Badge
                            variant={isExpired ? "destructive" : "secondary"}
                            className="no-default-hover-elevate"
                          >
                            {isExpired ? "Expired" : formatDate(key.expiresAt)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleRevoke(key.id)}
                          disabled={revoking === key.id}
                          data-testid={`button-revoke-key-${key.id}`}
                        >
                          {revoking === key.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {inactiveKeys.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-muted-foreground">Revoked / Expired Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveKeys.map((key: ApiKeyItem) => {
                  const isExpired = key.expiresAt && new Date(key.expiresAt) <= new Date();
                  return (
                    <TableRow key={key.id} className="opacity-60" data-testid={`row-revoked-key-${key.id}`}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key.keyPrefix}...****</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="no-default-hover-elevate text-xs">
                          {key.isRevoked ? "Revoked" : "Expired"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.isRevoked ? formatDate(key.revokedAt) : formatDate(key.expiresAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              Never share your API keys or commit them to version control.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              Use environment variables to store keys in your application.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              Set expiration dates for keys that are used temporarily.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              Revoke keys immediately if you suspect they have been compromised.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              Rotate keys every 90 days. Keys older than 90 days will show a rotation warning.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Use GoRigo with ChatGPT & Other AI Assistants
          </CardTitle>
          <CardDescription>
            Access your call center data directly from ChatGPT, Claude, or any AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/10 flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Create an API key above</p>
                  <p className="text-muted-foreground">Select read-only permissions (View Calls, View Agents, View Analytics, View Billing).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/10 flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Add GoRigo as a ChatGPT Action</p>
                  <p className="text-muted-foreground">
                    In ChatGPT, go to Settings and create a custom GPT. Under Actions, import our OpenAPI spec:
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded block mt-1" data-testid="text-openapi-url">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/v1/openapi.json` : "/api/v1/openapi.json"}
                  </code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/10 flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Set your API key as the authentication</p>
                  <p className="text-muted-foreground">Use "API Key" auth type, header name <code className="text-xs bg-muted px-1 rounded">X-Api-Key</code>, and paste your key.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/10 flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">4</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Start asking questions</p>
                  <p className="text-muted-foreground">
                    Try: "Show my recent calls", "What's my wallet balance?", or "How are my agents performing?"
                  </p>
                </div>
              </div>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Works with ChatGPT (GPT Actions), Claude (MCP), and any AI platform that supports OpenAPI specs.
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreatedSecret(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10">
                <Key className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              {createdSecret ? "Key Created" : "Create API Key"}
            </DialogTitle>
            <DialogDescription>
              {createdSecret
                ? "Copy your key now. You won't be able to see it again."
                : "Create a new API key for programmatic access."}
            </DialogDescription>
          </DialogHeader>

          {createdSecret ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                <code className="flex-1 text-xs break-all font-mono" data-testid="text-secret-key">
                  {createdSecret}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(createdSecret)}
                  data-testid="button-copy-key"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  This key will only be shown once. Make sure to copy it and store it securely.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., ChatGPT Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  data-testid="input-key-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { scope: "calls:read", label: "View Calls" },
                    { scope: "calls:write", label: "Manage Calls" },
                    { scope: "agents:read", label: "View Agents" },
                    { scope: "agents:write", label: "Manage Agents" },
                    { scope: "analytics:read", label: "View Analytics" },
                    { scope: "billing:read", label: "View Billing" },
                    { scope: "knowledge:read", label: "View Knowledge" },
                    { scope: "contacts:read", label: "View Contacts" },
                  ].map(({ scope, label }) => (
                    <label key={scope} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`scope-${scope}`}>
                      <Checkbox
                        checked={selectedScopes.includes(scope)}
                        onCheckedChange={(checked) => {
                          setSelectedScopes((prev) =>
                            checked ? [...prev, scope] : prev.filter((s) => s !== scope)
                          );
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Select which data this key can access. For ChatGPT, read-only permissions are recommended.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-expiry">Expiration</Label>
                <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                  <SelectTrigger data-testid="select-key-expiry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            {createdSecret ? (
              <Button onClick={() => setCreateOpen(false)} data-testid="button-done">
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending || !newKeyName.trim()} data-testid="button-confirm-create">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
