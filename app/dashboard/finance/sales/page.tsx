"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Receipt,
  Users,
  Loader2,
  Send,
  CheckCircle2,
  Trash2,
  X,
  DollarSign,
} from "lucide-react";

interface Workspace { id: number; name: string; type: string; currency: string; }
interface Customer { id: number; name: string; email: string; phone: string; totalInvoiced: number; totalPaid: number; }
interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  customerName?: string;
  customerId: number;
}
interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

const statusColors: Record<string, string> = {
  draft: "secondary",
  sent: "default",
  paid: "default",
  overdue: "destructive",
};

export default function SalesPage() {
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWsId, setActiveWsId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("invoices");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [custForm, setCustForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [savingCust, setSavingCust] = useState(false);

  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [invCustomerId, setInvCustomerId] = useState("");
  const [invDueDate, setInvDueDate] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [invLines, setInvLines] = useState<InvoiceLine[]>([{ description: "", quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]);
  const [savingInv, setSavingInv] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState<number | null>(null);
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
    const tabParam = searchParams.get("tab");
    if (tabParam === "customers") setActiveTab("customers");
    const actionParam = searchParams.get("action");
    if (actionParam === "new-invoice") setShowNewInvoice(true);
  }, [searchParams]);

  const fetchData = useCallback(() => {
    if (!activeWsId) return;
    fetch(`/api/finance/customers?workspaceId=${activeWsId}`).then((r) => r.json()).then((d) => setCustomers(d.customers || [])).catch(() => {});
    fetch(`/api/finance/invoices?workspaceId=${activeWsId}`).then((r) => r.json()).then((d) => setInvoices(d.invoices || [])).catch(() => {});
  }, [activeWsId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeWs = workspaces.find((w) => String(w.id) === activeWsId);
  const sym = activeWs?.currency === "USD" ? "$" : activeWs?.currency === "EUR" ? "\u20ac" : "\u00a3";
  const fmt = (v: number) => `${sym}${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleAddCustomer = async () => {
    if (!custForm.name.trim()) return;
    setSavingCust(true);
    try {
      await fetch("/api/finance/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...custForm, workspaceId: Number(activeWsId) }),
      });
      setCustForm({ name: "", email: "", phone: "", address: "" });
      setShowNewCustomer(false);
      fetchData();
    } catch {}
    setSavingCust(false);
  };

  const updateLine = (i: number, field: keyof InvoiceLine, value: string | number) => {
    const updated = [...invLines];
    (updated[i] as any)[field] = value;
    updated[i].amount = (updated[i].quantity || 0) * (updated[i].unitPrice || 0);
    setInvLines(updated);
  };

  const addLine = () => setInvLines([...invLines, { description: "", quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]);
  const removeLine = (i: number) => { if (invLines.length > 1) setInvLines(invLines.filter((_, idx) => idx !== i)); };

  const invSubtotal = invLines.reduce((s, l) => s + l.amount, 0);
  const invTax = invLines.reduce((s, l) => s + l.amount * (l.taxRate / 100), 0);
  const invTotal = invSubtotal + invTax;

  const handleCreateInvoice = async () => {
    if (!invCustomerId || invLines.every((l) => !l.description.trim())) return;
    setSavingInv(true);
    try {
      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: Number(activeWsId),
          customerId: Number(invCustomerId),
          dueDate: invDueDate || undefined,
          notes: invNotes || undefined,
          status: "draft",
          lines: invLines.filter((l) => l.description.trim()),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Invoice creation failed:", err);
      }
      setShowNewInvoice(false);
      setInvCustomerId("");
      setInvDueDate("");
      setInvNotes("");
      setInvLines([{ description: "", quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]);
      fetchData();
    } catch (e) {
      console.error("Invoice creation error:", e);
    }
    setSavingInv(false);
  };

  const handleStatusChange = async (invoiceId: number, newStatus: string) => {
    await fetch(`/api/finance/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const handleRecordPayment = async () => {
    if (!payInvoiceId || !payAmount) return;
    setSavingPay(true);
    try {
      await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: Number(activeWsId),
          type: "received",
          invoiceId: payInvoiceId,
          amount: parseFloat(payAmount),
          method: payMethod,
        }),
      });
      setShowPayment(false);
      setPayInvoiceId(null);
      setPayAmount("");
      fetchData();
    } catch {}
    setSavingPay(false);
  };

  const handleDeleteInvoice = async (id: number) => {
    await fetch(`/api/finance/invoices/${id}`, { method: "DELETE" });
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5" data-testid="page-finance-sales">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Sales & Invoices</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage customers, invoices, and payments received</p>
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
          <TabsTrigger value="invoices" className="text-xs gap-1.5" data-testid="tab-invoices">
            <Receipt className="h-3.5 w-3.5" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs gap-1.5" data-testid="tab-customers">
            <Users className="h-3.5 w-3.5" /> Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Dialog open={showNewInvoice} onOpenChange={setShowNewInvoice}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-invoice"><Plus className="h-3.5 w-3.5 mr-1.5" />New Invoice</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-base">Create Invoice</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Customer</Label>
                      <Select value={invCustomerId} onValueChange={setInvCustomerId}>
                        <SelectTrigger className="h-8 text-xs mt-1" data-testid="select-invoice-customer">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" className="h-8 text-xs mt-1" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} data-testid="input-invoice-due" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs mb-2 block">Line Items</Label>
                    <div className="space-y-2">
                      {invLines.map((line, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            {i === 0 && <span className="text-[10px] text-muted-foreground">Description</span>}
                            <Input className="h-8 text-xs" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} data-testid={`input-line-desc-${i}`} />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <span className="text-[10px] text-muted-foreground">Qty</span>}
                            <Input type="number" className="h-8 text-xs" value={line.quantity} onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)} data-testid={`input-line-qty-${i}`} />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <span className="text-[10px] text-muted-foreground">Price</span>}
                            <Input type="number" step="0.01" className="h-8 text-xs" value={line.unitPrice || ""} onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)} data-testid={`input-line-price-${i}`} />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <span className="text-[10px] text-muted-foreground">Amount</span>}
                            <div className="h-8 flex items-center text-xs font-medium">{fmt(line.amount)}</div>
                          </div>
                          <div className="col-span-1">
                            {invLines.length > 1 && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeLine(i)}><X className="h-3 w-3" /></Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={addLine} data-testid="button-add-line">
                      <Plus className="h-3 w-3 mr-1" />Add Line
                    </Button>
                  </div>

                  <div className="border-t pt-3 space-y-1 text-right">
                    <div className="flex justify-end gap-8 text-xs"><span className="text-muted-foreground">Subtotal</span><span className="font-medium w-24">{fmt(invSubtotal)}</span></div>
                    <div className="flex justify-end gap-8 text-xs"><span className="text-muted-foreground">Tax</span><span className="font-medium w-24">{fmt(invTax)}</span></div>
                    <div className="flex justify-end gap-8 text-sm font-bold"><span>Total</span><span className="w-24">{fmt(invTotal)}</span></div>
                  </div>

                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea className="text-xs mt-1" rows={2} value={invNotes} onChange={(e) => setInvNotes(e.target.value)} data-testid="input-invoice-notes" />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowNewInvoice(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleCreateInvoice} disabled={savingInv} data-testid="button-save-invoice">
                      {savingInv ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
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
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Invoice #</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Customer</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Due</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Total</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Paid</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr><td colSpan={8} className="p-6 text-center text-muted-foreground" data-testid="text-no-invoices">No invoices yet. Create your first invoice.</td></tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-0" data-testid={`row-invoice-${inv.id}`}>
                          <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                          <td className="p-3">{inv.customerName || "-"}</td>
                          <td className="p-3">
                            <Badge variant={statusColors[inv.status] as any || "secondary"} className="text-[10px]" data-testid={`badge-status-${inv.id}`}>
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("en-GB") : "-"}</td>
                          <td className="p-3 text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "-"}</td>
                          <td className="p-3 text-right font-medium">{fmt(inv.total)}</td>
                          <td className="p-3 text-right">{fmt(inv.amountPaid)}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {inv.status === "draft" && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStatusChange(inv.id, "sent")} title="Mark as Sent" data-testid={`button-send-${inv.id}`}>
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteInvoice(inv.id)} title="Delete" data-testid={`button-delete-${inv.id}`}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {(inv.status === "sent" || inv.status === "overdue") && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setPayInvoiceId(inv.id); setPayAmount(String(inv.total - inv.amountPaid)); setShowPayment(true); }} data-testid={`button-pay-${inv.id}`}>
                                  <DollarSign className="h-3.5 w-3.5 mr-1" />Pay
                                </Button>
                              )}
                              {inv.status === "paid" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
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

        <TabsContent value="customers" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-customer"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Customer</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="text-base">Add Customer</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Name</Label><Input className="h-8 text-xs mt-1" value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} data-testid="input-customer-name" /></div>
                  <div><Label className="text-xs">Email</Label><Input className="h-8 text-xs mt-1" value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} data-testid="input-customer-email" /></div>
                  <div><Label className="text-xs">Phone</Label><Input className="h-8 text-xs mt-1" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} data-testid="input-customer-phone" /></div>
                  <div><Label className="text-xs">Address</Label><Textarea className="text-xs mt-1" rows={2} value={custForm.address} onChange={(e) => setCustForm({ ...custForm, address: e.target.value })} data-testid="input-customer-address" /></div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAddCustomer} disabled={savingCust} data-testid="button-save-customer">
                      {savingCust ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save
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
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Total Invoiced</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Total Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-muted-foreground" data-testid="text-no-customers">No customers yet. Add your first customer.</td></tr>
                    ) : (
                      customers.map((c) => (
                        <tr key={c.id} className="border-b last:border-0" data-testid={`row-customer-${c.id}`}>
                          <td className="p-3 font-medium">{c.name}</td>
                          <td className="p-3 text-muted-foreground">{c.email || "-"}</td>
                          <td className="p-3 text-muted-foreground">{c.phone || "-"}</td>
                          <td className="p-3 text-right font-medium">{fmt(c.totalInvoiced)}</td>
                          <td className="p-3 text-right">{fmt(c.totalPaid)}</td>
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
              <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} data-testid="input-payment-amount" />
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="h-8 text-xs mt-1" data-testid="select-payment-method">
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
              <Button size="sm" onClick={handleRecordPayment} disabled={savingPay} data-testid="button-confirm-payment">
                {savingPay ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
