"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Headset, RefreshCw, Plus, Pencil, Trash2, Phone, Users, BookOpen, ShieldAlert,
  MessageSquareText, Activity, Clock, Star, CheckCircle, AlertTriangle,
} from "lucide-react";

const BASE = "/api/admin/agent-assist";
const ORG = "orgId=1";
const defaultFrom = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; };
const defaultTo = () => new Date().toISOString().split("T")[0];

function fmtDur(s: number | null) { if (!s || s <= 0) return "0s"; const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; }
function statusColor(s: string) {
  if (s === "online") return "default";
  if (s === "busy") return "destructive";
  return "secondary";
}
function statusDot(s: string) {
  if (s === "online") return "bg-green-500";
  if (s === "away") return "bg-yellow-500";
  if (s === "busy") return "bg-red-500";
  return "bg-gray-400";
}

export default function AgentAssistPage() {
  const [tab, setTab] = useState("live");
  const [perf, setPerf] = useState<any>(null);
  const [live, setLive] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [canned, setCanned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [catFilter, setCatFilter] = useState("all");
  const [dlg, setDlg] = useState<{ type: string; data?: any } | null>(null);
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const fetchPerf = useCallback(async () => {
    try { const r = await fetch(`${BASE}/performance?${ORG}`); const d = await r.json(); if (!d.error) setPerf(d); } catch {}
  }, []);

  const fetchTab = useCallback(async (t: string) => {
    setLoading(true);
    try {
      if (t === "live") {
        const r = await fetch(`${BASE}/supervisor/live?${ORG}`); const d = await r.json();
        setLive(Array.isArray(d) ? d : d.sessions ?? d.calls ?? []);
      } else if (t === "agents") {
        const r = await fetch(`${BASE}/agents?${ORG}`); const d = await r.json();
        setAgents(Array.isArray(d) ? d : d.agents ?? []);
      } else if (t === "sessions") {
        const r = await fetch(`${BASE}/sessions?${ORG}&from=${from}&to=${to}`); const d = await r.json();
        setSessions(Array.isArray(d) ? d : d.sessions ?? []);
      } else if (t === "rules") {
        const r = await fetch(`${BASE}/coaching-rules?${ORG}`); const d = await r.json();
        setRules(Array.isArray(d) ? d : d.rules ?? []);
      } else if (t === "canned") {
        const r = await fetch(`${BASE}/canned-responses?${ORG}`); const d = await r.json();
        setCanned(Array.isArray(d) ? d : d.responses ?? []);
      }
    } catch (e) { console.error("Fetch failed:", e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetchPerf(); }, [fetchPerf]);
  useEffect(() => { fetchTab(tab); }, [tab, from, to]);

  const viewSuggestions = async (session: any) => {
    setSelectedSession(session);
    try {
      const r = await fetch(`${BASE}/sessions/${session.id}/suggestions`);
      const d = await r.json();
      setSuggestions(Array.isArray(d) ? d : d.suggestions ?? []);
    } catch { setSuggestions([]); }
  };

  const toggleAgentStatus = async (id: number, status: string) => {
    const next = status === "online" ? "away" : "online";
    try {
      await fetch(`${BASE}/agents/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      fetchTab("agents");
    } catch {}
  };

  const saveAgent = async (form: any) => {
    try {
      await fetch(`${BASE}/agents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, orgId: 1 }) });
      setDlg(null); fetchTab("agents");
    } catch {}
  };

  const saveRule = async (form: any) => {
    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `${BASE}/coaching-rules/${form.id}` : `${BASE}/coaching-rules`;
    try {
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, orgId: 1 }) });
      setDlg(null); fetchTab("rules");
    } catch {}
  };

  const deleteRule = async (id: number) => {
    if (!confirm("Delete this coaching rule?")) return;
    try { await fetch(`${BASE}/coaching-rules/${id}`, { method: "DELETE" }); fetchTab("rules"); } catch {}
  };

  const toggleRuleActive = async (rule: any) => {
    try {
      await fetch(`${BASE}/coaching-rules/${rule.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...rule, isActive: !rule.isActive, orgId: 1 }) });
      fetchTab("rules");
    } catch {}
  };

  const saveCanned = async (form: any) => {
    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `${BASE}/canned-responses/${form.id}` : `${BASE}/canned-responses`;
    try {
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, orgId: 1 }) });
      setDlg(null); fetchTab("canned");
    } catch {}
  };

  const deleteCanned = async (id: number) => {
    if (!confirm("Delete this canned response?")) return;
    try { await fetch(`${BASE}/canned-responses/${id}`, { method: "DELETE" }); fetchTab("canned"); } catch {}
  };

  const filteredCanned = catFilter === "all" ? canned : canned.filter((c) => c.category === catFilter);
  const categories = [...new Set(canned.map((c) => c.category).filter(Boolean))];

  if (loading && !perf) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-96" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
            <Headset className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-agent-assist-title">Agent Assist</h1>
            <p className="text-sm text-muted-foreground">Manage human agents, coaching rules, and assist sessions.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => { fetchPerf(); fetchTab(tab); }} disabled={loading} data-testid="button-refresh">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {perf && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Sessions", value: perf.totalSessions ?? 0, icon: Activity },
            { label: "Avg Rating", value: parseFloat(perf.avgRating ?? perf.averageRating ?? 0).toFixed(1), icon: Star },
            { label: "Suggestions Used", value: perf.suggestionsUsed ?? perf.totalSuggestionsUsed ?? 0, icon: CheckCircle },
            { label: "Coaching Alerts", value: perf.coachingAlerts ?? perf.totalCoachingAlerts ?? 0, icon: AlertTriangle },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} data-testid={`card-perf-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
                    <p className="text-2xl font-bold mt-1" data-testid={`text-perf-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="live" data-testid="tab-live"><Phone className="h-3.5 w-3.5 mr-1.5" />Live</TabsTrigger>
          <TabsTrigger value="agents" data-testid="tab-agents"><Users className="h-3.5 w-3.5 mr-1.5" />Agents</TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions"><Clock className="h-3.5 w-3.5 mr-1.5" />Sessions</TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules"><ShieldAlert className="h-3.5 w-3.5 mr-1.5" />Coaching Rules</TabsTrigger>
          <TabsTrigger value="canned" data-testid="tab-canned"><MessageSquareText className="h-3.5 w-3.5 mr-1.5" />Canned Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Active Calls</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-48" /> : live.length === 0 ? (
                <div className="text-center py-12">
                  <Phone className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground" data-testid="text-no-live">No active calls right now.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Agent</TableHead><TableHead>Caller</TableHead><TableHead>Duration</TableHead>
                      <TableHead>Transfer Type</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {live.map((c: any, i: number) => (
                        <TableRow key={c.id ?? i} data-testid={`row-live-${c.id ?? i}`}>
                          <TableCell className="text-sm font-medium" data-testid={`text-live-agent-${c.id ?? i}`}>{c.agentName ?? c.agent ?? "-"}</TableCell>
                          <TableCell className="text-sm font-mono" data-testid={`text-live-caller-${c.id ?? i}`}>{c.callerPhone ?? c.callerNumber ?? "-"}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-live-duration-${c.id ?? i}`}>{fmtDur(c.duration ?? c.callDuration)}</TableCell>
                          <TableCell data-testid={`text-live-transfer-${c.id ?? i}`}><Badge variant="secondary">{c.transferType ?? c.type ?? "-"}</Badge></TableCell>
                          <TableCell data-testid={`text-live-status-${c.id ?? i}`}><Badge variant="default">{c.status ?? "active"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="mt-4 space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => setDlg({ type: "agent" })} data-testid="button-add-agent"><Plus className="h-4 w-4 mr-2" />Add Agent</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? <Skeleton className="h-64 m-4" /> : agents.length === 0 ? (
                <div className="text-center py-12"><Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground" data-testid="text-no-agents">No agents found.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Skills</TableHead>
                      <TableHead>Calls / Max</TableHead><TableHead>Total Handled</TableHead><TableHead>Avg Quality</TableHead><TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {agents.map((a: any) => (
                        <TableRow key={a.id} data-testid={`row-agent-${a.id}`}>
                          <TableCell className="text-sm font-medium" data-testid={`text-agent-name-${a.id}`}>{a.displayName ?? a.name}</TableCell>
                          <TableCell data-testid={`text-agent-status-${a.id}`}>
                            <Badge variant={statusColor(a.status)}>
                              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${statusDot(a.status)}`} />
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-agent-skills-${a.id}`}>
                            <div className="flex items-center gap-1 flex-wrap">
                              {(a.skills ?? []).map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}
                              {(!a.skills || a.skills.length === 0) && <span className="text-sm text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-agent-calls-${a.id}`}>{a.currentCalls ?? 0} / {a.maxConcurrentCalls ?? "-"}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-agent-handled-${a.id}`}>{a.totalHandled ?? a.totalCalls ?? 0}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-agent-quality-${a.id}`}>{parseFloat(a.avgQuality ?? a.averageQuality ?? 0).toFixed(1)}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => toggleAgentStatus(a.id, a.status)} data-testid={`button-toggle-status-${a.id}`}>
                              {a.status === "online" ? "Set Away" : "Set Online"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" data-testid="input-sessions-from" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" data-testid="input-sessions-to" />
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? <Skeleton className="h-64 m-4" /> : sessions.length === 0 ? (
                <div className="text-center py-12"><Clock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground" data-testid="text-no-sessions">No sessions found.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Call ID</TableHead><TableHead>Agent</TableHead><TableHead>Transfer</TableHead>
                      <TableHead>Duration</TableHead><TableHead>Suggestions</TableHead><TableHead>Coaching</TableHead>
                      <TableHead>Rating</TableHead><TableHead>Notes</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {sessions.map((s: any) => (
                        <TableRow key={s.id} className="cursor-pointer" onClick={() => viewSuggestions(s)} data-testid={`row-session-${s.id}`}>
                          <TableCell className="text-sm font-mono" data-testid={`text-session-call-${s.id}`}>#{s.callId ?? s.id}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-session-agent-${s.id}`}>{s.agentName ?? s.agent ?? "-"}</TableCell>
                          <TableCell data-testid={`text-session-transfer-${s.id}`}><Badge variant="secondary">{s.transferType ?? "-"}</Badge></TableCell>
                          <TableCell className="text-sm" data-testid={`text-session-duration-${s.id}`}>{fmtDur(s.duration)}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-session-suggestions-${s.id}`}>{s.suggestionsShown ?? 0} / {s.suggestionsUsed ?? 0}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-session-coaching-${s.id}`}>{s.coachingAlerts ?? 0}</TableCell>
                          <TableCell data-testid={`text-session-rating-${s.id}`}>{s.rating ? <Badge variant="default">{s.rating}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                          <TableCell className="text-sm truncate max-w-[120px]" data-testid={`text-session-notes-${s.id}`}>{s.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => setDlg({ type: "rule" })} data-testid="button-add-rule"><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? <Skeleton className="h-64 m-4" /> : rules.length === 0 ? (
                <div className="text-center py-12"><ShieldAlert className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground" data-testid="text-no-rules">No coaching rules found.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Name</TableHead><TableHead>Trigger Type</TableHead><TableHead>Priority</TableHead>
                      <TableHead>Active</TableHead><TableHead>Message</TableHead><TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {rules.map((r: any) => (
                        <TableRow key={r.id} data-testid={`row-rule-${r.id}`}>
                          <TableCell className="text-sm font-medium" data-testid={`text-rule-name-${r.id}`}>{r.name}</TableCell>
                          <TableCell data-testid={`text-rule-trigger-${r.id}`}><Badge variant="outline">{r.triggerType}</Badge></TableCell>
                          <TableCell className="text-sm" data-testid={`text-rule-priority-${r.id}`}>{r.priority ?? "-"}</TableCell>
                          <TableCell data-testid={`text-rule-active-${r.id}`}>
                            <Button variant={r.isActive ? "default" : "outline"} size="sm" onClick={() => toggleRuleActive(r)} data-testid={`button-toggle-rule-${r.id}`}>
                              {r.isActive ? "Active" : "Inactive"}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm truncate max-w-[200px]" data-testid={`text-rule-message-${r.id}`}>{r.coachingMessage ?? "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setDlg({ type: "rule", data: r })} data-testid={`button-edit-rule-${r.id}`}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteRule(r.id)} data-testid={`button-delete-rule-${r.id}`}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="canned" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-category-filter"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setDlg({ type: "canned" })} data-testid="button-add-canned"><Plus className="h-4 w-4 mr-2" />Add Response</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? <Skeleton className="h-64 m-4" /> : filteredCanned.length === 0 ? (
                <div className="text-center py-12"><MessageSquareText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground" data-testid="text-no-canned">No canned responses found.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Category</TableHead><TableHead>Title</TableHead><TableHead>Shortcut</TableHead>
                      <TableHead>Usage</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filteredCanned.map((c: any) => (
                        <TableRow key={c.id} data-testid={`row-canned-${c.id}`}>
                          <TableCell data-testid={`text-canned-category-${c.id}`}><Badge variant="outline">{c.category ?? "-"}</Badge></TableCell>
                          <TableCell className="text-sm font-medium" data-testid={`text-canned-title-${c.id}`}>{c.title}</TableCell>
                          <TableCell className="text-sm font-mono" data-testid={`text-canned-shortcut-${c.id}`}>{c.shortcut ?? "-"}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-canned-usage-${c.id}`}>{c.usageCount ?? 0}</TableCell>
                          <TableCell data-testid={`text-canned-active-${c.id}`}><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setDlg({ type: "canned", data: c })} data-testid={`button-edit-canned-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteCanned(c.id)} data-testid={`button-delete-canned-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedSession} onOpenChange={(o) => { if (!o) { setSelectedSession(null); setSuggestions(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-suggestions">
          <DialogHeader>
            <DialogTitle>Session Suggestions</DialogTitle>
            <DialogDescription>Suggestions for session #{selectedSession?.callId ?? selectedSession?.id}</DialogDescription>
          </DialogHeader>
          {suggestions === null ? <Skeleton className="h-32" /> : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-suggestions">No suggestions for this session.</p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s: any, i: number) => (
                <Card key={s.id ?? i} data-testid={`card-suggestion-${i}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant="outline">{s.type ?? "suggestion"}</Badge>
                      {s.used && <Badge variant="default">Used</Badge>}
                    </div>
                    <p className="text-sm mt-2">{s.content ?? s.message ?? s.text ?? "-"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AgentDialog open={dlg?.type === "agent"} onClose={() => setDlg(null)} onSave={saveAgent} />
      <RuleDialog open={dlg?.type === "rule"} data={dlg?.data} onClose={() => setDlg(null)} onSave={saveRule} />
      <CannedDialog open={dlg?.type === "canned"} data={dlg?.data} onClose={() => setDlg(null)} onSave={saveCanned} />
    </div>
  );
}

function AgentDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (f: any) => void }) {
  const [form, setForm] = useState({ displayName: "", skills: "", maxConcurrentCalls: "3" });
  useEffect(() => { if (open) setForm({ displayName: "", skills: "", maxConcurrentCalls: "3" }); }, [open]);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="dialog-add-agent">
        <DialogHeader><DialogTitle>Add Agent</DialogTitle><DialogDescription>Create a new human agent.</DialogDescription></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><label className="text-sm font-medium">Display Name</label><Input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} data-testid="input-agent-name" /></div>
          <div><label className="text-sm font-medium">Skills (comma-separated)</label><Input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="billing, tech, sales" data-testid="input-agent-skills" /></div>
          <div><label className="text-sm font-medium">Max Concurrent Calls</label><Input type="number" value={form.maxConcurrentCalls} onChange={(e) => set("maxConcurrentCalls", e.target.value)} data-testid="input-agent-max-calls" /></div>
          <Button className="w-full" onClick={() => onSave({ ...form, skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean), maxConcurrentCalls: parseInt(form.maxConcurrentCalls) || 3 })} data-testid="button-save-agent">Save Agent</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RuleDialog({ open, data, onClose, onSave }: { open: boolean; data?: any; onClose: () => void; onSave: (f: any) => void }) {
  const [form, setForm] = useState({ id: null as number | null, name: "", triggerType: "keyword", triggerCondition: "{}", coachingMessage: "", priority: "5", isActive: true });
  useEffect(() => {
    if (open) setForm(data ? { id: data.id, name: data.name ?? "", triggerType: data.triggerType ?? "keyword", triggerCondition: typeof data.triggerCondition === "string" ? data.triggerCondition : JSON.stringify(data.triggerCondition ?? {}), coachingMessage: data.coachingMessage ?? "", priority: String(data.priority ?? 5), isActive: data.isActive ?? true }
      : { id: null, name: "", triggerType: "keyword", triggerCondition: "{}", coachingMessage: "", priority: "5", isActive: true });
  }, [open, data]);
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="dialog-rule">
        <DialogHeader><DialogTitle>{data ? "Edit" : "Add"} Coaching Rule</DialogTitle><DialogDescription>Configure when coaching alerts fire.</DialogDescription></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><label className="text-sm font-medium">Name</label><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="input-rule-name" /></div>
          <div><label className="text-sm font-medium">Trigger Type</label>
            <Select value={form.triggerType} onValueChange={(v) => set("triggerType", v)}>
              <SelectTrigger data-testid="select-rule-trigger"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["keyword", "sentiment", "silence", "duration", "custom"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-sm font-medium">Trigger Condition (JSON)</label><Textarea value={form.triggerCondition} onChange={(e) => set("triggerCondition", e.target.value)} rows={3} data-testid="input-rule-condition" /></div>
          <div><label className="text-sm font-medium">Coaching Message</label><Textarea value={form.coachingMessage} onChange={(e) => set("coachingMessage", e.target.value)} rows={2} data-testid="input-rule-message" /></div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1"><label className="text-sm font-medium">Priority</label><Input type="number" value={form.priority} onChange={(e) => set("priority", e.target.value)} data-testid="input-rule-priority" /></div>
            <div className="flex items-center gap-2 pt-5">
              <Button variant={form.isActive ? "default" : "outline"} size="sm" onClick={() => set("isActive", !form.isActive)} data-testid="button-rule-active">{form.isActive ? "Active" : "Inactive"}</Button>
            </div>
          </div>
          <Button className="w-full" onClick={() => { let tc; try { tc = JSON.parse(form.triggerCondition); } catch { tc = form.triggerCondition; } onSave({ ...form, priority: parseInt(form.priority) || 5, triggerCondition: tc }); }} data-testid="button-save-rule">Save Rule</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CannedDialog({ open, data, onClose, onSave }: { open: boolean; data?: any; onClose: () => void; onSave: (f: any) => void }) {
  const [form, setForm] = useState({ id: null as number | null, category: "", title: "", shortcut: "", content: "", isActive: true });
  useEffect(() => {
    if (open) setForm(data ? { id: data.id, category: data.category ?? "", title: data.title ?? "", shortcut: data.shortcut ?? "", content: data.content ?? data.text ?? "", isActive: data.isActive ?? true }
      : { id: null, category: "", title: "", shortcut: "", content: "", isActive: true });
  }, [open, data]);
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="dialog-canned">
        <DialogHeader><DialogTitle>{data ? "Edit" : "Add"} Canned Response</DialogTitle><DialogDescription>Manage quick response templates.</DialogDescription></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><label className="text-sm font-medium">Category</label><Input value={form.category} onChange={(e) => set("category", e.target.value)} data-testid="input-canned-category" /></div>
          <div><label className="text-sm font-medium">Title</label><Input value={form.title} onChange={(e) => set("title", e.target.value)} data-testid="input-canned-title" /></div>
          <div><label className="text-sm font-medium">Shortcut</label><Input value={form.shortcut} onChange={(e) => set("shortcut", e.target.value)} placeholder="/greet" data-testid="input-canned-shortcut" /></div>
          <div><label className="text-sm font-medium">Content</label><Textarea value={form.content} onChange={(e) => set("content", e.target.value)} rows={3} data-testid="input-canned-content" /></div>
          <div className="flex items-center gap-2">
            <Button variant={form.isActive ? "default" : "outline"} size="sm" onClick={() => set("isActive", !form.isActive)} data-testid="button-canned-active">{form.isActive ? "Active" : "Inactive"}</Button>
          </div>
          <Button className="w-full" onClick={() => onSave(form)} data-testid="button-save-canned">Save Response</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
