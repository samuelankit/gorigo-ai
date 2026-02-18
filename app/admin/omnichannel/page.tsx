"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessagesSquare, Search, RefreshCw, MessageCircle, Mail, Phone, Smartphone, CheckCircle, Plus, Trash2, Activity, Shield, Users, FileText, DollarSign, Merge, Heart, X } from "lucide-react";

const fmtRel = (d: string | null) => {
  if (!d) return "-";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
};
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-";
const chIcon = (c: string) => ({ whatsapp: <Smartphone className="h-3 w-3" />, sms: <Phone className="h-3 w-3" />, email: <Mail className="h-3 w-3" /> }[c] || <MessageCircle className="h-3 w-3" />);
const chColor = (c: string) => ({ whatsapp: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20", sms: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20", email: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" }[c] || "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20");
const stVar = (s: string): any => s === "open" || s === "active" ? "default" : s === "resolved" || s === "closed" ? "secondary" : "outline";
const prVar = (p: string): any => p === "urgent" || p === "high" ? "destructive" : p === "medium" || p === "normal" ? "default" : "secondary";
const apVar = (s: string): any => s === "approved" ? "default" : s === "rejected" ? "destructive" : "outline";
const hlColor = (s: string) => s === "healthy" || s === "green" ? "bg-green-500/10 text-green-700 dark:text-green-400" : s === "degraded" || s === "yellow" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-red-500/10 text-red-700 dark:text-red-400";

export default function OmnichannelPage() {
  const [tab, setTab] = useState("inbox");
  const [stats, setStats] = useState<any>(null);
  const [convos, setConvos] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [ho, setHo] = useState<any>(null);
  const [tpls, setTpls] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chF, setChF] = useState("all");
  const [stF, setStF] = useState("all");
  const [prF, setPrF] = useState("all");
  const [cSearch, setCSearch] = useState("");
  const [tChF, setTChF] = useState("all");
  const [tApF, setTApF] = useState("all");
  const [selConvo, setSelConvo] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [mLoad, setMLoad] = useState(false);
  const [cDlg, setCDlg] = useState(false);
  const [cDetail, setCDetail] = useState<any>(null);
  const [mA, setMA] = useState("");
  const [mB, setMB] = useState("");
  const [tDlg, setTDlg] = useState<any>(null);
  const [tF, setTF] = useState({ name: "", channelType: "whatsapp", content: "", language: "en", category: "general" });
  const [rDlg, setRDlg] = useState<any>(null);
  const [rF, setRF] = useState({ channelType: "whatsapp", talkTimeEquivalent: "1", providerCost: "0.01", marginPercent: "30", effectiveFrom: new Date().toISOString().split("T")[0] });
  const [nC, setNC] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const fetchTab = useCallback(async (t: string) => {
    setLoading(true);
    try {
      if (t === "inbox") {
        const [sr, cr] = await Promise.all([fetch("/api/admin/omnichannel/stats?orgId=1"), fetch("/api/admin/omnichannel/conversations?orgId=1&limit=50")]);
        const sd = await sr.json(), cd = await cr.json();
        if (!sd.error) setStats(sd);
        setConvos(Array.isArray(cd) ? cd : cd.conversations ?? []);
      } else if (t === "contacts") {
        const d = await (await fetch("/api/admin/omnichannel/contacts?orgId=1")).json();
        setContacts(Array.isArray(d) ? d : d.contacts ?? []);
      } else if (t === "channels") {
        const [cr, hr] = await Promise.all([fetch("/api/admin/omnichannel/channels?orgId=1"), fetch("/api/admin/omnichannel/health-overview?orgId=1")]);
        const cd = await cr.json(), hd = await hr.json();
        setChannels(Array.isArray(cd) ? cd : cd.channels ?? []);
        if (!hd.error) setHo(hd);
      } else if (t === "templates") {
        const d = await (await fetch("/api/admin/omnichannel/templates?orgId=1")).json();
        setTpls(Array.isArray(d) ? d : d.templates ?? []);
      } else if (t === "billing") {
        const d = await (await fetch("/api/admin/omnichannel/billing-rules")).json();
        setRules(Array.isArray(d) ? d : d.rules ?? []);
      }
    } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTab(tab); }, [tab]);

  const viewConvo = async (c: any) => {
    setSelConvo(c); setMLoad(true);
    try { const d = await (await fetch(`/api/admin/omnichannel/conversations/${c.id}/messages`)).json(); setMsgs(Array.isArray(d) ? d : d.messages ?? []); } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); setMsgs([]); }
    finally { setMLoad(false); }
  };
  const resolveConvo = async (id: number) => { if (!window.confirm("Resolve this conversation?")) return; setSaving(true); try { await fetch(`/api/admin/omnichannel/conversations/${id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId: 1 }) }); setSelConvo(null); fetchTab("inbox"); } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); } };
  const mergeContacts = async () => { if (!mA || !mB) return; if (!window.confirm("Merge these contacts? This cannot be undone.")) return; setSaving(true); try { await fetch("/api/admin/omnichannel/contacts/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ primaryId: parseInt(mA), secondaryId: parseInt(mB), orgId: 1 }) }); setMA(""); setMB(""); fetchTab("contacts"); } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); } };
  const addContact = async () => { setSaving(true); try { await fetch("/api/admin/omnichannel/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...nC, orgId: 1 }) }); setCDlg(false); setNC({ name: "", phone: "", email: "" }); fetchTab("contacts"); } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); } };
  const toggleCh = async (ch: any) => { try { await fetch(`/api/admin/omnichannel/channels/${ch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !ch.enabled }) }); fetchTab("channels"); } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } };
  const runHC = async (id: number) => { try { await fetch(`/api/admin/omnichannel/channels/${id}/health-check`, { method: "POST" }); fetchTab("channels"); } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } };
  const saveTpl = async () => { setSaving(true); try { await fetch(tDlg?.id ? `/api/admin/omnichannel/templates/${tDlg.id}` : "/api/admin/omnichannel/templates", { method: tDlg?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...tF, orgId: 1 }) }); setTDlg(null); fetchTab("templates"); } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); } };
  const delTpl = async (id: number) => { if (!window.confirm("Delete this template?")) return; setSaving(true); try { await fetch(`/api/admin/omnichannel/templates/${id}`, { method: "DELETE" }); fetchTab("templates"); } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); } };
  const saveRule = async () => { setSaving(true); try { await fetch("/api/admin/omnichannel/billing-rules", { method: rDlg?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...rF, id: rDlg?.id }) }); setRDlg(null); fetchTab("billing"); } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); } };

  const fConvos = convos.filter(c => (chF === "all" || c.channelType === chF) && (stF === "all" || c.status === stF) && (prF === "all" || c.priority === prF));
  const fContacts = contacts.filter(c => { if (!cSearch) return true; const s = cSearch.toLowerCase(); return (c.name || "").toLowerCase().includes(s) || (c.phone || "").includes(s) || (c.email || "").toLowerCase().includes(s); });
  const fTpls = tpls.filter(t => (tChF === "all" || t.channelType === tChF) && (tApF === "all" || t.approvalStatus === tApF));

  const ChSel = ({ v, fn, tid }: { v: string; fn: (v: string) => void; tid: string }) => (
    <Select value={v} onValueChange={fn}><SelectTrigger className="w-[130px]" data-testid={tid}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">All Channels</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="chat">Chat</SelectItem></SelectContent></Select>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10"><MessagesSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" /></div>
          <div><h1 className="text-2xl font-bold" data-testid="text-omnichannel-title">Omnichannel</h1><p className="text-sm text-muted-foreground">Unified messaging management across all channels.</p></div>
        </div>
        <Button variant="outline" onClick={() => fetchTab(tab)} disabled={loading} data-testid="button-refresh"><RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
      </div>

      {errMsg && (
        <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-center justify-between gap-2" data-testid="error-banner">
          <span className="text-sm text-destructive">{errMsg}</span>
          <Button size="icon" variant="ghost" onClick={() => setErrMsg("")} data-testid="button-dismiss-error"><X className="h-4 w-4" /></Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="inbox" data-testid="tab-inbox">Unified Inbox</TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
          <TabsTrigger value="channels" data-testid="tab-channels">Channels</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">Billing Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-6 mt-4">
          {loading && !stats ? <div className="space-y-4"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-96" /></div> : <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[{ l: "Total Conversations", v: stats?.totalConversations ?? stats?.total ?? 0, i: MessagesSquare }, { l: "Active", v: stats?.activeConversations ?? stats?.active ?? 0, i: Activity }, { l: "Messages Today", v: stats?.messagesToday ?? stats?.todayMessages ?? 0, i: MessageCircle }, { l: "SLA Compliance", v: `${stats?.slaCompliance ?? stats?.sla ?? 0}%`, i: Shield }].map(({ l, v, i: I }) => (
                <Card key={l} data-testid={`card-stat-${l.toLowerCase().replace(/\s+/g, "-")}`}><CardContent className="p-4"><div className="flex items-center justify-between gap-2"><div><p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{l}</p><p className="text-2xl font-bold mt-1" data-testid={`text-stat-${l.toLowerCase().replace(/\s+/g, "-")}`}>{v}</p></div><I className="h-8 w-8 text-muted-foreground/30" /></div></CardContent></Card>
              ))}
            </div>
            <Card><CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap"><CardTitle className="text-base">Conversations</CardTitle><Badge variant="secondary" data-testid="text-convo-count">{fConvos.length}</Badge></div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <ChSel v={chF} fn={setChF} tid="select-channel-filter" />
                <Select value={stF} onValueChange={setStF}><SelectTrigger className="w-[120px]" data-testid="select-status-filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
                <Select value={prF} onValueChange={setPrF}><SelectTrigger className="w-[120px]" data-testid="select-priority-filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
              </div>
            </CardHeader><CardContent>
              {fConvos.length === 0 ? <div className="text-center py-12"><MessagesSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground" data-testid="text-no-convos">No conversations found.</p></div> :
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Contact</TableHead><TableHead>Channel</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Messages</TableHead><TableHead>Last Message</TableHead><TableHead>SLA</TableHead></TableRow></TableHeader>
                <TableBody>{fConvos.map(c => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => viewConvo(c)} data-testid={`row-convo-${c.id}`}>
                    <TableCell className="text-sm font-medium" data-testid={`text-convo-contact-${c.id}`}>{c.contactName || c.contact?.name || "-"}</TableCell>
                    <TableCell><Badge variant="outline" className={`gap-1 ${chColor(c.channelType)}`} data-testid={`badge-channel-${c.id}`}>{chIcon(c.channelType)}{c.channelType}</Badge></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" data-testid={`text-convo-subject-${c.id}`}>{c.subject || "-"}</TableCell>
                    <TableCell><Badge variant={stVar(c.status)} data-testid={`badge-status-${c.id}`}>{c.status}</Badge></TableCell>
                    <TableCell><Badge variant={prVar(c.priority)} data-testid={`badge-priority-${c.id}`}>{c.priority}</Badge></TableCell>
                    <TableCell className="text-sm" data-testid={`text-convo-msgs-${c.id}`}>{c.messageCount ?? c.messages ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-convo-last-${c.id}`}>{fmtRel(c.lastMessageAt || c.updatedAt)}</TableCell>
                    <TableCell data-testid={`text-convo-sla-${c.id}`}>{c.slaBreached ? <Badge variant="destructive">Breached</Badge> : <Badge variant="secondary">On Track</Badge>}</TableCell>
                  </TableRow>))}</TableBody></Table></div>}
            </CardContent></Card>
          </>}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6 mt-4">
          {loading && contacts.length === 0 ? <Skeleton className="h-96" /> : <>
            <Card><CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap"><CardTitle className="text-base">Contacts</CardTitle><Button variant="outline" onClick={() => setCDlg(true)} data-testid="button-add-contact"><Plus className="h-4 w-4 mr-2" />Add Contact</Button></div>
              <div className="relative mt-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search name, phone, email..." className="pl-9" value={cSearch} onChange={e => setCSearch(e.target.value)} data-testid="input-contact-search" /></div>
            </CardHeader><CardContent>
              {fContacts.length === 0 ? <div className="text-center py-12"><Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground" data-testid="text-no-contacts">No contacts found.</p></div> :
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Channels</TableHead><TableHead>Interactions</TableHead><TableHead>Last Channel</TableHead><TableHead>Last Interaction</TableHead></TableRow></TableHeader>
                <TableBody>{fContacts.map(c => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setCDetail(c)} data-testid={`row-contact-${c.id}`}>
                    <TableCell className="text-sm font-medium" data-testid={`text-contact-name-${c.id}`}>{c.name || "-"}</TableCell>
                    <TableCell className="text-sm font-mono" data-testid={`text-contact-phone-${c.id}`}>{c.phone || "-"}</TableCell>
                    <TableCell className="text-sm" data-testid={`text-contact-email-${c.id}`}>{c.email || "-"}</TableCell>
                    <TableCell><div className="flex gap-1 flex-wrap">{(c.channels || []).map((ch: string) => <Badge key={ch} variant="outline" className={`gap-1 ${chColor(ch)}`}>{chIcon(ch)}{ch}</Badge>)}</div></TableCell>
                    <TableCell className="text-sm" data-testid={`text-contact-interactions-${c.id}`}>{c.interactionCount ?? c.interactions ?? 0}</TableCell>
                    <TableCell className="text-sm" data-testid={`text-contact-last-ch-${c.id}`}>{c.lastChannel || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-contact-last-int-${c.id}`}>{fmtRel(c.lastInteraction || c.lastContactAt)}</TableCell>
                  </TableRow>))}</TableBody></Table></div>}
            </CardContent></Card>
            <Card data-testid="card-merge-contacts"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Merge className="h-4 w-4" />Merge Contacts</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-3 flex-wrap">
                <Input placeholder="Primary Contact ID" value={mA} onChange={e => setMA(e.target.value)} className="w-[180px]" data-testid="input-merge-primary" />
                <Input placeholder="Secondary Contact ID" value={mB} onChange={e => setMB(e.target.value)} className="w-[180px]" data-testid="input-merge-secondary" />
                <Button onClick={mergeContacts} disabled={!mA || !mB || saving} data-testid="button-merge-contacts"><Merge className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Merge"}</Button>
              </div></CardContent></Card>
          </>}
        </TabsContent>

        <TabsContent value="channels" className="space-y-6 mt-4">
          {loading && channels.length === 0 ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}</div> : <>
            {ho && <Card data-testid="card-health-overview"><CardHeader className="pb-2"><CardTitle className="text-base">Health Overview</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div><p className="text-muted-foreground text-xs uppercase tracking-wider">Total Channels</p><p className="text-xl font-bold mt-1" data-testid="text-health-total">{ho.totalChannels ?? channels.length}</p></div>
                <div><p className="text-muted-foreground text-xs uppercase tracking-wider">Healthy</p><p className="text-xl font-bold mt-1 text-green-600 dark:text-green-400" data-testid="text-health-healthy">{ho.healthy ?? 0}</p></div>
                <div><p className="text-muted-foreground text-xs uppercase tracking-wider">Degraded</p><p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400" data-testid="text-health-degraded">{ho.degraded ?? 0}</p></div>
                <div><p className="text-muted-foreground text-xs uppercase tracking-wider">Down</p><p className="text-xl font-bold mt-1 text-red-600 dark:text-red-400" data-testid="text-health-down">{ho.down ?? ho.unhealthy ?? 0}</p></div>
              </div></CardContent></Card>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{channels.map(ch => (
              <Card key={ch.id} data-testid={`card-channel-${ch.id}`}><CardHeader className="pb-2"><div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">{chIcon(ch.channelType || ch.type)}<span className="capitalize">{ch.channelType || ch.type}</span></CardTitle>
                <div className="flex items-center gap-2"><Badge className={hlColor(ch.healthStatus || ch.health || "unknown")} data-testid={`badge-health-${ch.id}`}>{ch.healthStatus || ch.health || "unknown"}</Badge><Badge variant={ch.enabled ? "default" : "secondary"} data-testid={`badge-enabled-${ch.id}`}>{ch.enabled ? "Enabled" : "Disabled"}</Badge></div>
              </div></CardHeader><CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div><p className="text-muted-foreground text-xs">Rate Limit</p><p className="font-medium" data-testid={`text-rate-limit-${ch.id}`}>{ch.rateLimit || ch.rateLimitPerMinute || "-"}/min</p></div>
                  <div><p className="text-muted-foreground text-xs">SLA Response</p><p className="font-medium" data-testid={`text-sla-${ch.id}`}>{ch.slaResponseTime || ch.slaTarget || "-"}s</p></div>
                  <div className="col-span-2"><p className="text-muted-foreground text-xs">Last Health Check</p><p className="font-medium" data-testid={`text-last-check-${ch.id}`}>{fmtRel(ch.lastHealthCheck || ch.lastCheckedAt)}</p></div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => toggleCh(ch)} data-testid={`button-toggle-${ch.id}`}>{ch.enabled ? "Disable" : "Enable"}</Button>
                  <Button variant="outline" onClick={() => runHC(ch.id)} data-testid={`button-health-check-${ch.id}`}><Heart className="h-4 w-4 mr-2" />Health Check</Button>
                </div></CardContent></Card>))}</div>
          </>}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 mt-4">
          {loading && tpls.length === 0 ? <Skeleton className="h-96" /> :
          <Card><CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap"><CardTitle className="text-base">Message Templates</CardTitle><Button variant="outline" onClick={() => { setTF({ name: "", channelType: "whatsapp", content: "", language: "en", category: "general" }); setTDlg({}); }} data-testid="button-add-template"><Plus className="h-4 w-4 mr-2" />Add Template</Button></div>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <ChSel v={tChF} fn={setTChF} tid="select-tpl-channel" />
              <Select value={tApF} onValueChange={setTApF}><SelectTrigger className="w-[130px]" data-testid="select-tpl-approval"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
            </div>
          </CardHeader><CardContent>
            {fTpls.length === 0 ? <div className="text-center py-12"><FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground" data-testid="text-no-templates">No templates found.</p></div> :
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Channel</TableHead><TableHead>Category</TableHead><TableHead>Language</TableHead><TableHead>Approval</TableHead><TableHead>Usage</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{fTpls.map(t => (
                <TableRow key={t.id} data-testid={`row-template-${t.id}`}>
                  <TableCell className="text-sm font-medium cursor-pointer" onClick={() => { setTF({ name: t.name, channelType: t.channelType, content: t.content || "", language: t.language || "en", category: t.category || "general" }); setTDlg(t); }} data-testid={`text-tpl-name-${t.id}`}>{t.name}</TableCell>
                  <TableCell><Badge variant="outline" className={`gap-1 ${chColor(t.channelType)}`}>{chIcon(t.channelType)}{t.channelType}</Badge></TableCell>
                  <TableCell className="text-sm" data-testid={`text-tpl-category-${t.id}`}>{t.category || "-"}</TableCell>
                  <TableCell className="text-sm" data-testid={`text-tpl-language-${t.id}`}>{t.language || "-"}</TableCell>
                  <TableCell><Badge variant={apVar(t.approvalStatus || "pending")} data-testid={`badge-tpl-approval-${t.id}`}>{t.approvalStatus || "pending"}</Badge></TableCell>
                  <TableCell className="text-sm" data-testid={`text-tpl-usage-${t.id}`}>{t.usageCount ?? 0}</TableCell>
                  <TableCell><Badge variant={t.active !== false ? "default" : "secondary"} data-testid={`badge-tpl-active-${t.id}`}>{t.active !== false ? "Yes" : "No"}</Badge></TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => delTpl(t.id)} disabled={saving} data-testid={`button-delete-tpl-${t.id}`}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>))}</TableBody></Table></div>}
          </CardContent></Card>}
        </TabsContent>

        <TabsContent value="billing" className="space-y-6 mt-4">
          {loading && rules.length === 0 ? <Skeleton className="h-96" /> :
          <Card><CardHeader className="pb-3"><div className="flex items-center justify-between gap-4 flex-wrap"><CardTitle className="text-base">Billing Rules</CardTitle>
            <Button variant="outline" onClick={() => { setRF({ channelType: "whatsapp", talkTimeEquivalent: "1", providerCost: "0.01", marginPercent: "30", effectiveFrom: new Date().toISOString().split("T")[0] }); setRDlg({}); }} data-testid="button-add-rule"><Plus className="h-4 w-4 mr-2" />Add Rule</Button></div></CardHeader>
          <CardContent>
            {rules.length === 0 ? <div className="text-center py-12"><DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground" data-testid="text-no-rules">No billing rules found.</p></div> :
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>Talk-Time (min)</TableHead><TableHead>Provider Cost</TableHead><TableHead>Margin %</TableHead><TableHead>Effective Rate</TableHead><TableHead>Effective From</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{rules.map((r, i) => { const cost = parseFloat(r.providerCost || "0"), margin = parseFloat(r.marginPercent || "0"); return (
                <TableRow key={r.id || i} data-testid={`row-rule-${r.id || i}`}>
                  <TableCell className="text-sm font-medium capitalize" data-testid={`text-rule-channel-${r.id || i}`}>{r.channelType}</TableCell>
                  <TableCell className="text-sm" data-testid={`text-rule-equiv-${r.id || i}`}>{r.talkTimeEquivalent ?? r.talkTimeMinutes ?? "-"}</TableCell>
                  <TableCell className="text-sm" data-testid={`text-rule-cost-${r.id || i}`}>${cost.toFixed(4)}</TableCell>
                  <TableCell className="text-sm" data-testid={`text-rule-margin-${r.id || i}`}>{margin}%</TableCell>
                  <TableCell className="text-sm font-medium" data-testid={`text-rule-effective-${r.id || i}`}>${(cost * (1 + margin / 100)).toFixed(4)}</TableCell>
                  <TableCell className="text-sm" data-testid={`text-rule-from-${r.id || i}`}>{fmtDate(r.effectiveFrom)}</TableCell>
                  <TableCell><Badge variant={r.active !== false ? "default" : "secondary"} data-testid={`badge-rule-active-${r.id || i}`}>{r.active !== false ? "Yes" : "No"}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => { setRF({ channelType: r.channelType, talkTimeEquivalent: String(r.talkTimeEquivalent ?? r.talkTimeMinutes ?? "1"), providerCost: String(r.providerCost ?? "0.01"), marginPercent: String(r.marginPercent ?? "30"), effectiveFrom: r.effectiveFrom?.split("T")[0] || "" }); setRDlg(r); }} data-testid={`button-edit-rule-${r.id || i}`}>Edit</Button></TableCell>
                </TableRow>); })}</TableBody></Table></div>}
          </CardContent></Card>}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selConvo} onOpenChange={o => { if (!o) setSelConvo(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-convo-detail">
          <DialogHeader><DialogTitle className="flex items-center gap-2">{chIcon(selConvo?.channelType)}Conversation #{selConvo?.id}</DialogTitle><DialogDescription>{selConvo?.subject || "Conversation messages"}</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={stVar(selConvo?.status || "")}>{selConvo?.status}</Badge>
              <Badge variant={prVar(selConvo?.priority || "")}>{selConvo?.priority}</Badge>
              {selConvo?.status !== "resolved" && <Button variant="outline" onClick={() => resolveConvo(selConvo?.id)} disabled={saving} data-testid="button-resolve-convo"><CheckCircle className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Resolve"}</Button>}
            </div>
            {mLoad ? <Skeleton className="h-48" /> : msgs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-messages">No messages.</p> :
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">{msgs.map((m, i) => (
              <div key={m.id || i} className={`p-3 rounded-lg text-sm ${m.direction === "outbound" || m.sender === "agent" ? "bg-muted ml-8" : "bg-muted/50 mr-8"}`} data-testid={`msg-${m.id || i}`}>
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap"><span className="text-xs font-medium text-muted-foreground">{m.senderName || m.sender || (m.direction === "outbound" ? "Agent" : "Contact")}</span><span className="text-xs text-muted-foreground">{fmtRel(m.createdAt || m.sentAt)}</span></div>
                <p>{m.content || m.body || m.text || ""}</p></div>))}</div>}
          </div></DialogContent></Dialog>

      <Dialog open={!!cDetail} onOpenChange={o => { if (!o) setCDetail(null); }}>
        <DialogContent data-testid="dialog-contact-detail"><DialogHeader><DialogTitle>Contact Details</DialogTitle><DialogDescription>{cDetail?.name || "Contact"}</DialogDescription></DialogHeader>
          {cDetail && <div className="grid grid-cols-2 gap-4 text-sm mt-2">
            <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Name</p><p className="font-medium" data-testid="text-detail-name">{cDetail.name || "-"}</p></div>
            <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Phone</p><p className="font-medium font-mono" data-testid="text-detail-phone">{cDetail.phone || "-"}</p></div>
            <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Email</p><p className="font-medium" data-testid="text-detail-email">{cDetail.email || "-"}</p></div>
            <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Interactions</p><p className="font-medium" data-testid="text-detail-interactions">{cDetail.interactionCount ?? cDetail.interactions ?? 0}</p></div>
            <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Last Channel</p><p className="font-medium" data-testid="text-detail-last-channel">{cDetail.lastChannel || "-"}</p></div>
            <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Channels</p><div className="flex gap-1 flex-wrap">{(cDetail.channels || []).map((ch: string) => <Badge key={ch} variant="outline" className={chColor(ch)}>{ch}</Badge>)}</div></div>
          </div>}</DialogContent></Dialog>

      <Dialog open={cDlg} onOpenChange={setCDlg}>
        <DialogContent data-testid="dialog-add-contact"><DialogHeader><DialogTitle>Add Contact</DialogTitle><DialogDescription>Create a new omnichannel contact.</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Name" value={nC.name} onChange={e => setNC({ ...nC, name: e.target.value })} data-testid="input-new-contact-name" />
            <Input placeholder="Phone" value={nC.phone} onChange={e => setNC({ ...nC, phone: e.target.value })} data-testid="input-new-contact-phone" />
            <Input placeholder="Email" value={nC.email} onChange={e => setNC({ ...nC, email: e.target.value })} data-testid="input-new-contact-email" />
            <Button onClick={addContact} className="w-full" disabled={saving} data-testid="button-save-contact">{saving ? "Saving..." : "Save Contact"}</Button>
          </div></DialogContent></Dialog>

      <Dialog open={!!tDlg} onOpenChange={o => { if (!o) setTDlg(null); }}>
        <DialogContent data-testid="dialog-template"><DialogHeader><DialogTitle>{tDlg?.id ? "Edit Template" : "Add Template"}</DialogTitle><DialogDescription>Configure message template.</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Template Name" value={tF.name} onChange={e => setTF({ ...tF, name: e.target.value })} data-testid="input-tpl-name" />
            <Select value={tF.channelType} onValueChange={v => setTF({ ...tF, channelType: v })}><SelectTrigger data-testid="select-tpl-channel-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="chat">Chat</SelectItem></SelectContent></Select>
            <Textarea placeholder="Template content. Use {{variable}} for placeholders." value={tF.content} onChange={e => setTF({ ...tF, content: e.target.value })} rows={4} data-testid="input-tpl-content" />
            {tF.content && /\{\{.*?\}\}/.test(tF.content) && <div className="text-xs text-muted-foreground" data-testid="text-tpl-vars">Variables: {(tF.content.match(/\{\{.*?\}\}/g) || []).join(", ")}</div>}
            <div className="flex gap-3"><Input placeholder="Language (e.g. en)" value={tF.language} onChange={e => setTF({ ...tF, language: e.target.value })} data-testid="input-tpl-language" /><Input placeholder="Category" value={tF.category} onChange={e => setTF({ ...tF, category: e.target.value })} data-testid="input-tpl-category" /></div>
            <Button onClick={saveTpl} className="w-full" disabled={saving} data-testid="button-save-template">{saving ? "Saving..." : "Save Template"}</Button>
          </div></DialogContent></Dialog>

      <Dialog open={!!rDlg} onOpenChange={o => { if (!o) setRDlg(null); }}>
        <DialogContent data-testid="dialog-rule"><DialogHeader><DialogTitle>{rDlg?.id ? "Edit Rule" : "Add Billing Rule"}</DialogTitle><DialogDescription>Configure channel billing rule.</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-2">
            <Select value={rF.channelType} onValueChange={v => setRF({ ...rF, channelType: v })}><SelectTrigger data-testid="select-rule-channel"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="chat">Chat</SelectItem></SelectContent></Select>
            <Input placeholder="Talk-Time Equivalent (min)" value={rF.talkTimeEquivalent} onChange={e => setRF({ ...rF, talkTimeEquivalent: e.target.value })} data-testid="input-rule-equiv" />
            <Input placeholder="Provider Cost ($)" value={rF.providerCost} onChange={e => setRF({ ...rF, providerCost: e.target.value })} data-testid="input-rule-cost" />
            <Input placeholder="Margin %" value={rF.marginPercent} onChange={e => setRF({ ...rF, marginPercent: e.target.value })} data-testid="input-rule-margin" />
            <Input type="date" value={rF.effectiveFrom} onChange={e => setRF({ ...rF, effectiveFrom: e.target.value })} data-testid="input-rule-from" />
            {rF.providerCost && rF.marginPercent && <div className="text-sm text-muted-foreground" data-testid="text-rule-calc">Effective Rate: ${(parseFloat(rF.providerCost || "0") * (1 + parseFloat(rF.marginPercent || "0") / 100)).toFixed(4)}</div>}
            <Button onClick={saveRule} className="w-full" disabled={saving} data-testid="button-save-rule">{saving ? "Saving..." : "Save Rule"}</Button>
          </div></DialogContent></Dialog>
    </div>
  );
}