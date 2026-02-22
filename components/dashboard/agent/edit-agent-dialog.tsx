"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/lib/use-toast";
import {
  Plus, Trash2, Edit, Check, X, Loader2, Save, Sparkles, Wand2, Globe, Volume2,
} from "lucide-react";
import type { AgentRecord } from "./types";

interface EditAgentDialogProps {
  agent: AgentRecord | null;
  setAgent: (agent: AgentRecord | null) => void;
  onSave: (agent: AgentRecord) => void;
  saving: boolean;
  availableVoices: Array<{id: string; name: string; language: string; gender: string}>;
  supportedLanguages: Array<{code: string; name: string}>;
  agentLanguage: string;
  setAgentLanguage: (lang: string) => void;
  agentVoiceName: string;
  setAgentVoiceName: (name: string) => void;
}

export function EditAgentDialog({
  agent,
  setAgent,
  onSave,
  saving,
  availableVoices,
  supportedLanguages,
  agentLanguage,
  setAgentLanguage,
  agentVoiceName,
  setAgentVoiceName,
}: EditAgentDialogProps) {
  const { toast } = useToast();
  const [aiGreetingOpen, setAiGreetingOpen] = useState(false);
  const [aiGreetingLoading, setAiGreetingLoading] = useState(false);
  const [aiGreetingPreview, setAiGreetingPreview] = useState("");
  const [aiGreetingTone, setAiGreetingTone] = useState("professional");
  const [aiGreetingPrompt, setAiGreetingPrompt] = useState("");

  const [aiFaqLoading, setAiFaqLoading] = useState(false);
  const [aiFaqPreview, setAiFaqPreview] = useState<{ question: string; answer: string } | null>(null);
  const [aiFaqTone, setAiFaqTone] = useState("professional");

  const generateGreeting = async (ag: AgentRecord) => {
    setAiGreetingLoading(true);
    setAiGreetingPreview("");
    try {
      const prompt = aiGreetingPrompt.trim() || `Write a greeting for an AI call centre agent named "${ag.name}" with role "${ag.roles}"${ag.businessDescription ? `. Business: ${ag.businessDescription}` : ""}`;
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "call_script",
          prompt,
          tone: aiGreetingTone,
          language: ag.language || "en",
          agentId: ag.id,
          source: "agent_config",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = res.status === 422
          ? "Your knowledge base is empty. Upload some business documents first to improve AI generation quality."
          : res.status === 402
          ? "Insufficient wallet balance. Please top up to generate content."
          : data.error || "Could not generate greeting";
        toast({ title: "Generation failed", description: msg, variant: "destructive" });
        return;
      }
      setAiGreetingPreview(data.content);
      toast({ title: "Greeting generated", description: `Quality score: ${Math.round((data.qualityScore || 0) * 100)}%` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate greeting", variant: "destructive" });
    } finally {
      setAiGreetingLoading(false);
    }
  };

  const generateFaqAnswer = async (ag: AgentRecord, question: string) => {
    setAiFaqLoading(true);
    setAiFaqPreview(null);
    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "faq_answer",
          prompt: question,
          tone: aiFaqTone,
          agentId: ag.id,
          source: "agent_config",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = res.status === 422
          ? "Your knowledge base is empty. Upload some business documents first to improve AI generation quality."
          : res.status === 402
          ? "Insufficient wallet balance. Please top up to generate content."
          : data.error || "Could not generate FAQ answer";
        toast({ title: "Generation failed", description: msg, variant: "destructive" });
        return;
      }
      setAiFaqPreview({ question, answer: data.content });
      toast({ title: "FAQ answer generated", description: `Quality score: ${Math.round((data.qualityScore || 0) * 100)}%` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate FAQ answer", variant: "destructive" });
    } finally {
      setAiFaqLoading(false);
    }
  };

  return (
    <Dialog open={!!agent} onOpenChange={(v) => { if (!v) setAgent(null); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Agent: {agent?.name}</DialogTitle>
          <DialogDescription>Configure all settings for this agent.</DialogDescription>
        </DialogHeader>
        {agent && (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" data-testid="edit-tab-general">General</TabsTrigger>
              <TabsTrigger value="roles" data-testid="edit-tab-roles">Roles</TabsTrigger>
              <TabsTrigger value="faq" data-testid="edit-tab-faq">FAQ</TabsTrigger>
              <TabsTrigger value="handoff" data-testid="edit-tab-handoff">Handoff</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">Agent Name</Label>
                <Input value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} data-testid="input-edit-agent-name" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Agent Type</Label>
                <Select value={agent.agentType} onValueChange={(v) => setAgent({ ...agent, agentType: v, isRouter: v === "router" })}>
                  <SelectTrigger data-testid="select-edit-agent-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="router">Router</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(agent.agentType === "department" || agent.agentType === "specialist") && (
                <div className="space-y-2">
                  <Label className="font-medium">Department Name</Label>
                  <Input value={agent.departmentName || ""} onChange={(e) => setAgent({ ...agent, departmentName: e.target.value || null })} data-testid="input-edit-department" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="font-medium">Greeting Message</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setAiGreetingOpen(!aiGreetingOpen); setAiGreetingPreview(""); setAiGreetingPrompt(""); }}
                    data-testid="button-ai-greeting"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {aiGreetingOpen ? "Close AI" : "Generate with AI"}
                  </Button>
                </div>
                <Textarea value={agent.greeting} onChange={(e) => setAgent({ ...agent, greeting: e.target.value })} rows={3} data-testid="textarea-edit-greeting" />
                {aiGreetingOpen && (
                  <div className="rounded-md border p-3 space-y-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="text-sm font-medium">AI Greeting Generator</p>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={aiGreetingPrompt}
                        onChange={(e) => setAiGreetingPrompt(e.target.value)}
                        placeholder={`Optional: describe what the greeting should cover (leave blank to auto-generate from agent info)`}
                        data-testid="input-ai-greeting-prompt"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={aiGreetingTone} onValueChange={setAiGreetingTone}>
                        <SelectTrigger className="w-[140px]" data-testid="select-ai-greeting-tone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="concise">Concise</SelectItem>
                          <SelectItem value="empathetic">Empathetic</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => generateGreeting(agent)}
                        disabled={aiGreetingLoading}
                        data-testid="button-generate-greeting"
                      >
                        {aiGreetingLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                        {aiGreetingLoading ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                    {aiGreetingPreview && (
                      <div className="space-y-2">
                        <div className="rounded-md border p-3 bg-background">
                          <p className="text-sm whitespace-pre-wrap" data-testid="text-ai-greeting-preview">{aiGreetingPreview}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => {
                              setAgent({ ...agent, greeting: aiGreetingPreview });
                              setAiGreetingOpen(false);
                              setAiGreetingPreview("");
                              toast({ title: "Greeting applied", description: "AI-generated greeting has been set. Save the agent to keep it." });
                            }}
                            data-testid="button-apply-greeting"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Apply
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateGreeting(agent)}
                            disabled={aiGreetingLoading}
                            data-testid="button-regenerate-greeting"
                          >
                            <Wand2 className="h-3.5 w-3.5 mr-1" />
                            Regenerate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAiGreetingPreview("")}
                            data-testid="button-discard-greeting"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Discard
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Business Description</Label>
                <Textarea value={agent.businessDescription} onChange={(e) => setAgent({ ...agent, businessDescription: e.target.value })} rows={3} data-testid="textarea-edit-business" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">System Prompt</Label>
                <Textarea value={agent.systemPrompt || ""} onChange={(e) => setAgent({ ...agent, systemPrompt: e.target.value || null })} rows={3} placeholder="Custom instructions for this agent..." data-testid="textarea-edit-prompt" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Voice Preference</Label>
                <Select value={agent.voicePreference} onValueChange={(v) => setAgent({ ...agent, voicePreference: v })}>
                  <SelectTrigger data-testid="select-edit-voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">
                  <Globe className="h-4 w-4 inline mr-1" />
                  Language
                </Label>
                <Select value={agentLanguage} onValueChange={(v) => { setAgentLanguage(v); const firstVoice = availableVoices.find(voice => voice.language === v); if (firstVoice) setAgentVoiceName(firstVoice.id); }}>
                  <SelectTrigger data-testid="select-edit-agent-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">
                  <Volume2 className="h-4 w-4 inline mr-1" />
                  Voice
                </Label>
                <Select value={agentVoiceName} onValueChange={setAgentVoiceName}>
                  <SelectTrigger data-testid="select-edit-agent-voice">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices
                      .filter(v => v.language === agentLanguage)
                      .map(voice => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="roles" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label className="font-medium">Inbound Calls</Label>
                  <p className="text-xs text-muted-foreground">Allow AI to handle incoming calls</p>
                </div>
                <Switch checked={agent.inboundEnabled} onCheckedChange={(v) => setAgent({ ...agent, inboundEnabled: v })} data-testid="switch-edit-inbound" />
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label className="font-medium">Outbound Calls</Label>
                  <p className="text-xs text-muted-foreground">Allow AI to make outgoing calls</p>
                </div>
                <Switch checked={agent.outboundEnabled} onCheckedChange={(v) => setAgent({ ...agent, outboundEnabled: v })} data-testid="switch-edit-outbound" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Agent Role</Label>
                <Select value={agent.roles} onValueChange={(v) => setAgent({ ...agent, roles: v })}>
                  <SelectTrigger data-testid="select-edit-roles">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label className="font-medium">Compliance Disclosure</Label>
                  <p className="text-xs text-muted-foreground">Announce that the caller is speaking with an AI</p>
                </div>
                <Switch checked={agent.complianceDisclosure} onCheckedChange={(v) => setAgent({ ...agent, complianceDisclosure: v })} data-testid="switch-edit-compliance" />
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label className="font-medium">Router Agent</Label>
                  <p className="text-xs text-muted-foreground">Entry point that routes calls to specialists</p>
                </div>
                <Switch checked={agent.isRouter} onCheckedChange={(v) => setAgent({ ...agent, isRouter: v, agentType: v ? "router" : agent.agentType })} data-testid="switch-edit-router" />
              </div>
            </TabsContent>

            <TabsContent value="faq" className="mt-4 space-y-4">
              {agent.faqEntries.length > 0 && (
                <div className="space-y-3">
                  {agent.faqEntries.map((entry, index) => (
                    <div key={index} className="border rounded-md p-3 space-y-2 bg-muted/30">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium" data-testid={`text-edit-faq-q-${index}`}>{entry.question}</p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-edit-faq-a-${index}`}>{entry.answer}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => {
                          const updated = agent.faqEntries.filter((_, i) => i !== index);
                          setAgent({ ...agent, faqEntries: updated });
                        }} data-testid={`button-remove-faq-${index}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Separator />
              <EditFaqForm
                onAdd={(q, a) => setAgent({ ...agent, faqEntries: [...agent.faqEntries, { question: q, answer: a }] })}
                onGenerateAnswer={(question) => generateFaqAnswer(agent, question)}
                aiFaqLoading={aiFaqLoading}
                aiFaqPreview={aiFaqPreview}
                aiFaqTone={aiFaqTone}
                onToneChange={setAiFaqTone}
                onClearPreview={() => setAiFaqPreview(null)}
              />
            </TabsContent>

            <TabsContent value="handoff" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">Handoff Phone Number</Label>
                <Input value={agent.handoffNumber} onChange={(e) => setAgent({ ...agent, handoffNumber: e.target.value })} placeholder="+1 (555) 123-4567" data-testid="input-edit-handoff" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Handoff Trigger</Label>
                <Select value={agent.handoffTrigger} onValueChange={(v) => setAgent({ ...agent, handoffTrigger: v })}>
                  <SelectTrigger data-testid="select-edit-handoff-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">On Request</SelectItem>
                    <SelectItem value="stuck">When Stuck</SelectItem>
                    <SelectItem value="qualifying">Always After Qualifying</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label className="font-medium">Negotiation Mode</Label>
                  <p className="text-xs text-muted-foreground">Allow the AI to negotiate pricing</p>
                </div>
                <Switch checked={agent.negotiationEnabled} onCheckedChange={(v) => setAgent({ ...agent, negotiationEnabled: v })} data-testid="switch-edit-negotiation" />
              </div>
              {agent.negotiationEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-medium">Min Price ($)</Label>
                    <Input type="number" value={agent.negotiationGuardrails?.minPrice ?? ""} onChange={(e) => setAgent({ ...agent, negotiationGuardrails: { ...agent.negotiationGuardrails, minPrice: parseFloat(e.target.value) || 0 } })} data-testid="input-edit-min-price" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Max Price ($)</Label>
                    <Input type="number" value={agent.negotiationGuardrails?.maxPrice ?? ""} onChange={(e) => setAgent({ ...agent, negotiationGuardrails: { ...agent.negotiationGuardrails, maxPrice: parseFloat(e.target.value) || 0 } })} data-testid="input-edit-max-price" />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setAgent(null)} data-testid="button-cancel-edit">Cancel</Button>
          <Button onClick={() => agent && onSave(agent)} disabled={saving} data-testid="button-save-edit">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditFaqForm({
  onAdd,
  onGenerateAnswer,
  aiFaqLoading,
  aiFaqPreview,
  aiFaqTone,
  onToneChange,
  onClearPreview,
}: {
  onAdd: (q: string, a: string) => void;
  onGenerateAnswer: (question: string) => void;
  aiFaqLoading: boolean;
  aiFaqPreview: { question: string; answer: string } | null;
  aiFaqTone: string;
  onToneChange: (tone: string) => void;
  onClearPreview: () => void;
}) {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Add New FAQ Entry</h3>
      <div className="space-y-2">
        <Label className="font-medium">Question</Label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What are your business hours?" data-testid="input-edit-faq-question" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="font-medium">Answer</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={aiFaqTone} onValueChange={onToneChange}>
              <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="select-ai-faq-tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="empathetic">Empathetic</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { if (q.trim()) onGenerateAnswer(q.trim()); }}
              disabled={!q.trim() || aiFaqLoading}
              data-testid="button-ai-faq-generate"
            >
              {aiFaqLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              {aiFaqLoading ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
        </div>
        <Textarea value={a} onChange={(e) => setA(e.target.value)} rows={2} placeholder="We are open Monday to Friday, 9 AM to 5 PM." data-testid="textarea-edit-faq-answer" />
      </div>
      {aiFaqPreview && (
        <div className="rounded-md border p-3 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-sm font-medium">AI-Generated Answer</p>
          </div>
          <div className="rounded-md border p-3 bg-background">
            <p className="text-xs font-medium text-muted-foreground mb-1">Q: {aiFaqPreview.question}</p>
            <p className="text-sm" data-testid="text-ai-faq-preview">{aiFaqPreview.answer}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => {
                onAdd(aiFaqPreview.question, aiFaqPreview.answer);
                setQ("");
                setA("");
                onClearPreview();
              }}
              data-testid="button-apply-faq"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Add to FAQ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setA(aiFaqPreview.answer);
                onClearPreview();
              }}
              data-testid="button-edit-faq-answer"
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit First
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearPreview}
              data-testid="button-discard-faq"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Discard
            </Button>
          </div>
        </div>
      )}
      <Button
        variant="outline"
        onClick={() => { if (q.trim() && a.trim()) { onAdd(q.trim(), a.trim()); setQ(""); setA(""); } }}
        disabled={!q.trim() || !a.trim()}
        data-testid="button-add-edit-faq"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Entry
      </Button>
    </div>
  );
}
