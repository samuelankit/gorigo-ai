"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, Plus, Pencil, TrendingUp, Layers, DollarSign, Key, Cloud } from "lucide-react";

interface CostConfigData {
  id: number;
  category: string;
  provider: string | null;
  unitCostAmount: number;
  unitType: string;
  markupPercent: number | null;
  sellingPrice: number | null;
  isActive: boolean | null;
  effectiveFrom: string | null;
  createdAt: string | null;
}

interface MarginAnalysis {
  category: string;
  provider: string | null;
  unitCost: number;
  markup: number | null;
  sellingPrice: number;
  margin: number;
  unitType: string;
}

interface RateCardData {
  id: number;
  deploymentModel: string;
  category: string;
  label: string;
  ratePerMinute: number;
  platformFeePerMinute: number;
  includesAiCost: boolean;
  includesTelephonyCost: boolean;
  isActive: boolean;
}

const DEPLOYMENT_MODELS = [
  { value: "individual", label: "Individual", icon: Cloud, description: "Full-service: AI + telephony + platform included" },
  { value: "custom", label: "Custom", icon: Calculator, description: "Bespoke rates and features configured per client" },
];

const RATE_CATEGORIES = [
  { value: "voice_inbound", label: "Inbound Voice" },
  { value: "voice_outbound", label: "Outbound Voice" },
  { value: "ai_chat", label: "AI Chat" },
];

const CATEGORIES = [
  { value: "call_telephony", label: "Call Telephony" },
  { value: "call_ai", label: "Call AI" },
  { value: "transcription", label: "Transcription" },
  { value: "knowledge_embedding", label: "Knowledge Embedding" },
  { value: "platform_fee", label: "Platform Fee" },
  { value: "agent_base_fee", label: "Agent Base Fee" },
  { value: "agent_hop", label: "Agent Hop (Transfer)" },
  { value: "flow_complexity", label: "Flow Complexity Multiplier" },
];

const UNIT_TYPES = [
  { value: "per_minute", label: "Per Minute" },
  { value: "per_1k_tokens", label: "Per 1K Tokens" },
  { value: "per_request", label: "Per Request" },
  { value: "monthly", label: "Monthly" },
  { value: "per_agent", label: "Per Agent" },
  { value: "per_hop", label: "Per Hop" },
  { value: "multiplier", label: "Multiplier" },
];

