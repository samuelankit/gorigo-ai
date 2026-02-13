"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  ShoppingCart,
  Truck,
  Loader2,
  CheckCircle2,
  Trash2,
  X,
  DollarSign,
  Send,
} from "lucide-react";

interface Workspace { id: number; name: string; type: string; currency: string; }
interface Supplier { id: number; name: string; email: string; phone: string; totalBilled: number; totalPaid: number; }
interface Bill {
  id: number;
  billNumber: string;
  status: string;
  category: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  supplierName?: string;
  supplierId: number;
}
interface BillLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

const statusColors: Record<string, string> = {
  draft: "secondary",
  received: "default",
  paid: "default",
  overdue: "destructive",
};

const categories = [
  "Office Supplies", "Software & IT", "Travel", "Rent", "Utilities",
  "Marketing", "Insurance", "Legal", "Professional Services", "Other",
];

export default function PurchasesPage() {
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWsId, setActiveWsId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("bills");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [supForm, setSupForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [savingSup, setSavingSup] = useState(false);

  const [showNewBill, setShowNewBill] = useState(false);
  const [billSupplierId, setBillSupplierId] = useState("");
  const [billCategory, setBillCategory] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billNotes, setBillNotes] = useState("");
  const [billLines, setBillLines] = useState<BillLine[]>([{ description: "", quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]);
  const [savingBill, setSavingBill] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [payBillId, setPayBillId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [savingPay, setSavingPay] = useState(false);

  useEffect(() => {
    fetch("/api/finance/workspaces")
      .then((r) => r.json())
      .then((data) => {
        if (data.workspaces?.length) {
          setWorkspaces(data.workspaces);
          const wsParam = searchParams.get("ws");
          setActiveWsId(wsParam || String(data.workspaces[0].id));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    const actionParam = searchParams.get("action");
    if (actionParam === "new-bill") setShowNewBill(true);
  }, [searchParams]);

  const fetchData = useCallback(() => {
    if (!activeWsId) return;
    fetch(`/api/finance/suppliers?workspaceId=${activeWsId}`).then((r) => r.json()).then((d) => setSuppliers(d.suppliers || [])).catch(() => {});
    fetch(`/api/finance/bills?workspaceId=${activeWsId}`).then((r) => r.json()).then((d) => setBills(d.bills || [])).catch(() => {});
  }, [activeWsId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeWs = workspaces.find((w) => String(w.id) === activeWsId);
  const sym = activeWs?.currency === "USD" ? "$" : activeWs?.currency === "EUR" ? "\u20ac" : "\u00a3";
  const fmt = (v: number) => `${sym}${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleAddSupplier = async () => {
    if (!supForm.name.trim()) return;
    setSavingSup(true);
    try {
      await fetch("/api/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...supForm, workspaceId: Number(activeWsId) }),
      });
      setSupForm({ name: "", email: "", phone: "", address: "" });
      setShowNewSupplier(false);
      fetchData();
    } catch {}
    setSavingSup(false);
  };

  const updateLine = (i: number, field: keyof BillLine, value: string | number) => {
    const updated = [...billLines];
    (updated[i] as any)[field] = value;
    updated[i].amount = (updated[i].quantity || 0) * (updated[i].unitPrice || 0);
    setBillLines(updated);
  };

  const addLine = () => setBillLines([...billLines, { description: "", quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]);
  const removeLine = (i: number) => { if (billLines.length > 1) setBillLines(billLines.filter((_, idx) => idx !== i)); };

  const billSubtotal = billLines.reduce((s, l) => s + l.amount, 0);
  const billTax = billLines.reduce((s, l) => s + l.amount * (l.taxRate / 100), 0);
  const billTotal = billSubtotal + billTax;

  const handleCreateBill = async () => {
    if (!billSupplierId || billLines.every((l) => !l.description.trim())) return;
    setSavingBill(true);
    try {
      await fetch("/api/finance/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: Number(activeWsId),
          supplierId: Number(billSupplierId),
          category: billCategory || undefined,
          dueDate: billDueDate || undefined,
          notes: billNotes || undefined,
          status: "draft",
          lines: billLines.filter((l) => l.description.trim()),
        }),
      });
      setShowNewBill(false);
      setBillSupplierId("");
      setBillCategory("");
      setBillDueDate("");
      setBillNotes("");
      setBillLines([{ description: "", quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]);
      fetchData();
    } catch {}
    setSavingBill(false);
  };

  const handleStatusChange = async (billId: number, newStatus: string) => {
    await fetch(`/api/finance/bills/${billId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const handleRecordPayment = async () => {
    if (!payBillId || !payAmount) return;
    setSavingPay(true);
    try {
      await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: Number(activeWsId),
          type: "made",
          billId: payBillId,
          amount: parseFloat(payAmount),
          method: payMethod,
        }),
      });
      setShowPayment(false);
      setPayBillId(null);
      setPayAmount("");
      fetchData();
    } catch {}
    setSavingPay(false);
  };

  const handleDeleteBill = async (id: number) => {
    await fetch(`/api/finance/bills/${id}`, { method: "DELETE" });
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5" data-testid="page-finance-purchases">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Purchases & Bills</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage suppliers, bills, expenses, and payments made</p>
        </div>
        <Select value={activeWsId} onValueChange={setActiveWsId}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={String(ws.id)}>{ws.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bills" className="text-xs gap-1.5" data-testid="tab-bills">
            <ShoppingCart className="h-3.5 w-3.5" /> Bills & Expenses
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs gap-1.5" data-testid="tab-suppliers">
            <Truck className="h-3.5 w-3.5" /> Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Dialog open={showNewBill} onOpenChange={setShowNewBill}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-bill"><Plus className="h-3.5 w-3.5 mr-1.5" />New Bill</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-base">Create Bill / Expense</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Supplier</Label>
                      <Select value={billSupplierId} onValueChange={setBillSupplierId}>
                        <SelectTrigger className="h-8 text-xs mt-1" data-testid="select-bill-supplier">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Select value={billCategory} onValueChange={setBillCategory}>
                        <SelectTrigger className="h-8 text-xs mt-1" data-testid="select-bill-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Due Date</Label>
                    <Input type="date" className="h-8 text-xs mt-1 max-w-xs" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} data-testid="input-bill-due" />
                  </div>

                  <div>
                    <Label className="text-xs mb-2 block">Line Items</Label>
                    <div className="space-y-2">
                      {billLines.map((line, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            {i === 0 && <span className="text-[10px] text-muted-foreground">Description</span>}
                            <Input className="h-8 text-xs" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} data-testid={`input-bill-line-desc-${i}`} />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <span className="text-[10px] text-muted-foreground">Qty</span>}
                            <Input type="number" className="h-8 text-xs" value={line.quantity} onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)} />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <span className="text-[10px] text-muted-foreground">Price</span>}
                            <Input type="number" step="0.01" className="h-8 text-xs" value={line.unitPrice || ""} onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)} />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <span className="text-[10px] text-muted-foreground">Amount</span>}
                            <div className="h-8 flex items-center text-xs font-medium">{fmt(line.amount)}</div>
                          </div>
                          <div className="col-span-1">
                            {billLines.length > 1 && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeLine(i)}><X className="h-3 w-3" /></Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={addLine} data-testid="button-add-bill-line">
                      <Plus className="h-3 w-3 mr-1" />Add Line
                    </Button>
                  </div>

                  <div className="border-t pt-3 space-y-1 text-right">
                    <div className="flex justify-end gap-8 text-xs"><span className="text-muted-foreground">Subtotal</span><span className="font-medium w-24">{fmt(billSubtotal)}</span></div>
                    <div className="flex justify-end gap-8 text-xs"><span className="text-muted-foreground">Tax</span><span className="font-medium w-24">{fmt(billTax)}</span></div>
                    <div className="flex justify-end gap-8 text-sm font-bold"><span>Total</span><span className="w-24">{fmt(billTotal)}</span></div>
                  </div>

                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea className="text-xs mt-1" rows={2} value={billNotes} onChange={(e) => setBillNotes(e.target.value)} data-testid="input-bill-notes" />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowNewBill(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleCreateBill} disabled={savingBill} data-testid="button-save-bill">
                      {savingBill ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Save Draft
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Bill #</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Supplier</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Category</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Due</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Total</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Paid</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.length === 0 ? (
                      <tr><td colSpan={8} className="p-6 text-center text-muted-foreground" data-testid="text-no-bills">No bills yet. Record your first expense.</td></tr>
                    ) : (
                      bills.map((bill) => (
                        <tr key={bill.id} className="border-b last:border-0" data-testid={`row-bill-${bill.id}`}>
                          <td className="p-3 font-medium">{bill.billNumber}</td>
                          <td className="p-3">{bill.supplierName || "-"}</td>
                          <td className="p-3 text-muted-foreground">{bill.category || "-"}</td>
                          <td className="p-3">
                            <Badge variant={statusColors[bill.status] as any || "secondary"} className="text-[10px]">
                              {bill.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString("en-GB") : "-"}</td>
                          <td className="p-3 text-right font-medium">{fmt(bill.total)}</td>
                          <td className="p-3 text-right">{fmt(bill.amountPaid)}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {bill.status === "draft" && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStatusChange(bill.id, "received")} title="Mark Received" data-testid={`button-receive-${bill.id}`}>
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteBill(bill.id)} title="Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {(bill.status === "received" || bill.status === "overdue") && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setPayBillId(bill.id); setPayAmount(String(bill.total - bill.amountPaid)); setShowPayment(true); }} data-testid={`button-pay-bill-${bill.id}`}>
                                  <DollarSign className="h-3.5 w-3.5 mr-1" />Pay
                                </Button>
                              )}
                              {bill.status === "paid" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Dialog open={showNewSupplier} onOpenChange={setShowNewSupplier}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-supplier"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Supplier</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="text-base">Add Supplier</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Name</Label><Input className="h-8 text-xs mt-1" value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} data-testid="input-supplier-name" /></div>
                  <div><Label className="text-xs">Email</Label><Input className="h-8 text-xs mt-1" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} data-testid="input-supplier-email" /></div>
                  <div><Label className="text-xs">Phone</Label><Input className="h-8 text-xs mt-1" value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} data-testid="input-supplier-phone" /></div>
                  <div><Label className="text-xs">Address</Label><Textarea className="text-xs mt-1" rows={2} value={supForm.address} onChange={(e) => setSupForm({ ...supForm, address: e.target.value })} data-testid="input-supplier-address" /></div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowNewSupplier(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAddSupplier} disabled={savingSup} data-testid="button-save-supplier">
                      {savingSup ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Email</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Phone</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Total Billed</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Total Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-muted-foreground" data-testid="text-no-suppliers">No suppliers yet. Add your first supplier.</td></tr>
                    ) : (
                      suppliers.map((s) => (
                        <tr key={s.id} className="border-b last:border-0" data-testid={`row-supplier-${s.id}`}>
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3 text-muted-foreground">{s.email || "-"}</td>
                          <td className="p-3 text-muted-foreground">{s.phone || "-"}</td>
                          <td className="p-3 text-right font-medium">{fmt(s.totalBilled)}</td>
                          <td className="p-3 text-right">{fmt(s.totalPaid)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-base">Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} data-testid="input-bill-payment-amount" />
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPayment(false)}>Cancel</Button>
              <Button size="sm" onClick={handleRecordPayment} disabled={savingPay} data-testid="button-confirm-bill-payment">
                {savingPay ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
