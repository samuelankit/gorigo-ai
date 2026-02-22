"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/lib/use-toast";
import { Users, Network, BookOpen, Trash2 } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";

import type { AgentRecord } from "@/components/dashboard/agent/types";
import { AGENT_TEMPLATES } from "@/components/dashboard/agent/types";
import { AgentsTab } from "@/components/dashboard/agent/agents-tab";
import { FlowTab } from "@/components/dashboard/agent/flow-tab";
import { KnowledgeTab } from "@/components/dashboard/agent/knowledge-tab";
import { EditAgentDialog } from "@/components/dashboard/agent/edit-agent-dialog";
import { AddAgentDialog } from "@/components/dashboard/agent/add-agent-dialog";
import { TestChatDialog } from "@/components/dashboard/agent/test-chat-dialog";
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent, useVoices } from "@/hooks/use-agents";

export default function AgentPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("agents");

  const { data: allAgents = [], isLoading: agentsLoading } = useAgents();
  const voicesQuery = useVoices();
  const availableVoices = voicesQuery.data?.voices || [];
  const supportedLanguages = voicesQuery.data?.languages || [];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [testChatAgent, setTestChatAgent] = useState<AgentRecord | null>(null);

  const [agentLanguage, setAgentLanguage] = useState("en-GB");
  const [agentVoiceName, setAgentVoiceName] = useState("Polly.Amy");

  const [newAgentForm, setNewAgentForm] = useState({
    name: "",
    agentType: "general",
    departmentName: "",
    isRouter: false,
    systemPrompt: "",
    greeting: "Hello! How can I help you today?",
    businessDescription: "",
    roles: "specialist",
  });

  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();

  const savingAgent = createMutation.isPending || updateMutation.isPending;

  const createAgent = async () => {
    if (!newAgentForm.name.trim()) return;
    try {
      await createMutation.mutateAsync({
        ...newAgentForm,
        departmentName: newAgentForm.departmentName || null,
        systemPrompt: newAgentForm.systemPrompt || null,
        language: agentLanguage,
        voiceName: agentVoiceName,
      });
      toast({ title: "Agent created", description: `${newAgentForm.name} has been added.` });
      setShowAddDialog(false);
      setNewAgentForm({ name: "", agentType: "general", departmentName: "", isRouter: false, systemPrompt: "", greeting: "Hello! How can I help you today?", businessDescription: "", roles: "specialist" });
      setAgentLanguage("en-GB");
      setAgentVoiceName("Polly.Amy");
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create agent.", variant: "destructive" });
    }
  };

  const cloneAgent = async (agent: AgentRecord) => {
    try {
      await createMutation.mutateAsync({
        name: `${agent.name} (Copy)`,
        agentType: agent.agentType,
        departmentName: agent.departmentName || null,
        isRouter: false,
        systemPrompt: agent.systemPrompt || null,
        greeting: agent.greeting,
        businessDescription: agent.businessDescription,
        roles: agent.roles,
        language: agent.language || "en-GB",
        voiceName: agent.voiceName || "Polly.Amy",
        speechModel: agent.speechModel || "default",
      });
      toast({ title: "Agent cloned", description: `Copy of ${agent.name} has been created.` });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to clone agent.", variant: "destructive" });
    }
  };

  const createFromTemplate = async (template: typeof AGENT_TEMPLATES[0]) => {
    try {
      await createMutation.mutateAsync({
        ...template.config,
        language: "en-GB",
        voiceName: "Polly.Amy",
        speechModel: "default",
      });
      toast({ title: "Agent created", description: `${template.name} has been created from template.` });
      setShowAddDialog(false);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create agent.", variant: "destructive" });
    }
  };

  const updateAgent = async (agent: AgentRecord) => {
    try {
      await updateMutation.mutateAsync({
        id: agent.id,
        name: agent.name,
        greeting: agent.greeting,
        businessDescription: agent.businessDescription,
        inboundEnabled: agent.inboundEnabled,
        outboundEnabled: agent.outboundEnabled,
        roles: agent.roles,
        faqEntries: agent.faqEntries,
        handoffNumber: agent.handoffNumber,
        handoffTrigger: agent.handoffTrigger,
        voicePreference: agent.voicePreference,
        negotiationEnabled: agent.negotiationEnabled,
        negotiationGuardrails: agent.negotiationGuardrails,
        complianceDisclosure: agent.complianceDisclosure,
        agentType: agent.agentType,
        departmentName: agent.departmentName,
        isRouter: agent.isRouter,
        systemPrompt: agent.systemPrompt,
        escalationRules: agent.escalationRules,
        language: agentLanguage,
        voiceName: agentVoiceName,
      });
      toast({ title: "Saved", description: `${agent.name} updated successfully.` });
      setEditingAgent(null);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update agent.", variant: "destructive" });
    }
  };

  const deleteAgent = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Deleted", description: "Agent has been removed." });
      setDeleteConfirmId(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete agent.", variant: "destructive" });
    }
  };

  const agentTypeBadge = (type: string, isRouter: boolean) => {
    if (isRouter) return <Badge variant="outline" className="text-xs">Router</Badge>;
    switch (type) {
      case "department": return <Badge variant="secondary" className="text-xs">Department</Badge>;
      case "specialist": return <Badge variant="secondary" className="text-xs">Specialist</Badge>;
      default: return <Badge variant="outline" className="text-xs">General</Badge>;
    }
  };

  if (agentsLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto px-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
            <CustomIcon name="ai-voice-head" size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-agent-title">Agent Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure and manage your AI agents, automation flows, and knowledge base.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-agent-management">
          <TabsTrigger value="agents" data-testid="tab-agents">
            <Users className="h-4 w-4 mr-2" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="flow" data-testid="tab-flow">
            <Network className="h-4 w-4 mr-2" />
            Automation Flow
          </TabsTrigger>
          <TabsTrigger value="knowledge" data-testid="tab-knowledge">
            <BookOpen className="h-4 w-4 mr-2" />
            Knowledge Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <AgentsTab
            agents={allAgents}
            onEdit={(agent) => {
              setEditingAgent(agent);
              setAgentLanguage(agent.language || "en-GB");
              setAgentVoiceName(agent.voiceName || "Polly.Amy");
            }}
            onDelete={(id) => setDeleteConfirmId(id)}
            onClone={cloneAgent}
            onTestChat={(agent) => setTestChatAgent(agent)}
            onAdd={() => setShowAddDialog(true)}
            savingAgent={savingAgent}
            agentTypeBadge={agentTypeBadge}
          />
        </TabsContent>

        <TabsContent value="flow">
          <FlowTab allAgents={allAgents} />
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeTab />
        </TabsContent>
      </Tabs>

      <EditAgentDialog
        agent={editingAgent}
        setAgent={setEditingAgent}
        onSave={updateAgent}
        saving={savingAgent}
        availableVoices={availableVoices}
        supportedLanguages={supportedLanguages}
        agentLanguage={agentLanguage}
        setAgentLanguage={setAgentLanguage}
        agentVoiceName={agentVoiceName}
        setAgentVoiceName={setAgentVoiceName}
      />

      <AddAgentDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onCreateFromTemplate={createFromTemplate}
        onCustomCreate={createAgent}
        newAgentForm={newAgentForm}
        setNewAgentForm={setNewAgentForm}
        saving={savingAgent}
        availableVoices={availableVoices}
        supportedLanguages={supportedLanguages}
        agentLanguage={agentLanguage}
        setAgentLanguage={setAgentLanguage}
        agentVoiceName={agentVoiceName}
        setAgentVoiceName={setAgentVoiceName}
      />

      <TestChatDialog
        agent={testChatAgent}
        onClose={() => setTestChatAgent(null)}
      />

      <Dialog open={deleteConfirmId !== null} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>Are you sure you want to delete this agent? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteAgent(deleteConfirmId)} data-testid="button-confirm-delete">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
