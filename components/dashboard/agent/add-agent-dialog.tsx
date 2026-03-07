"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Loader2, Globe, Volume2,
} from "lucide-react";
import { AGENT_TEMPLATES } from "./types";

interface NewAgentForm {
  name: string;
  agentType: string;
  departmentName: string;
  isRouter: boolean;
  systemPrompt: string;
  greeting: string;
  businessDescription: string;
  roles: string;
}

interface AddAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateFromTemplate: (template: typeof AGENT_TEMPLATES[0]) => void;
  onCustomCreate: () => void;
  newAgentForm: NewAgentForm;
  setNewAgentForm: (form: NewAgentForm) => void;
  saving: boolean;
  availableVoices: Array<{id: string; name: string; language: string; gender: string}>;
  supportedLanguages: Array<{code: string; name: string}>;
  agentLanguage: string;
  setAgentLanguage: (lang: string) => void;
  agentVoiceName: string;
  setAgentVoiceName: (name: string) => void;
}

export function AddAgentDialog({
  open,
  onClose,
  onCreateFromTemplate,
  onCustomCreate,
  newAgentForm,
  setNewAgentForm,
  saving,
  availableVoices,
  supportedLanguages,
  agentLanguage,
  setAgentLanguage,
  agentVoiceName,
  setAgentVoiceName,
}: AddAgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
          <DialogDescription>Create a new AI agent for your organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium text-xs text-muted-foreground uppercase">Quick Start Templates</Label>
            <div className="grid grid-cols-3 gap-2">
              {AGENT_TEMPLATES.map((tmpl) => (
                <Card
                  key={tmpl.name}
                  className="hover-elevate cursor-pointer p-3 text-center"
                  onClick={() => onCreateFromTemplate(tmpl)}
                  data-testid={`card-template-${tmpl.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <tmpl.icon className="h-5 w-5 mx-auto mb-1.5 text-blue-500" />
                  <p className="text-xs font-medium">{tmpl.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{tmpl.description}</p>
                </Card>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="font-medium">Agent Name</Label>
            <Input
              value={newAgentForm.name}
              onChange={(e) => setNewAgentForm({ ...newAgentForm, name: e.target.value })}
              placeholder="e.g., Sales Agent"
              data-testid="input-new-agent-name"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Agent Type</Label>
            <Select value={newAgentForm.agentType} onValueChange={(v) => setNewAgentForm({ ...newAgentForm, agentType: v, isRouter: v === "router" })}>
              <SelectTrigger data-testid="select-new-agent-type">
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
          {(newAgentForm.agentType === "department" || newAgentForm.agentType === "specialist") && (
            <div className="space-y-2">
              <Label className="font-medium">Department Name</Label>
              <Input
                value={newAgentForm.departmentName}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, departmentName: e.target.value })}
                placeholder="e.g., Sales, Support, Billing"
                data-testid="input-new-agent-department"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="font-medium">Router Agent</Label>
              <p className="text-xs text-muted-foreground">Entry point that routes calls</p>
            </div>
            <Switch
              checked={newAgentForm.isRouter}
              onCheckedChange={(v) => setNewAgentForm({ ...newAgentForm, isRouter: v, agentType: v ? "router" : newAgentForm.agentType })}
              data-testid="switch-new-agent-router"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Greeting</Label>
            <Textarea
              value={newAgentForm.greeting}
              onChange={(e) => setNewAgentForm({ ...newAgentForm, greeting: e.target.value })}
              rows={2}
              placeholder="Hello! How can I help you today?"
              data-testid="textarea-new-agent-greeting"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Business Description</Label>
            <Textarea
              value={newAgentForm.businessDescription}
              onChange={(e) => setNewAgentForm({ ...newAgentForm, businessDescription: e.target.value })}
              rows={2}
              placeholder="Describe what this agent handles..."
              data-testid="textarea-new-agent-description"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">System Prompt</Label>
            <Textarea
              value={newAgentForm.systemPrompt}
              onChange={(e) => setNewAgentForm({ ...newAgentForm, systemPrompt: e.target.value })}
              rows={3}
              placeholder="Custom instructions for this agent..."
              data-testid="textarea-new-agent-prompt"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Role</Label>
            <Select value={newAgentForm.roles} onValueChange={(v) => setNewAgentForm({ ...newAgentForm, roles: v })}>
              <SelectTrigger data-testid="select-new-agent-roles">
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
          <div className="space-y-2">
            <Label className="font-medium">
              <Globe className="h-4 w-4 inline mr-1" />
              Language
            </Label>
            <Select value={agentLanguage} onValueChange={(v) => { setAgentLanguage(v); const firstVoice = availableVoices.find(voice => voice.language === v); if (firstVoice) setAgentVoiceName(firstVoice.id); }}>
              <SelectTrigger data-testid="select-new-agent-language">
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
              <SelectTrigger data-testid="select-new-agent-voice">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                {availableVoices
                  .filter(v => v.language === agentLanguage)
                  .map(voice => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender}){(voice as any).quality === "neural" ? " ✦ Neural" : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-add">Cancel</Button>
          <Button onClick={onCustomCreate} disabled={!newAgentForm.name.trim() || saving} data-testid="button-confirm-add">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {saving ? "Creating..." : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