export default function AdminPricingPage() {
  const [configs, setConfigs] = useState<CostConfigData[]>([]);
  const [marginAnalysis, setMarginAnalysis] = useState<MarginAnalysis[]>([]);
  const [rateCards, setRateCards] = useState<RateCardData[]>([]);
  const [rateCardsLoading, setRateCardsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRateDialogOpen, setEditRateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editRateId, setEditRateId] = useState<number | null>(null);
  const [editRatePerMin, setEditRatePerMin] = useState("");
  const [editPlatformFee, setEditPlatformFee] = useState("");

  const [formCategory, setFormCategory] = useState("");
  const [formProvider, setFormProvider] = useState("");
  const [formUnitCost, setFormUnitCost] = useState("");
  const [formUnitType, setFormUnitType] = useState("");
  const [formMarkup, setFormMarkup] = useState("");
  const [formSellingPrice, setFormSellingPrice] = useState("");

  const [editId, setEditId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editProvider, setEditProvider] = useState("");
  const [editUnitCost, setEditUnitCost] = useState("");
  const [editUnitType, setEditUnitType] = useState("");
  const [editMarkup, setEditMarkup] = useState("");
  const [editSellingPrice, setEditSellingPrice] = useState("");

  const fetchPricing = () => {
    setLoading(true);
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d?.configs) setConfigs(d.configs);
        if (d?.marginAnalysis) setMarginAnalysis(d.marginAnalysis);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoading(false));
  };

  const fetchRateCards = () => {
    setRateCardsLoading(true);
    fetch("/api/admin/rate-cards")
      .then((r) => r.json())
      .then((d) => {
        if (d?.rateCards) setRateCards(d.rateCards);
      })
      .catch((error) => { console.error("Fetch rate cards failed:", error); })
      .finally(() => setRateCardsLoading(false));
  };

  useEffect(() => {
    fetchPricing();
    fetchRateCards();
  }, []);

  const openEditRateDialog = (card: RateCardData) => {
    setEditRateId(card.id);
    setEditRatePerMin(String(card.ratePerMinute));
    setEditPlatformFee(String(card.platformFeePerMinute));
    setEditRateDialogOpen(true);
  };

  const handleUpdateRate = async () => {
    if (!editRateId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rate-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editRateId,
          ratePerMinute: parseFloat(editRatePerMin),
          platformFeePerMinute: parseFloat(editPlatformFee),
        }),
      });
      if (res.ok) {
        setEditRateDialogOpen(false);
        fetchRateCards();
      }
    } catch (error) {
      console.error("Save rate card failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!formCategory || !formUnitCost || !formUnitType) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        category: formCategory,
        unitCostAmount: parseFloat(formUnitCost),
        unitType: formUnitType,
      };
      if (formProvider) body.provider = formProvider;
      if (formMarkup) body.markupPercent = parseFloat(formMarkup);
      if (formSellingPrice) body.sellingPrice = parseFloat(formSellingPrice);

      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        fetchPricing();
      }
    } catch (error) {
      console.error("Create pricing config failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { id: editId };
      if (editCategory) body.category = editCategory;
      if (editProvider) body.provider = editProvider;
      if (editUnitCost) body.unitCostAmount = parseFloat(editUnitCost);
      if (editUnitType) body.unitType = editUnitType;
      if (editMarkup) body.markupPercent = parseFloat(editMarkup);
      if (editSellingPrice) body.sellingPrice = parseFloat(editSellingPrice);

      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditDialogOpen(false);
        fetchPricing();
      }
    } catch (error) {
      console.error("Update pricing config failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (config: CostConfigData) => {
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: config.id, isActive: !config.isActive }),
      });
      if (res.ok) {
        fetchPricing();
      }
    } catch (error) {
      console.error("Toggle pricing config active status failed:", error);
    }
  };

  const openEditDialog = (config: CostConfigData) => {
    setEditId(config.id);
    setEditCategory(config.category);
    setEditProvider(config.provider || "");
    setEditUnitCost(String(config.unitCostAmount));
    setEditUnitType(config.unitType);
    setEditMarkup(config.markupPercent != null ? String(config.markupPercent) : "");
    setEditSellingPrice(config.sellingPrice != null ? String(config.sellingPrice) : "");
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormCategory("");
    setFormProvider("");
    setFormUnitCost("");
    setFormUnitType("");
    setFormMarkup("");
    setFormSellingPrice("");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 4 }).format(amount);

  const formatCategory = (cat: string) => {
    const found = CATEGORIES.find((c) => c.value === cat);
    return found ? found.label : cat;
  };

  const formatUnitType = (ut: string) => {
    const found = UNIT_TYPES.find((u) => u.value === ut);
    return found ? found.label : ut;
  };

  const avgMargin = marginAnalysis.length > 0
    ? (marginAnalysis.reduce((sum, m) => sum + m.margin, 0) / marginAnalysis.length).toFixed(1)
    : "0";

  const uniqueCategories = new Set(configs.map((c) => c.category));

  const revenueEstimate = marginAnalysis.reduce((sum, m) => sum + m.sellingPrice, 0);

  const computeMargin = (config: CostConfigData) => {
    const selling = config.sellingPrice ?? config.unitCostAmount * (1 + (config.markupPercent ?? 40) / 100);
    return selling > 0 ? ((selling - config.unitCostAmount) / selling * 100).toFixed(1) : "0";
  };

  const computeSellingPrice = (config: CostConfigData) => {
    return config.sellingPrice ?? config.unitCostAmount * (1 + (config.markupPercent ?? 40) / 100);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
            <Calculator className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-pricing-title">
              Pricing & Cost Configuration
            </h1>
            <p className="text-sm text-muted-foreground">Manage cost configs and margin analysis for unit economics.</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-add-config">
          <Plus className="h-4 w-4 mr-2" />
          Add Cost Config
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !error && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card data-testid="card-avg-margin">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-margin">{avgMargin}%</div>
            </CardContent>
          </Card>
          <Card data-testid="card-total-categories">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cost Categories</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-categories">{uniqueCategories.size}</div>
            </CardContent>
          </Card>
          <Card data-testid="card-revenue-potential">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Potential</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-revenue-potential">
                {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(revenueEstimate)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-config">
          <DialogHeader>
            <DialogTitle>Add New Cost Config</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger data-testid="select-config-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="config-provider">Provider</Label>
              <Input
                id="config-provider"
                value={formProvider}
                onChange={(e) => setFormProvider(e.target.value)}
                placeholder="gorigo"
                data-testid="input-config-provider"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="config-unit-cost">Unit Cost *</Label>
                <Input
                  id="config-unit-cost"
                  type="number"
                  step="0.0001"
                  value={formUnitCost}
                  onChange={(e) => setFormUnitCost(e.target.value)}
                  placeholder="0.0100"
                  data-testid="input-config-unit-cost"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Type *</Label>
                <Select value={formUnitType} onValueChange={setFormUnitType}>
                  <SelectTrigger data-testid="select-config-unit-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="config-markup">Markup %</Label>
                <Input
                  id="config-markup"
                  type="number"
                  step="0.1"
                  value={formMarkup}
                  onChange={(e) => setFormMarkup(e.target.value)}
                  placeholder="40"
                  data-testid="input-config-markup"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-selling-price">Selling Price</Label>
                <Input
                  id="config-selling-price"
                  type="number"
                  step="0.0001"
                  value={formSellingPrice}
                  onChange={(e) => setFormSellingPrice(e.target.value)}
                  placeholder="Auto-calculated"
                  data-testid="input-config-selling-price"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-config">Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={saving || !formCategory || !formUnitCost || !formUnitType}
                data-testid="button-submit-config"
              >
                {saving ? "Creating..." : "Create Config"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-config">
          <DialogHeader>
            <DialogTitle>Edit Cost Config</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger data-testid="select-edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-provider">Provider</Label>
              <Input
                id="edit-provider"
                value={editProvider}
                onChange={(e) => setEditProvider(e.target.value)}
                placeholder="gorigo"
                data-testid="input-edit-provider"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-unit-cost">Unit Cost</Label>
                <Input
                  id="edit-unit-cost"
                  type="number"
                  step="0.0001"
                  value={editUnitCost}
                  onChange={(e) => setEditUnitCost(e.target.value)}
                  data-testid="input-edit-unit-cost"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Type</Label>
                <Select value={editUnitType} onValueChange={setEditUnitType}>
                  <SelectTrigger data-testid="select-edit-unit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-markup">Markup %</Label>
                <Input
                  id="edit-markup"
                  type="number"
                  step="0.1"
                  value={editMarkup}
                  onChange={(e) => setEditMarkup(e.target.value)}
                  data-testid="input-edit-markup"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-selling-price">Selling Price</Label>
                <Input
                  id="edit-selling-price"
                  type="number"
                  step="0.0001"
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(e.target.value)}
                  data-testid="input-edit-selling-price"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving} data-testid="button-submit-edit">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Calculator className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-pricing-error">Failed to load pricing data. Please try again later.</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Calculator className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-no-configs">No cost configurations found.</p>
            </div>
          ) : (
            <Table data-testid="table-pricing">
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Markup %</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Margin %</TableHead>
                  <TableHead>Unit Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id} data-testid={`row-config-${config.id}`}>
                    <TableCell className="font-medium">{formatCategory(config.category)}</TableCell>
                    <TableCell className="text-sm">{config.provider || "gorigo"}</TableCell>
                    <TableCell className="text-sm" data-testid={`text-unit-cost-${config.id}`}>
                      {formatCurrency(config.unitCostAmount)}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-markup-${config.id}`}>
                      {config.markupPercent != null ? `${config.markupPercent}%` : "40%"}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-selling-price-${config.id}`}>
                      {formatCurrency(computeSellingPrice(config))}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-margin-${config.id}`}>
                      {computeMargin(config)}%
                    </TableCell>
                    <TableCell className="text-sm">{formatUnitType(config.unitType)}</TableCell>
                    <TableCell>
                      {config.isActive ? (
                        <Badge variant="default" className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="default" className="no-default-hover-elevate bg-red-500/10 text-red-600 dark:text-red-400">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(config)}
                          title="Edit"
                          data-testid={`button-edit-config-${config.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(config)}
                          data-testid={`button-toggle-config-${config.id}`}
                        >
                          {config.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 pt-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
          <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground" data-testid="text-rate-cards-title">
            Deployment Model Rate Cards
          </h2>
          <p className="text-sm text-muted-foreground">Per-minute rates for each deployment model. These determine what customers are charged based on their deployment type.</p>
        </div>
      </div>

      <Dialog open={editRateDialogOpen} onOpenChange={setEditRateDialogOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-edit-rate">
          <DialogHeader>
            <DialogTitle>Edit Rate Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-rate-per-min">Rate Per Minute</Label>
              <Input
                id="edit-rate-per-min"
                type="number"
                step="0.0001"
                value={editRatePerMin}
                onChange={(e) => setEditRatePerMin(e.target.value)}
                data-testid="input-edit-rate-per-min"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-platform-fee">Platform Fee Per Minute</Label>
              <Input
                id="edit-platform-fee"
                type="number"
                step="0.0001"
                value={editPlatformFee}
                onChange={(e) => setEditPlatformFee(e.target.value)}
                data-testid="input-edit-platform-fee"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditRateDialogOpen(false)} data-testid="button-cancel-rate-edit">Cancel</Button>
              <Button onClick={handleUpdateRate} disabled={saving} data-testid="button-submit-rate-edit">
                {saving ? "Saving..." : "Save Rate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {DEPLOYMENT_MODELS.map((model) => {
          const ModelIcon = model.icon;
          const modelCards = rateCards.filter((c) => c.deploymentModel === model.value);
          return (
            <Card key={model.value} data-testid={`card-deployment-${model.value}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <ModelIcon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">{model.label}</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs no-default-hover-elevate">{modelCards.length} rates</Badge>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xs text-muted-foreground mb-3">{model.description}</p>
                {rateCardsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : modelCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No rates configured.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Rate/min</TableHead>
                        <TableHead className="text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelCards.map((card) => (
                        <TableRow key={card.id} data-testid={`row-rate-${card.id}`}>
                          <TableCell className="text-xs py-2">
                            {RATE_CATEGORIES.find((c) => c.value === card.category)?.label || card.category}
                          </TableCell>
                          <TableCell className="text-xs py-2 font-mono" data-testid={`text-rate-${card.id}`}>
                            {formatCurrency(card.ratePerMinute)}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditRateDialog(card)}
                              data-testid={`button-edit-rate-${card.id}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
