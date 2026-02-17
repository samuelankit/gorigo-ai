"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/lib/use-toast";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Plus, Trash2, Edit, Check, X, Bot, Settings, Shield, HelpCircle, PhoneForwarded,
  BookOpen, FileText, Loader2, Database, Zap, Link, Volume2, Network, Play,
  Square, Diamond, ArrowRight, Save, LayoutGrid, AlertTriangle, Users, Router, Sparkles, GripVertical, CircleDot, Hexagon, TriangleAlert,
  PhoneIncoming, GitBranch, PhoneOff, Headphones, TrendingUp, LifeBuoy, CheckCircle2, XCircle, AlertCircle, Eye, Wand2, Globe, Copy, Briefcase, CalendarCheck, Wrench,
  MessageSquare, Send, User
} from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";

interface FaqEntry {
  question: string;
  answer: string;
}

interface AgentRecord {
  id: number;
  name: string;
  greeting: string;
  businessDescription: string;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  roles: string;
  faqEntries: FaqEntry[];
  handoffNumber: string;
  handoffTrigger: string;
  voicePreference: string;
  negotiationEnabled: boolean;
  negotiationGuardrails: { minPrice?: number; maxPrice?: number } | null;
  complianceDisclosure: boolean;
  agentType: string;
  departmentName: string | null;
  isRouter: boolean;
  systemPrompt: string | null;
  escalationRules: unknown;
  status: string;
  displayOrder: number;
  language: string | null;
  voiceName: string | null;
  speechModel: string | null;
}

interface FlowNode {
  id: string;
  type: "agent" | "router" | "decision" | "action" | "entry" | "end";
  label: string;
  agentId?: number;
  position: { x: number; y: number };
  data?: {
    actionType?: "transfer" | "voicemail" | "webhook" | "hangup" | "hold";
    condition?: string;
    conditionField?: string;
    conditionOperator?: string;
    conditionValue?: string;
    departmentName?: string;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: {
    field: string;
    operator: "equals" | "contains" | "starts_with" | "intent_is";
    value: string;
  };
}

interface FlowRecord {
  id: number;
  name: string;
  description: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  entryAgentId: number | null;
  isActive: boolean;
  version: number;
}

interface KnowledgeDoc {
  id: number;
  title: string;
  sourceType: string;
  status: string;
  chunkCount: number;
  createdAt: string;
}

interface RAGStats {
  totalDocuments: number;
  totalChunks: number;
  processedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  cacheEntries: number;
  cacheHitRate: number;
}

function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateEdgeId(): string {
  return `edge_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  entry: { bg: "#22c55e", border: "#16a34a", text: "#ffffff" },
  agent: { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },
  router: { bg: "#f97316", border: "#ea580c", text: "#ffffff" },
  decision: { bg: "#eab308", border: "#ca8a04", text: "#1a1a1a" },
  action: { bg: "#a855f7", border: "#9333ea", text: "#ffffff" },
  end: { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;
const PORT_RADIUS = 6;

const FRIENDLY_NODE_INFO: Record<string, { label: string; description: string; icon: string }> = {
  entry: { label: "When a Call Arrives", description: "Starting point - every call begins here", icon: "PhoneIncoming" },
  router: { label: "Receptionist (Auto-Route)", description: "Listens to the caller and sends them to the right team", icon: "GitBranch" },
  agent: { label: "Department / Team", description: "A team that handles calls (e.g. Sales, Support)", icon: "Users" },
  decision: { label: "Check a Condition", description: "Route the call based on what the caller says or needs", icon: "HelpCircle" },
  action: { label: "Take an Action", description: "Do something specific: transfer, voicemail, webhook", icon: "Zap" },
  end: { label: "End Call", description: "The call ends here - wrap up and goodbye", icon: "PhoneOff" },
};

const FRIENDLY_NODE_ICONS: Record<string, any> = {
  PhoneIncoming, GitBranch, Users, HelpCircle, Zap, PhoneOff,
};

const FLOW_TEMPLATES = [
  {
    id: "support",
    name: "Customer Support Center",
    description: "A receptionist greets callers and routes them to Support, Billing, or Technical teams.",
    icon: "Headphones",
    nodes: [
      { id: "t_entry", type: "entry" as const, label: "Call Arrives", position: { x: 80, y: 200 } },
      { id: "t_router", type: "router" as const, label: "Receptionist", position: { x: 300, y: 200 }, data: {} },
      { id: "t_support", type: "agent" as const, label: "Support Team", position: { x: 560, y: 80 }, data: { departmentName: "Support" } },
      { id: "t_billing", type: "agent" as const, label: "Billing Team", position: { x: 560, y: 200 }, data: { departmentName: "Billing" } },
      { id: "t_technical", type: "agent" as const, label: "Technical Team", position: { x: 560, y: 320 }, data: { departmentName: "Technical" } },
      { id: "t_end", type: "end" as const, label: "End Call", position: { x: 780, y: 200 } },
    ],
    edges: [
      { id: "te_1", source: "t_entry", target: "t_router" },
      { id: "te_2", source: "t_router", target: "t_support", label: "Support request" },
      { id: "te_3", source: "t_router", target: "t_billing", label: "Billing question" },
      { id: "te_4", source: "t_router", target: "t_technical", label: "Technical issue" },
      { id: "te_5", source: "t_support", target: "t_end" },
      { id: "te_6", source: "t_billing", target: "t_end" },
      { id: "te_7", source: "t_technical", target: "t_end" },
    ],
  },
  {
    id: "sales",
    name: "Sales Pipeline",
    description: "Qualify leads, route hot prospects to your sales team, and handle follow-ups.",
    icon: "TrendingUp",
    nodes: [
      { id: "t_entry", type: "entry" as const, label: "Call Arrives", position: { x: 80, y: 160 } },
      { id: "t_receptionist", type: "router" as const, label: "Receptionist", position: { x: 280, y: 160 }, data: {} },
      { id: "t_qualify", type: "decision" as const, label: "Qualified Lead?", position: { x: 480, y: 160 }, data: { conditionField: "intent", conditionOperator: "equals", conditionValue: "purchase" } },
      { id: "t_sales", type: "agent" as const, label: "Sales Team", position: { x: 700, y: 80 }, data: { departmentName: "Sales" } },
      { id: "t_info", type: "action" as const, label: "Send Info Pack", position: { x: 700, y: 260 }, data: { actionType: "webhook" as const } },
      { id: "t_end", type: "end" as const, label: "End Call", position: { x: 900, y: 160 } },
    ],
    edges: [
      { id: "te_1", source: "t_entry", target: "t_receptionist" },
      { id: "te_2", source: "t_receptionist", target: "t_qualify" },
      { id: "te_3", source: "t_qualify", target: "t_sales", label: "Yes - interested" },
      { id: "te_4", source: "t_qualify", target: "t_info", label: "No - send info" },
      { id: "te_5", source: "t_sales", target: "t_end" },
      { id: "te_6", source: "t_info", target: "t_end" },
    ],
  },
  {
    id: "helpdesk",
    name: "Simple Help Desk",
    description: "One general agent handles all calls with option to escalate to a human.",
    icon: "LifeBuoy",
    nodes: [
      { id: "t_entry", type: "entry" as const, label: "Call Arrives", position: { x: 100, y: 160 } },
      { id: "t_agent", type: "agent" as const, label: "Help Desk Agent", position: { x: 340, y: 160 }, data: { departmentName: "General" } },
      { id: "t_escalate", type: "action" as const, label: "Transfer to Human", position: { x: 580, y: 80 }, data: { actionType: "transfer" as const } },
      { id: "t_end", type: "end" as const, label: "End Call", position: { x: 580, y: 260 } },
    ],
    edges: [
      { id: "te_1", source: "t_entry", target: "t_agent" },
      { id: "te_2", source: "t_agent", target: "t_escalate", label: "Needs human help" },
      { id: "te_3", source: "t_agent", target: "t_end", label: "Resolved" },
    ],
  },
];

const TEMPLATE_ICONS: Record<string, any> = { Headphones, TrendingUp, LifeBuoy };

export default function AgentPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("agents");

  const [agentsLoading, setAgentsLoading] = useState(true);
  const [allAgents, setAllAgents] = useState<AgentRecord[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [savingAgent, setSavingAgent] = useState(false);

  const [testChatAgent, setTestChatAgent] = useState<AgentRecord | null>(null);
  const [testChatMessages, setTestChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [testChatInput, setTestChatInput] = useState("");
  const [testChatSending, setTestChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [aiGreetingOpen, setAiGreetingOpen] = useState(false);
  const [aiGreetingLoading, setAiGreetingLoading] = useState(false);
  const [aiGreetingPreview, setAiGreetingPreview] = useState("");
  const [aiGreetingTone, setAiGreetingTone] = useState("professional");
  const [aiGreetingPrompt, setAiGreetingPrompt] = useState("");

  const [aiFaqOpen, setAiFaqOpen] = useState(false);
  const [aiFaqLoading, setAiFaqLoading] = useState(false);
  const [aiFaqPreview, setAiFaqPreview] = useState<{ question: string; answer: string } | null>(null);
  const [aiFaqTone, setAiFaqTone] = useState("professional");

  const generateGreeting = async (agent: AgentRecord) => {
    setAiGreetingLoading(true);
    setAiGreetingPreview("");
    try {
      const prompt = aiGreetingPrompt.trim() || `Write a greeting for an AI call centre agent named "${agent.name}" with role "${agent.roles}"${agent.businessDescription ? `. Business: ${agent.businessDescription}` : ""}`;
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "call_script",
          prompt,
          tone: aiGreetingTone,
          language: agent.language || "en",
          agentId: agent.id,
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

  const generateFaqAnswer = async (agent: AgentRecord, question: string) => {
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
          agentId: agent.id,
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

  const startTestChat = (agent: AgentRecord) => {
    setTestChatAgent(agent);
    setTestChatMessages([]);
    setTestChatInput("");
    setTestChatSending(false);
  };

  const sendTestMessage = async () => {
    if (!testChatInput.trim() || !testChatAgent || testChatSending) return;
    const userMsg = testChatInput.trim();
    setTestChatInput("");
    const updatedMessages = [...testChatMessages, { role: "user" as const, content: userMsg }];
    setTestChatMessages(updatedMessages);
    setTestChatSending(true);
    try {
      const res = await fetch("/api/agents/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: testChatAgent.id,
          message: userMsg,
          history: testChatMessages,
        }),
      });
      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();
      setTestChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setTestChatMessages(prev => [...prev, { role: "assistant", content: "Error: Could not generate a response. Please try again." }]);
    } finally {
      setTestChatSending(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [testChatMessages]);

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

  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<number | null>(null);
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [flowsLoading, setFlowsLoading] = useState(false);
  const [savingFlow, setSavingFlow] = useState(false);
  const [flowName, setFlowName] = useState("Main Flow");
  const svgRef = useRef<SVGSVGElement>(null);

  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [ragStats, setRagStats] = useState<RAGStats | null>(null);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [audioUrls, setAudioUrls] = useState("");
  const [importingAudio, setImportingAudio] = useState(false);
  const [knowledgeInputMode, setKnowledgeInputMode] = useState<"text" | "audio">("text");

  const [agentLanguage, setAgentLanguage] = useState("en-GB");
  const [agentVoiceName, setAgentVoiceName] = useState("Polly.Amy");
  const [availableVoices, setAvailableVoices] = useState<Array<{id: string; name: string; language: string; gender: string}>>([]);
  const [supportedLanguages, setSupportedLanguages] = useState<Array<{code: string; name: string}>>([]);

  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardDepartments, setWizardDepartments] = useState<string[]>([]);
  const [wizardUseRouter, setWizardUseRouter] = useState(true);
  const [wizardCustomDept, setWizardCustomDept] = useState("");
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationStep, setSimulationStep] = useState(-1);
  const [simulationPath, setSimulationPath] = useState<string[]>([]);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [validationMessages, setValidationMessages] = useState<{type: "error" | "warning" | "success"; message: string}[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const res = await fetch("/api/agents/multi");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAllAgents((data.agents || []).map((a: any) => ({
        id: a.id,
        name: a.name || "",
        greeting: a.greeting || "",
        businessDescription: a.businessDescription || "",
        inboundEnabled: a.inboundEnabled ?? true,
        outboundEnabled: a.outboundEnabled ?? false,
        roles: a.roles || "specialist",
        faqEntries: (a.faqEntries as FaqEntry[]) || [],
        handoffNumber: a.handoffNumber || "",
        handoffTrigger: a.handoffTrigger || "transfer",
        voicePreference: a.voicePreference || "professional",
        negotiationEnabled: a.negotiationEnabled ?? false,
        negotiationGuardrails: a.negotiationGuardrails as any,
        complianceDisclosure: a.complianceDisclosure ?? true,
        agentType: a.agentType || "general",
        departmentName: a.departmentName || null,
        isRouter: a.isRouter ?? false,
        systemPrompt: a.systemPrompt || null,
        escalationRules: a.escalationRules || null,
        status: a.status || "active",
        displayOrder: a.displayOrder ?? 0,
        language: a.language || null,
        voiceName: a.voiceName || null,
        speechModel: a.speechModel || null,
      })));
    } catch (error) {
      toast({ title: "Error", description: "Failed to load agents.", variant: "destructive" });
    } finally {
      setAgentsLoading(false);
    }
  }, [toast]);

  const fetchFlows = useCallback(async () => {
    setFlowsLoading(true);
    try {
      const res = await fetch("/api/flows");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const loadedFlows = (data.flows || []) as FlowRecord[];
      setFlows(loadedFlows);
      if (data.activeFlow) {
        setActiveFlowId(data.activeFlow.id);
        setFlowNodes(data.activeFlow.nodes || []);
        setFlowEdges(data.activeFlow.edges || []);
        setFlowName(data.activeFlow.name || "Main Flow");
      } else if (loadedFlows.length > 0) {
        const first = loadedFlows[0];
        setActiveFlowId(first.id);
        setFlowNodes(first.nodes || []);
        setFlowEdges(first.edges || []);
        setFlowName(first.name || "Main Flow");
      }
    } catch (error) {
      console.error("Fetch agent flows failed:", error);
    } finally {
      setFlowsLoading(false);
    }
  }, []);

  const fetchKnowledge = useCallback(async () => {
    setLoadingKnowledge(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        fetch("/api/knowledge"),
        fetch("/api/knowledge/stats"),
      ]);
      if (docsRes.ok) {
        const data = await docsRes.json();
        setKnowledgeDocs(data.documents || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setRagStats(data);
      }
    } catch (error) {
      console.error("Fetch knowledge docs failed:", error);
    } finally {
      setLoadingKnowledge(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchKnowledge();
    fetch("/api/voices")
      .then(r => r.json())
      .then(data => {
        if (data.voices) setAvailableVoices(data.voices);
        if (data.languages) setSupportedLanguages(data.languages);
      })
      .catch((error) => { console.error("Fetch supported languages failed:", error); });
  }, [fetchAgents, fetchKnowledge]);

  useEffect(() => {
    if (activeTab === "flow") {
      fetchFlows();
    }
  }, [activeTab, fetchFlows]);

  const createAgent = async () => {
    if (!newAgentForm.name.trim()) return;
    setSavingAgent(true);
    try {
      const res = await fetch("/api/agents/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAgentForm,
          departmentName: newAgentForm.departmentName || null,
          systemPrompt: newAgentForm.systemPrompt || null,
          language: agentLanguage,
          voiceName: agentVoiceName,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create agent");
      }
      toast({ title: "Agent created", description: `${newAgentForm.name} has been added.` });
      setShowAddDialog(false);
      setNewAgentForm({ name: "", agentType: "general", departmentName: "", isRouter: false, systemPrompt: "", greeting: "Hello! How can I help you today?", businessDescription: "", roles: "specialist" });
      setAgentLanguage("en-GB");
      setAgentVoiceName("Polly.Amy");
      fetchAgents();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create agent.", variant: "destructive" });
    } finally {
      setSavingAgent(false);
    }
  };

  const cloneAgent = async (agent: AgentRecord) => {
    setSavingAgent(true);
    try {
      const res = await fetch("/api/agents/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to clone agent");
      }
      toast({ title: "Agent cloned", description: `Copy of ${agent.name} has been created.` });
      fetchAgents();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to clone agent.", variant: "destructive" });
    } finally {
      setSavingAgent(false);
    }
  };

  const AGENT_TEMPLATES = [
    {
      name: "Sales Agent",
      icon: Briefcase,
      description: "Handles inbound sales calls, qualifies leads, and books demos.",
      config: {
        name: "Sales Agent",
        agentType: "specialist",
        departmentName: "Sales",
        isRouter: false,
        greeting: "Hi there! Thanks for calling. I'd love to learn about what you're looking for and see how we can help. What brings you to us today?",
        businessDescription: "Handle inbound sales enquiries, qualify leads by asking about budget, timeline, and requirements, capture contact information, and schedule demo calls.",
        roles: "sales",
        systemPrompt: "You are a professional sales agent. Your goals: 1) Warmly greet the caller, 2) Understand their needs by asking open-ended questions, 3) Qualify the lead (budget, timeline, decision-maker), 4) Capture their name, email, and phone, 5) Offer to schedule a demo or follow-up call. Be enthusiastic but not pushy. If they're not ready, respect that and offer to send information.",
      },
    },
    {
      name: "Support Agent",
      icon: Wrench,
      description: "Handles customer support calls, troubleshoots issues, and escalates when needed.",
      config: {
        name: "Support Agent",
        agentType: "specialist",
        departmentName: "Support",
        isRouter: false,
        greeting: "Hello! You've reached our support team. I'm here to help resolve any issues you're experiencing. Could you tell me what's going on?",
        businessDescription: "Handle customer support enquiries, troubleshoot common issues, provide step-by-step solutions, and escalate complex issues to human agents when needed.",
        roles: "support",
        systemPrompt: "You are a helpful customer support agent. Your goals: 1) Listen carefully to the customer's issue, 2) Ask clarifying questions to understand the problem, 3) Provide clear step-by-step solutions, 4) If you can't resolve it, offer to escalate to a specialist, 5) Always confirm the issue is resolved before ending. Be patient, empathetic, and solution-oriented.",
      },
    },
    {
      name: "Appointment Booker",
      icon: CalendarCheck,
      description: "Schedules appointments, manages availability, and sends confirmations.",
      config: {
        name: "Appointment Booker",
        agentType: "specialist",
        departmentName: "Scheduling",
        isRouter: false,
        greeting: "Hello! I'd be happy to help you schedule an appointment. What service are you looking to book?",
        businessDescription: "Schedule appointments for customers, check availability, collect necessary information (name, contact, preferred date/time, service type), and confirm bookings.",
        roles: "scheduler",
        systemPrompt: "You are a friendly appointment scheduling agent. Your goals: 1) Understand what service the caller needs, 2) Ask for their preferred date and time, 3) Collect their full name, phone number, and email, 4) Confirm the appointment details, 5) Inform them about any preparation needed. Be efficient but friendly. Always repeat back the booking details for confirmation.",
      },
    },
  ];

  const createFromTemplate = async (template: typeof AGENT_TEMPLATES[0]) => {
    setSavingAgent(true);
    try {
      const res = await fetch("/api/agents/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...template.config,
          language: "en-GB",
          voiceName: "Polly.Amy",
          speechModel: "default",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create agent");
      }
      toast({ title: "Agent created", description: `${template.name} has been created from template.` });
      setShowAddDialog(false);
      fetchAgents();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create agent.", variant: "destructive" });
    } finally {
      setSavingAgent(false);
    }
  };

  const updateAgent = async (agent: AgentRecord) => {
    setSavingAgent(true);
    try {
      const res = await fetch("/api/agents/multi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast({ title: "Saved", description: `${agent.name} updated successfully.` });
      setEditingAgent(null);
      fetchAgents();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update agent.", variant: "destructive" });
    } finally {
      setSavingAgent(false);
    }
  };

  const deleteAgent = async (id: number) => {
    try {
      const res = await fetch(`/api/agents/multi?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Deleted", description: "Agent has been removed." });
      setDeleteConfirmId(null);
      fetchAgents();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete agent.", variant: "destructive" });
    }
  };

  const uploadDocument = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return;
    setUploadingDoc(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newDocTitle.trim(), content: newDocContent.trim(), sourceType: "text" }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      await fetch("/api/knowledge/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: data.document.id }),
      });
      setNewDocTitle("");
      setNewDocContent("");
      toast({ title: "Document added", description: "Your document is being processed and will be ready shortly." });
      setTimeout(() => fetchKnowledge(), 2000);
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload document.", variant: "destructive" });
    } finally {
      setUploadingDoc(false);
    }
  };

  const deleteDocument = async (id: number) => {
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Deleted", description: "Document removed from knowledge base." });
      fetchKnowledge();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
    }
  };

  const importAudioUrls = async () => {
    const lines = audioUrls.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return;
    if (lines.length > 10) {
      toast({ title: "Too many URLs", description: "Maximum 10 URLs per batch.", variant: "destructive" });
      return;
    }
    setImportingAudio(true);
    try {
      const res = await fetch("/api/knowledge/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: lines }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      const data = await res.json();
      const { summary } = data;
      if (summary.errors > 0 && summary.success > 0) {
        toast({ title: "Partial success", description: `${summary.success} imported, ${summary.errors} failed.` });
      } else if (summary.errors > 0) {
        toast({ title: "Import failed", description: data.results.find((r: any) => r.error)?.error || "All imports failed.", variant: "destructive" });
      } else {
        toast({ title: "Audio imported", description: `${summary.success} audio file${summary.success > 1 ? "s" : ""} transcribed and added to knowledge base.` });
      }
      setAudioUrls("");
      setTimeout(() => fetchKnowledge(), 2000);
    } catch (error) {
      toast({ title: "Import error", description: error instanceof Error ? error.message : "Failed to import audio.", variant: "destructive" });
    } finally {
      setImportingAudio(false);
    }
  };

  const addFlowNode = (type: FlowNode["type"], x?: number, y?: number) => {
    const labels: Record<string, string> = { entry: "Start", agent: "Agent", router: "Router", decision: "Decision", action: "Action", end: "End" };
    const newNode: FlowNode = {
      id: generateId(),
      type,
      label: labels[type] || type,
      position: { x: x ?? 300 + Math.random() * 200, y: y ?? 200 + Math.random() * 200 },
      data: type === "action" ? { actionType: "transfer" } : type === "decision" ? { condition: "", conditionField: "intent", conditionOperator: "equals", conditionValue: "" } : {},
    };
    setFlowNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  };

  const updateFlowNode = (id: string, updates: Partial<FlowNode>) => {
    setFlowNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const deleteSelectedNode = () => {
    if (selectedNodeId) {
      setFlowNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
      setFlowEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
    }
    if (selectedEdgeId) {
      setFlowEdges((prev) => prev.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  };

  const autoLayout = () => {
    const sorted = [...flowNodes];
    const entryNodes = sorted.filter((n) => n.type === "entry");
    const routerNodes = sorted.filter((n) => n.type === "router");
    const agentNodes = sorted.filter((n) => n.type === "agent");
    const decisionNodes = sorted.filter((n) => n.type === "decision");
    const actionNodes = sorted.filter((n) => n.type === "action");
    const endNodes = sorted.filter((n) => n.type === "end");

    const layers = [entryNodes, routerNodes, decisionNodes, agentNodes, actionNodes, endNodes];
    let y = 40;
    const updated: FlowNode[] = [];
    for (const layer of layers) {
      if (layer.length === 0) continue;
      const totalWidth = layer.length * (NODE_WIDTH + 40);
      let x = Math.max(40, (800 - totalWidth) / 2);
      for (const node of layer) {
        updated.push({ ...node, position: { x, y } });
        x += NODE_WIDTH + 40;
      }
      y += NODE_HEIGHT + 60;
    }
    setFlowNodes(updated);
  };

  const saveFlow = async () => {
    setSavingFlow(true);
    try {
      if (activeFlowId) {
        const res = await fetch("/api/flows", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeFlowId, name: flowName, nodes: flowNodes, edges: flowEdges, isActive: true }),
        });
        if (!res.ok) throw new Error("Failed to save flow");
        toast({ title: "Flow saved", description: "Automation flow updated." });
      } else {
        const res = await fetch("/api/flows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: flowName, nodes: flowNodes, edges: flowEdges, isActive: true }),
        });
        if (!res.ok) throw new Error("Failed to create flow");
        const data = await res.json();
        setActiveFlowId(data.flow.id);
        toast({ title: "Flow created", description: "New automation flow saved." });
      }
      fetchFlows();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save flow.", variant: "destructive" });
    } finally {
      setSavingFlow(false);
    }
  };

  const loadFlow = (flow: FlowRecord) => {
    setActiveFlowId(flow.id);
    setFlowNodes(flow.nodes || []);
    setFlowEdges(flow.edges || []);
    setFlowName(flow.name);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const getComplexity = () => {
    const agentCount = flowNodes.filter((n) => n.type === "agent" || n.type === "router").length;
    const decisionCount = flowNodes.filter((n) => n.type === "decision").length;
    if (agentCount <= 1 && decisionCount === 0) return { tier: "simple", color: "text-green-600" };
    if (agentCount <= 3 && decisionCount <= 2) return { tier: "standard", color: "text-blue-600" };
    if (agentCount <= 6 && decisionCount <= 5) return { tier: "complex", color: "text-amber-600" };
    return { tier: "enterprise", color: "text-red-600" };
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      if (connectingFrom) {
        setConnectingFrom(null);
      }
    }
  };

  const handleSvgDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      const rect = svgRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left - NODE_WIDTH / 2;
      const y = e.clientY - rect.top - NODE_HEIGHT / 2;
      addFlowNode("agent", Math.max(0, x), Math.max(0, y));
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        const newEdge: FlowEdge = { id: generateEdgeId(), source: connectingFrom, target: nodeId };
        setFlowEdges((prev) => [...prev, newEdge]);
      }
      setConnectingFrom(null);
      return;
    }
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    const node = flowNodes.find((n) => n.id === nodeId);
    if (node) {
      const rect = svgRef.current!.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left - node.position.x, y: e.clientY - rect.top - node.position.y });
      setDraggingNodeId(nodeId);
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNodeId && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left - dragOffset.x);
      const y = Math.max(0, e.clientY - rect.top - dragOffset.y);
      setFlowNodes((prev) => prev.map((n) => (n.id === draggingNodeId ? { ...n, position: { x, y } } : n)));
    }
  };

  const handleSvgMouseUp = () => {
    setDraggingNodeId(null);
  };

  const handlePortClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        const newEdge: FlowEdge = { id: generateEdgeId(), source: connectingFrom, target: nodeId };
        setFlowEdges((prev) => [...prev, newEdge]);
      }
      setConnectingFrom(null);
    } else {
      setConnectingFrom(nodeId);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        deleteSelectedNode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const getEdgePath = (edge: FlowEdge) => {
    const sourceNode = flowNodes.find((n) => n.id === edge.source);
    const targetNode = flowNodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return "";
    const sx = sourceNode.position.x + NODE_WIDTH;
    const sy = sourceNode.position.y + NODE_HEIGHT / 2;
    const tx = targetNode.position.x;
    const ty = targetNode.position.y + NODE_HEIGHT / 2;
    const dx = Math.abs(tx - sx) * 0.5;
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
  };

  const getEdgeLabelPos = (edge: FlowEdge) => {
    const sourceNode = flowNodes.find((n) => n.id === edge.source);
    const targetNode = flowNodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return { x: 0, y: 0 };
    return {
      x: (sourceNode.position.x + NODE_WIDTH + targetNode.position.x) / 2,
      y: (sourceNode.position.y + NODE_HEIGHT / 2 + targetNode.position.y + NODE_HEIGHT / 2) / 2 - 8,
    };
  };

  const activeAgents = allAgents.filter((a) => a.status !== "deleted");

  const agentTypeBadge = (type: string, isRouter: boolean) => {
    if (isRouter) return <Badge variant="outline" className="text-xs">Router</Badge>;
    switch (type) {
      case "department": return <Badge variant="secondary" className="text-xs">Department</Badge>;
      case "specialist": return <Badge variant="secondary" className="text-xs">Specialist</Badge>;
      default: return <Badge variant="outline" className="text-xs">General</Badge>;
    }
  };

  const validateFlowClient = useCallback(() => {
    const msgs: {type: "error" | "warning" | "success"; message: string}[] = [];
    const hasEntry = flowNodes.some((n) => n.type === "entry");
    const hasAgent = flowNodes.some((n) => n.type === "agent" || n.type === "router");
    const hasEnd = flowNodes.some((n) => n.type === "end");
    if (!hasEntry) msgs.push({ type: "error", message: "Your flow needs a starting point. Add a 'When a Call Arrives' block." });
    if (!hasAgent) msgs.push({ type: "error", message: "Add at least one Department/Team to handle calls." });
    if (hasEntry) {
      const entryNode = flowNodes.find((n) => n.type === "entry");
      if (entryNode && !flowEdges.some((e) => e.source === entryNode.id)) {
        msgs.push({ type: "error", message: "Connect your starting point to the next step." });
      }
    }
    const unconnectedAgents = flowNodes.filter((n) => (n.type === "agent" || n.type === "router") && !flowEdges.some((e) => e.target === n.id));
    if (unconnectedAgents.length > 0) msgs.push({ type: "warning", message: "Some teams aren't connected. Callers can't reach them." });
    if (!hasEnd) msgs.push({ type: "warning", message: "Consider adding an 'End Call' block to properly close conversations." });
    if (msgs.length === 0) msgs.push({ type: "success", message: "Your call flow looks good! All paths are connected." });
    setValidationMessages(msgs);
    setShowValidation(true);
    return msgs;
  }, [flowNodes, flowEdges]);

  const applyTemplate = useCallback((templateId: string) => {
    const template = FLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setFlowNodes(template.nodes as FlowNode[]);
    setFlowEdges(template.edges as FlowEdge[]);
    setFlowName(template.name);
    setActiveFlowId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setShowTemplateChooser(false);
    toast({ title: "Template loaded", description: `"${template.name}" template is ready. Customize it and save.` });
  }, [toast]);

  const stopSimulation = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setSimulationActive(false);
    setSimulationStep(-1);
    setSimulationPath([]);
  }, []);

  const startSimulation = useCallback(() => {
    const msgs = validateFlowClient();
    const hasErrors = msgs.some((m) => m.type === "error");
    if (hasErrors) {
      toast({ title: "Cannot simulate", description: "Fix the errors in your flow first.", variant: "destructive" });
      return;
    }
    const entryNode = flowNodes.find((n) => n.type === "entry");
    if (!entryNode) return;
    const path: string[] = [entryNode.id];
    let currentId = entryNode.id;
    const visited = new Set<string>();
    visited.add(currentId);
    for (let i = 0; i < 20; i++) {
      const outEdge = flowEdges.find((e) => e.source === currentId);
      if (!outEdge) break;
      if (visited.has(outEdge.target)) break;
      visited.add(outEdge.target);
      path.push(outEdge.target);
      currentId = outEdge.target;
      const targetNode = flowNodes.find((n) => n.id === currentId);
      if (targetNode?.type === "end") break;
    }
    setSimulationPath(path);
    setSimulationStep(0);
    setSimulationActive(true);
    let step = 0;
    simulationIntervalRef.current = setInterval(() => {
      step++;
      if (step >= path.length) {
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
        toast({ title: "Simulation complete", description: `The call traveled through ${path.length} steps.` });
        setTimeout(() => {
          setSimulationActive(false);
          setSimulationStep(-1);
          setSimulationPath([]);
        }, 1500);
        return;
      }
      setSimulationStep(step);
    }, 1500);
  }, [flowNodes, flowEdges, validateFlowClient, toast]);

  const buildWizardFlow = useCallback(() => {
    const depts = wizardDepartments.length > 0 ? wizardDepartments : ["General"];
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const centerY = Math.max(200, depts.length * 60);
    nodes.push({ id: generateId(), type: "entry", label: "Call Arrives", position: { x: 80, y: centerY } });
    const entryId = nodes[0].id;
    if (wizardUseRouter && depts.length > 1) {
      const routerId = generateId();
      nodes.push({ id: routerId, type: "router", label: "Receptionist", position: { x: 300, y: centerY }, data: {} });
      edges.push({ id: generateEdgeId(), source: entryId, target: routerId });
      const spacing = 120;
      const startY = centerY - ((depts.length - 1) * spacing) / 2;
      const endId = generateId();
      depts.forEach((dept, i) => {
        const agentId = generateId();
        nodes.push({ id: agentId, type: "agent", label: `${dept} Team`, position: { x: 560, y: startY + i * spacing }, data: { departmentName: dept } });
        edges.push({ id: generateEdgeId(), source: routerId, target: agentId, label: `${dept} request` });
        edges.push({ id: generateEdgeId(), source: agentId, target: endId });
      });
      nodes.push({ id: endId, type: "end", label: "End Call", position: { x: 800, y: centerY } });
    } else {
      let prevId = entryId;
      const endId = generateId();
      depts.forEach((dept, i) => {
        const agentId = generateId();
        nodes.push({ id: agentId, type: "agent", label: `${dept} Team`, position: { x: 300 + i * 220, y: centerY }, data: { departmentName: dept } });
        edges.push({ id: generateEdgeId(), source: prevId, target: agentId });
        prevId = agentId;
      });
      edges.push({ id: generateEdgeId(), source: prevId, target: endId });
      nodes.push({ id: endId, type: "end", label: "End Call", position: { x: 300 + depts.length * 220, y: centerY } });
    }
    setFlowNodes(nodes);
    setFlowEdges(edges);
    setFlowName("My Call Flow");
    setActiveFlowId(null);
    setShowWizard(false);
    setWizardStep(0);
    setWizardDepartments([]);
    setWizardUseRouter(true);
    toast({ title: "Flow created", description: "Your call flow has been built. Customize it and save when ready." });
  }, [wizardDepartments, wizardUseRouter, toast]);

  const validationErrorCount = validationMessages.filter((m) => m.type === "error").length;
  const validationWarningCount = validationMessages.filter((m) => m.type === "warning").length;

  const selectedNode = flowNodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = flowEdges.find((e) => e.id === selectedEdgeId) || null;

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

        {/* ==================== TAB 1: AGENTS ==================== */}
        <TabsContent value="agents" className="mt-6 space-y-6">
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-muted-foreground" data-testid="text-agent-tip">
                  Add multiple agents to handle different departments. Create a Router agent to automatically direct calls to the right specialist.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold" data-testid="text-agents-count">
                {activeAgents.length} Agent{activeAgents.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-agent">
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </div>

          {activeAgents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground" data-testid="text-no-agents">No agents configured yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add Agent" to create your first AI agent.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeAgents.map((agent) => (
                <Card key={agent.id} className="hover-elevate cursor-pointer relative" data-testid={`card-agent-${agent.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <CardTitle className="text-base truncate">{agent.name}</CardTitle>
                        {agentTypeBadge(agent.agentType, agent.isRouter)}
                        {activeAgents.length === 1 && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); cloneAgent(agent); }} data-testid={`button-clone-agent-${agent.id}`}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Clone agent</TooltipContent>
                        </Tooltip>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); startTestChat(agent); }} data-testid={`button-test-agent-${agent.id}`}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingAgent({ ...agent }); setAgentLanguage(agent.language || "en-GB"); setAgentVoiceName(agent.voiceName || "Polly.Amy"); }} data-testid={`button-edit-agent-${agent.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(agent.id); }} data-testid={`button-delete-agent-${agent.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2" onClick={() => { setEditingAgent({ ...agent }); setAgentLanguage(agent.language || "en-GB"); setAgentVoiceName(agent.voiceName || "Polly.Amy"); }}>
                    {agent.departmentName && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Dept:</span>
                        <span className="text-xs font-medium">{agent.departmentName}</span>
                      </div>
                    )}
                    {agent.greeting && (
                      <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-agent-greeting-${agent.id}`}>
                        {agent.greeting}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-xs" data-testid={`badge-agent-status-${agent.id}`}>
                        {agent.status}
                      </Badge>
                      {agent.inboundEnabled && <Badge variant="outline" className="text-xs">Inbound</Badge>}
                      {agent.outboundEnabled && <Badge variant="outline" className="text-xs">Outbound</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeAgents.length === 1 && (
            <Card className="border-dashed">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Single agent mode</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add more agents to enable multi-department routing. Create a Router agent to distribute calls automatically.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== TAB 2: AUTOMATION FLOW ==================== */}
        <TabsContent value="flow" className="mt-6 space-y-4">
          {flowsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading flows...
            </div>
          ) : flowNodes.length === 0 && !activeFlowId ? (
            <>
              <Card>
                <CardContent className="py-10">
                  <div className="text-center space-y-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 mx-auto">
                      <Network className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl font-semibold" data-testid="text-flow-welcome-title">Design Your Call Flow</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Choose how calls are routed through your departments. Pick a template to get started, or build from scratch.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 mt-8 max-w-3xl mx-auto">
                    {FLOW_TEMPLATES.map((template) => {
                      const TemplateIcon = TEMPLATE_ICONS[template.icon] || Headphones;
                      return (
                        <Card key={template.id} className="hover-elevate cursor-pointer" data-testid={`card-template-${template.id}`}>
                          <CardContent className="pt-5 pb-4 space-y-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                              <TemplateIcon className="h-5 w-5 text-foreground" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm">{template.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                            </div>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => applyTemplate(template.id)} data-testid={`button-use-template-${template.id}`}>
                              Use This Template
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Separator className="my-6 max-w-3xl mx-auto" />

                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Button variant="outline" onClick={() => { addFlowNode("entry", 80, 200); }} data-testid="button-build-scratch">
                      <Plus className="h-4 w-4 mr-2" />
                      Build from Scratch
                    </Button>
                    <Button variant="outline" onClick={() => { setShowWizard(true); setWizardStep(0); setWizardDepartments([]); }} data-testid="button-step-wizard">
                      <Wand2 className="h-4 w-4 mr-2" />
                      Step-by-Step Setup
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {flows.length > 0 && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">Saved Flows</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-1">
                    {flows.map((f) => (
                      <Button key={f.id} variant="ghost" size="sm" className="w-full justify-start" onClick={() => loadFlow(f)} data-testid={`button-load-flow-${f.id}`}>
                        <Network className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{f.name}</span>
                        {f.isActive && <Badge variant="outline" className="ml-auto text-xs">active</Badge>}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    className="max-w-[220px]"
                    data-testid="input-flow-name"
                  />
                  {flows.length > 1 && (
                    <Select
                      value={activeFlowId?.toString() || ""}
                      onValueChange={(v) => {
                        const f = flows.find((fl) => fl.id === Number(v));
                        if (f) loadFlow(f);
                      }}
                    >
                      <SelectTrigger className="max-w-[180px]" data-testid="select-flow">
                        <SelectValue placeholder="Select flow" />
                      </SelectTrigger>
                      <SelectContent>
                        {flows.map((f) => (
                          <SelectItem key={f.id} value={f.id.toString()}>{f.name}{f.isActive ? " (active)" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Badge variant="outline" className={`text-xs ${getComplexity().color}`} data-testid="badge-flow-complexity">
                    {getComplexity().tier}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={validateFlowClient} data-testid="button-validate-flow">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Check Flow
                        {validationMessages.filter((m) => m.type === "error").length > 0 && (
                          <Badge variant="destructive" className="ml-1.5 text-xs">{validationErrorCount}</Badge>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Check your flow for issues</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={simulationActive ? stopSimulation : startSimulation} data-testid="button-simulate-flow">
                        {simulationActive ? <Square className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {simulationActive ? "Stop" : "Simulate"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Walk through a sample call</TooltipContent>
                  </Tooltip>
                  <Button variant="outline" size="sm" onClick={autoLayout} data-testid="button-auto-layout">
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Auto Layout
                  </Button>
                  <Button onClick={saveFlow} disabled={savingFlow} data-testid="button-save-flow">
                    {savingFlow ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {savingFlow ? "Saving..." : "Save Flow"}
                  </Button>
                </div>
              </div>

              {showValidation && validationMessages.length > 0 && (
                <Card>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Flow Check Results</span>
                      <Button variant="ghost" size="icon" onClick={() => setShowValidation(false)} data-testid="button-close-validation">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {validationMessages.map((msg, i) => (
                        <div key={i} className="flex items-start gap-2" data-testid={`validation-msg-${i}`}>
                          {msg.type === "error" && <XCircle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />}
                          {msg.type === "warning" && <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />}
                          {msg.type === "success" && <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />}
                          <span className="text-sm">{msg.message}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {connectingFrom && (
                <Card className="border-amber-500/50 dark:border-amber-400/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Click on the block you want to connect to</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setConnectingFrom(null)} data-testid="button-cancel-connect">Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-4">
                <div className="w-[220px] flex-shrink-0 space-y-3">
                  <Card>
                    <CardHeader className="py-3 px-3">
                      <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Building Blocks</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-1.5">
                      {(["entry", "agent", "router", "decision", "action", "end"] as const).map((type) => {
                        const info = FRIENDLY_NODE_INFO[type];
                        const NodeIcon = FRIENDLY_NODE_ICONS[info.icon] || Zap;
                        return (
                          <Tooltip key={type}>
                            <TooltipTrigger asChild>
                              <button
                                className="w-full text-left p-2 rounded-md hover-elevate flex items-start gap-2.5"
                                onClick={() => addFlowNode(type)}
                                data-testid={`button-add-node-${type}`}
                              >
                                <div className="flex h-7 w-7 items-center justify-center rounded-md flex-shrink-0 mt-0.5" style={{ backgroundColor: NODE_COLORS[type].bg }}>
                                  <NodeIcon className="h-3.5 w-3.5" style={{ color: NODE_COLORS[type].text }} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-tight">{info.label}</p>
                                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{info.description}</p>
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">{info.description}</TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {activeAgents.length > 0 && (
                    <Card>
                      <CardHeader className="py-3 px-3">
                        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Your Agents</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 space-y-1">
                        {activeAgents.map((a) => (
                          <Button
                            key={a.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => {
                              const node: FlowNode = {
                                id: generateId(),
                                type: a.isRouter ? "router" : "agent",
                                label: a.name,
                                agentId: a.id,
                                position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
                                data: { departmentName: a.departmentName || undefined },
                              };
                              setFlowNodes((prev) => [...prev, node]);
                              setSelectedNodeId(node.id);
                            }}
                            data-testid={`button-drag-agent-${a.id}`}
                          >
                            <Bot className="h-3 w-3 mr-1.5 flex-shrink-0" />
                            <span className="truncate">{a.name}</span>
                          </Button>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="py-3 px-3">
                      <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-1">
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => setShowTemplateChooser(true)} data-testid="button-use-template-sidebar">
                        <Sparkles className="h-3 w-3 mr-1.5 flex-shrink-0" />
                        Use a Template
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-destructive" onClick={() => { setFlowNodes([]); setFlowEdges([]); setSelectedNodeId(null); setSelectedEdgeId(null); setActiveFlowId(null); setShowValidation(false); }} data-testid="button-start-over">
                        <Trash2 className="h-3 w-3 mr-1.5 flex-shrink-0" />
                        Start Over
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="border rounded-lg bg-muted/30 relative" style={{ minHeight: 600 }}>
                    {simulationActive && (
                      <div className="absolute top-3 left-3 z-10">
                        <Card>
                          <CardContent className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                              </span>
                              <span className="text-xs font-medium">Simulating a call...</span>
                              {simulationStep >= 0 && simulationStep < simulationPath.length && (
                                <Badge variant="outline" className="text-xs ml-1">
                                  Step {simulationStep + 1}/{simulationPath.length}: {flowNodes.find((n) => n.id === simulationPath[simulationStep])?.label || ""}
                                </Badge>
                              )}
                              <Button variant="ghost" size="sm" onClick={stopSimulation} className="ml-1" data-testid="button-stop-simulation">
                                <Square className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    <svg
                      ref={svgRef}
                      className="w-full"
                      style={{ minHeight: 600, cursor: draggingNodeId ? "grabbing" : connectingFrom ? "crosshair" : "default" }}
                      onMouseDown={handleSvgMouseDown}
                      onMouseMove={handleSvgMouseMove}
                      onMouseUp={handleSvgMouseUp}
                      onDoubleClick={handleSvgDoubleClick}
                      data-testid="svg-flow-canvas"
                    >
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
                        </pattern>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" opacity="0.5" />
                        </marker>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />

                      {flowEdges.map((edge) => {
                        const path = getEdgePath(edge);
                        const labelPos = getEdgeLabelPos(edge);
                        const isSelected = selectedEdgeId === edge.id;
                        const isSimEdge = simulationActive && simulationPath.includes(edge.source) && simulationPath.includes(edge.target) &&
                          simulationPath.indexOf(edge.target) === simulationPath.indexOf(edge.source) + 1 &&
                          simulationStep >= simulationPath.indexOf(edge.target);
                        return (
                          <g key={edge.id}>
                            <path
                              d={path}
                              fill="none"
                              stroke={isSimEdge ? "#22c55e" : isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                              strokeWidth={isSimEdge ? 3 : isSelected ? 2.5 : 1.5}
                              strokeOpacity={isSimEdge ? 1 : isSelected ? 1 : 0.4}
                              markerEnd="url(#arrowhead)"
                              className="cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}
                              data-testid={`edge-${edge.id}`}
                            />
                            {(edge.label || edge.condition) && (
                              <text
                                x={labelPos.x}
                                y={labelPos.y}
                                textAnchor="middle"
                                fontSize="10"
                                fill="hsl(var(--muted-foreground))"
                                className="pointer-events-none select-none"
                              >
                                {edge.label || (edge.condition ? `${edge.condition.field} ${edge.condition.operator} ${edge.condition.value}` : "")}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {flowNodes.map((node) => {
                        const colors = NODE_COLORS[node.type] || NODE_COLORS.agent;
                        const isSelected = selectedNodeId === node.id;
                        const isCircle = node.type === "entry" || node.type === "end";
                        const isDiamond = node.type === "decision";
                        const isSimActive = simulationActive && simulationPath[simulationStep] === node.id;
                        const isSimVisited = simulationActive && simulationPath.indexOf(node.id) !== -1 && simulationPath.indexOf(node.id) <= simulationStep;
                        const friendlyInfo = FRIENDLY_NODE_INFO[node.type];
                        const subtitleText = node.data?.departmentName || node.data?.actionType || (friendlyInfo ? friendlyInfo.label.split(" ")[0] : "");

                        return (
                          <g
                            key={node.id}
                            onMouseDown={(e) => handleNodeMouseDown(e as any, node.id)}
                            className="cursor-grab"
                            data-testid={`node-${node.id}`}
                          >
                            {isSimActive && (
                              <circle
                                cx={isCircle ? node.position.x + NODE_HEIGHT / 2 : node.position.x + NODE_WIDTH / 2}
                                cy={node.position.y + NODE_HEIGHT / 2}
                                r={isCircle ? NODE_HEIGHT / 2 + 8 : NODE_WIDTH / 2 + 4}
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth={2}
                                opacity={0.6}
                              >
                                <animate attributeName="r" values={`${isCircle ? NODE_HEIGHT / 2 + 4 : NODE_WIDTH / 2};${isCircle ? NODE_HEIGHT / 2 + 12 : NODE_WIDTH / 2 + 8};${isCircle ? NODE_HEIGHT / 2 + 4 : NODE_WIDTH / 2}`} dur="1.5s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
                              </circle>
                            )}

                            {isCircle ? (
                              <circle
                                cx={node.position.x + NODE_HEIGHT / 2}
                                cy={node.position.y + NODE_HEIGHT / 2}
                                r={NODE_HEIGHT / 2 - 2}
                                fill={isSimVisited ? "#16a34a" : colors.bg}
                                stroke={isSelected ? "hsl(var(--primary))" : isSimActive ? "#22c55e" : colors.border}
                                strokeWidth={isSelected ? 3 : isSimActive ? 3 : 1.5}
                              />
                            ) : isDiamond ? (
                              <polygon
                                points={`${node.position.x + NODE_WIDTH / 2},${node.position.y} ${node.position.x + NODE_WIDTH},${node.position.y + NODE_HEIGHT / 2} ${node.position.x + NODE_WIDTH / 2},${node.position.y + NODE_HEIGHT} ${node.position.x},${node.position.y + NODE_HEIGHT / 2}`}
                                fill={isSimVisited ? "#16a34a" : colors.bg}
                                stroke={isSelected ? "hsl(var(--primary))" : isSimActive ? "#22c55e" : colors.border}
                                strokeWidth={isSelected ? 3 : isSimActive ? 3 : 1.5}
                              />
                            ) : node.type === "router" ? (
                              <polygon
                                points={`${node.position.x + 20},${node.position.y} ${node.position.x + NODE_WIDTH - 20},${node.position.y} ${node.position.x + NODE_WIDTH},${node.position.y + NODE_HEIGHT / 2} ${node.position.x + NODE_WIDTH - 20},${node.position.y + NODE_HEIGHT} ${node.position.x + 20},${node.position.y + NODE_HEIGHT} ${node.position.x},${node.position.y + NODE_HEIGHT / 2}`}
                                fill={isSimVisited ? "#16a34a" : colors.bg}
                                stroke={isSelected ? "hsl(var(--primary))" : isSimActive ? "#22c55e" : colors.border}
                                strokeWidth={isSelected ? 3 : isSimActive ? 3 : 1.5}
                              />
                            ) : (
                              <rect
                                x={node.position.x}
                                y={node.position.y}
                                width={NODE_WIDTH}
                                height={NODE_HEIGHT}
                                rx={8}
                                ry={8}
                                fill={isSimVisited ? "#16a34a" : colors.bg}
                                stroke={isSelected ? "hsl(var(--primary))" : isSimActive ? "#22c55e" : colors.border}
                                strokeWidth={isSelected ? 3 : isSimActive ? 3 : 1.5}
                              />
                            )}

                            <text
                              x={isCircle ? node.position.x + NODE_HEIGHT / 2 : node.position.x + NODE_WIDTH / 2}
                              y={node.position.y + NODE_HEIGHT / 2 - (subtitleText ? 6 : 0)}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill={colors.text}
                              fontSize="12"
                              fontWeight="600"
                              className="pointer-events-none select-none"
                            >
                              {node.label.length > 18 ? node.label.substring(0, 16) + ".." : node.label}
                            </text>
                            {subtitleText && (
                              <text
                                x={isCircle ? node.position.x + NODE_HEIGHT / 2 : node.position.x + NODE_WIDTH / 2}
                                y={node.position.y + NODE_HEIGHT / 2 + 12}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={colors.text}
                                fontSize="9"
                                opacity={0.75}
                                className="pointer-events-none select-none"
                              >
                                {subtitleText.length > 20 ? subtitleText.substring(0, 18) + ".." : subtitleText}
                              </text>
                            )}

                            {node.type !== "end" && (
                              <circle
                                cx={isCircle ? node.position.x + NODE_HEIGHT - 2 : node.position.x + NODE_WIDTH}
                                cy={node.position.y + NODE_HEIGHT / 2}
                                r={PORT_RADIUS}
                                fill={connectingFrom === node.id ? "hsl(var(--primary))" : "hsl(var(--background))"}
                                stroke={connectingFrom === node.id ? "hsl(var(--primary))" : colors.border}
                                strokeWidth={2}
                                className="cursor-pointer"
                                onClick={(e) => handlePortClick(e as any, node.id)}
                                data-testid={`port-out-${node.id}`}
                              />
                            )}

                            {node.type !== "entry" && (
                              <circle
                                cx={isCircle ? node.position.x + 2 : node.position.x}
                                cy={node.position.y + NODE_HEIGHT / 2}
                                r={PORT_RADIUS}
                                fill="hsl(var(--background))"
                                stroke={colors.border}
                                strokeWidth={2}
                                className="cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); if (connectingFrom && connectingFrom !== node.id) { setFlowEdges((prev) => [...prev, { id: generateEdgeId(), source: connectingFrom, target: node.id }]); setConnectingFrom(null); } }}
                                data-testid={`port-in-${node.id}`}
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {(selectedNode || selectedEdge) && (
                  <div className="w-[250px] flex-shrink-0">
                    <Card>
                      <CardHeader className="py-3 px-3">
                        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                          {selectedNode ? "Block Settings" : "Connection Settings"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 space-y-3">
                        {selectedNode && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">What should this be called?</Label>
                              <Input
                                value={selectedNode.label}
                                onChange={(e) => updateFlowNode(selectedNode.id, { label: e.target.value })}
                                data-testid="input-node-label"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Block type</Label>
                              <p className="text-sm">{FRIENDLY_NODE_INFO[selectedNode.type]?.label || selectedNode.type}</p>
                              <p className="text-[11px] text-muted-foreground">{FRIENDLY_NODE_INFO[selectedNode.type]?.description}</p>
                            </div>

                            {(selectedNode.type === "agent" || selectedNode.type === "router") && (
                              <div className="space-y-1">
                                <Label className="text-xs">Which agent handles this?</Label>
                                <Select
                                  value={selectedNode.agentId?.toString() || ""}
                                  onValueChange={(v) => {
                                    const ag = activeAgents.find((a) => a.id === Number(v));
                                    updateFlowNode(selectedNode.id, {
                                      agentId: Number(v),
                                      label: ag?.name || selectedNode.label,
                                      data: { ...selectedNode.data, departmentName: ag?.departmentName || undefined },
                                    });
                                  }}
                                >
                                  <SelectTrigger data-testid="select-node-agent">
                                    <SelectValue placeholder="Select agent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {activeAgents.map((a) => (
                                      <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {selectedNode.type === "decision" && (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs">What to check</Label>
                                  <Select
                                    value={selectedNode.data?.conditionField || "intent"}
                                    onValueChange={(v) => updateFlowNode(selectedNode.id, { data: { ...selectedNode.data, conditionField: v } })}
                                  >
                                    <SelectTrigger data-testid="select-decision-field">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="intent">Caller's Intent</SelectItem>
                                      <SelectItem value="callerInput">What the Caller Said</SelectItem>
                                      <SelectItem value="sentiment">Caller's Mood</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">How to compare</Label>
                                  <Select
                                    value={selectedNode.data?.conditionOperator || "equals"}
                                    onValueChange={(v) => updateFlowNode(selectedNode.id, { data: { ...selectedNode.data, conditionOperator: v } })}
                                  >
                                    <SelectTrigger data-testid="select-decision-operator">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="equals">Exactly matches</SelectItem>
                                      <SelectItem value="contains">Contains the word</SelectItem>
                                      <SelectItem value="starts_with">Starts with</SelectItem>
                                      <SelectItem value="intent_is">Intent is</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Match this value</Label>
                                  <Input
                                    value={selectedNode.data?.conditionValue || ""}
                                    onChange={(e) => updateFlowNode(selectedNode.id, { data: { ...selectedNode.data, conditionValue: e.target.value } })}
                                    placeholder="e.g., sales"
                                    data-testid="input-decision-value"
                                  />
                                </div>
                              </>
                            )}

                            {selectedNode.type === "action" && (
                              <div className="space-y-1">
                                <Label className="text-xs">What to do</Label>
                                <Select
                                  value={selectedNode.data?.actionType || "transfer"}
                                  onValueChange={(v) => updateFlowNode(selectedNode.id, { data: { ...selectedNode.data, actionType: v as any } })}
                                >
                                  <SelectTrigger data-testid="select-action-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="transfer">Transfer to Human</SelectItem>
                                    <SelectItem value="voicemail">Send to Voicemail</SelectItem>
                                    <SelectItem value="webhook">Trigger a Webhook</SelectItem>
                                    <SelectItem value="hangup">Hang Up</SelectItem>
                                    <SelectItem value="hold">Put on Hold</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <Separator />
                            <Button variant="destructive" size="sm" className="w-full" onClick={deleteSelectedNode} data-testid="button-delete-node">
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete Block
                            </Button>
                          </>
                        )}

                        {selectedEdge && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">Connection label</Label>
                              <Input
                                value={selectedEdge.label || ""}
                                onChange={(e) => setFlowEdges((prev) => prev.map((ed) => ed.id === selectedEdge.id ? { ...ed, label: e.target.value } : ed))}
                                placeholder="e.g., Support request"
                                data-testid="input-edge-label"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Route based on</Label>
                              <Select
                                value={selectedEdge.condition?.field || ""}
                                onValueChange={(v) => setFlowEdges((prev) => prev.map((ed) => ed.id === selectedEdge.id ? { ...ed, condition: { ...ed.condition || { operator: "equals" as const, value: "" }, field: v } } : ed))}
                              >
                                <SelectTrigger data-testid="select-edge-field">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="intent">Caller's Intent</SelectItem>
                                  <SelectItem value="callerInput">What the Caller Said</SelectItem>
                                  <SelectItem value="sentiment">Caller's Mood</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {selectedEdge.condition?.field && (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs">How to compare</Label>
                                  <Select
                                    value={selectedEdge.condition?.operator || "equals"}
                                    onValueChange={(v) => setFlowEdges((prev) => prev.map((ed) => ed.id === selectedEdge.id ? { ...ed, condition: { ...ed.condition!, operator: v as any } } : ed))}
                                  >
                                    <SelectTrigger data-testid="select-edge-operator">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="equals">Exactly matches</SelectItem>
                                      <SelectItem value="contains">Contains the word</SelectItem>
                                      <SelectItem value="starts_with">Starts with</SelectItem>
                                      <SelectItem value="intent_is">Intent is</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Match this value</Label>
                                  <Input
                                    value={selectedEdge.condition?.value || ""}
                                    onChange={(e) => setFlowEdges((prev) => prev.map((ed) => ed.id === selectedEdge.id ? { ...ed, condition: { ...ed.condition!, value: e.target.value } } : ed))}
                                    placeholder="e.g., sales"
                                    data-testid="input-edge-value"
                                  />
                                </div>
                              </>
                            )}
                            <Separator />
                            <Button variant="destructive" size="sm" className="w-full" onClick={deleteSelectedNode} data-testid="button-delete-edge">
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete Connection
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}

          <Dialog open={showWizard} onOpenChange={setShowWizard}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{wizardStep === 0 ? "What departments does your business have?" : "How should calls be handled?"}</DialogTitle>
                <DialogDescription>
                  {wizardStep === 0 ? "Select the teams that handle your calls. You can always add more later." : "Choose how incoming calls get directed to your teams."}
                </DialogDescription>
              </DialogHeader>
              {wizardStep === 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {["Sales", "Support", "Billing", "Technical", "General", "HR"].map((dept) => (
                      <Button
                        key={dept}
                        variant={wizardDepartments.includes(dept) ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setWizardDepartments((prev) => prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept])}
                        data-testid={`button-wizard-dept-${dept.toLowerCase()}`}
                      >
                        {wizardDepartments.includes(dept) && <Check className="h-3 w-3 mr-1.5" />}
                        {dept}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={wizardCustomDept}
                      onChange={(e) => setWizardCustomDept(e.target.value)}
                      placeholder="Add custom department..."
                      className="flex-1"
                      data-testid="input-wizard-custom-dept"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && wizardCustomDept.trim()) {
                          setWizardDepartments((prev) => [...prev, wizardCustomDept.trim()]);
                          setWizardCustomDept("");
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" disabled={!wizardCustomDept.trim()} onClick={() => { setWizardDepartments((prev) => [...prev, wizardCustomDept.trim()]); setWizardCustomDept(""); }} data-testid="button-wizard-add-custom">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {wizardDepartments.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {wizardDepartments.map((d) => (
                        <Badge key={d} variant="secondary" className="text-xs cursor-pointer" onClick={() => setWizardDepartments((prev) => prev.filter((x) => x !== d))}>
                          {d}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    className={`w-full text-left p-4 rounded-md border ${wizardUseRouter ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => setWizardUseRouter(true)}
                    data-testid="button-wizard-auto-route"
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium text-sm">Auto-route calls to the right team</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">A virtual receptionist listens to the caller and sends them to the correct department. Recommended for most businesses.</p>
                  </button>
                  <button
                    className={`w-full text-left p-4 rounded-md border ${!wizardUseRouter ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => setWizardUseRouter(false)}
                    data-testid="button-wizard-direct"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium text-sm">Send all calls to one team first</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">Calls go to the first team, which can then pass them along. Good for simple setups.</p>
                  </button>
                </div>
              )}
              <DialogFooter>
                {wizardStep > 0 && (
                  <Button variant="outline" onClick={() => setWizardStep(0)} data-testid="button-wizard-back">Back</Button>
                )}
                {wizardStep === 0 ? (
                  <Button onClick={() => setWizardStep(1)} disabled={wizardDepartments.length === 0} data-testid="button-wizard-next">Next</Button>
                ) : (
                  <Button onClick={buildWizardFlow} data-testid="button-wizard-build">Build My Flow</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showTemplateChooser} onOpenChange={setShowTemplateChooser}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Choose a Template</DialogTitle>
                <DialogDescription>Pick a pre-built call flow. This will replace your current flow.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-3">
                {FLOW_TEMPLATES.map((template) => {
                  const TemplateIcon = TEMPLATE_ICONS[template.icon] || Headphones;
                  return (
                    <Card key={template.id} className="hover-elevate cursor-pointer" onClick={() => applyTemplate(template.id)} data-testid={`dialog-template-${template.id}`}>
                      <CardContent className="pt-4 pb-3 space-y-2">
                        <TemplateIcon className="h-5 w-5 text-foreground" />
                        <h3 className="font-medium text-sm">{template.name}</h3>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ==================== TAB 3: KNOWLEDGE BASE ==================== */}
        <TabsContent value="knowledge" className="mt-6 space-y-6">
          {ragStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-doc-count">{ragStats.totalDocuments}</p>
                      <p className="text-xs text-muted-foreground">Documents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                      <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-chunk-count">{ragStats.totalChunks}</p>
                      <p className="text-xs text-muted-foreground">Chunks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                      <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-cache-entries">{ragStats.cacheEntries}</p>
                      <p className="text-xs text-muted-foreground">Cached</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                      <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-cache-hit-rate">{ragStats.cacheHitRate}%</p>
                      <p className="text-xs text-muted-foreground">Hit Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950">
                  <BookOpen className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
                </div>
                <div>
                  <CardTitle>Knowledge Base</CardTitle>
                  <CardDescription>Add documents to train your AI agent. The system automatically chunks text, generates embeddings, and uses them to provide more accurate responses.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {loadingKnowledge ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : knowledgeDocs.length > 0 ? (
                <div className="space-y-3">
                  {knowledgeDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-4 border rounded-md bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {doc.sourceType === "audio_url" ? (
                          <Volume2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge
                              variant={doc.status === "ready" ? "default" : doc.status === "processing" || doc.status === "transcribing" ? "secondary" : doc.status === "error" ? "destructive" : "outline"}
                              className="text-xs"
                              data-testid={`badge-doc-status-${doc.id}`}
                            >
                              {(doc.status === "processing" || doc.status === "transcribing") && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              {doc.status}
                            </Badge>
                            {doc.sourceType === "audio_url" && (
                              <Badge variant="outline" className="text-xs">
                                <Volume2 className="h-3 w-3 mr-1" />
                                audio
                              </Badge>
                            )}
                            {doc.chunkCount > 0 && (
                              <span className="text-xs text-muted-foreground">{doc.chunkCount} chunks</span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteDocument(doc.id)} data-testid={`button-delete-doc-${doc.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm" data-testid="text-no-docs">No documents in your knowledge base yet.</p>
                  <p className="text-xs mt-1">Add documents below to improve your AI agent's responses.</p>
                </div>
              )}

              <Separator />

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="font-medium text-sm">Add to Knowledge Base</h3>
                  <div className="flex gap-1">
                    <Button
                      variant={knowledgeInputMode === "text" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setKnowledgeInputMode("text")}
                      data-testid="button-mode-text"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Text
                    </Button>
                    <Button
                      variant={knowledgeInputMode === "audio" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setKnowledgeInputMode("audio")}
                      data-testid="button-mode-audio"
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      Audio URL
                    </Button>
                  </div>
                </div>

                {knowledgeInputMode === "text" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="docTitle" className="font-medium">Document Title</Label>
                      <Input
                        id="docTitle"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder="e.g., Product Catalog, Company Policies"
                        data-testid="input-doc-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="docContent" className="font-medium">Content</Label>
                      <Textarea
                        id="docContent"
                        value={newDocContent}
                        onChange={(e) => setNewDocContent(e.target.value)}
                        rows={6}
                        placeholder="Paste your document content here. The system will automatically split it into chunks and generate vector embeddings for intelligent retrieval..."
                        data-testid="textarea-doc-content"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={uploadDocument}
                      disabled={!newDocTitle.trim() || !newDocContent.trim() || uploadingDoc}
                      data-testid="button-add-doc"
                    >
                      {uploadingDoc ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                      {uploadingDoc ? "Uploading..." : "Add Document"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="audioUrls" className="font-medium">Audio URLs</Label>
                      <Textarea
                        id="audioUrls"
                        value={audioUrls}
                        onChange={(e) => setAudioUrls(e.target.value)}
                        rows={5}
                        placeholder={"Paste audio file URLs, one per line (max 10).\nSupported: MP3, WAV, MP4, M4A, WebM, OGG\n\nhttps://storage.example.com/call-recording-01.mp3\nhttps://s3.amazonaws.com/bucket/meeting-notes.wav"}
                        data-testid="textarea-audio-urls"
                      />
                      <p className="text-xs text-muted-foreground">
                        Audio files are fetched from your storage, transcribed using AI, then processed into the knowledge base. Max 100MB per file.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={importAudioUrls}
                      disabled={!audioUrls.trim() || importingAudio}
                      data-testid="button-import-audio"
                    >
                      {importingAudio ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link className="h-4 w-4 mr-1" />}
                      {importingAudio ? "Importing & Transcribing..." : "Import Audio"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== ADD AGENT DIALOG ==================== */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
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
                    onClick={() => createFromTemplate(tmpl)}
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
                        {voice.name} ({voice.gender})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-add">Cancel</Button>
            <Button onClick={createAgent} disabled={!newAgentForm.name.trim() || savingAgent} data-testid="button-confirm-add">
              {savingAgent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {savingAgent ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT AGENT DIALOG ==================== */}
      <Dialog open={!!editingAgent} onOpenChange={(v) => { if (!v) setEditingAgent(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Agent: {editingAgent?.name}</DialogTitle>
            <DialogDescription>Configure all settings for this agent.</DialogDescription>
          </DialogHeader>
          {editingAgent && (
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
                  <Input value={editingAgent.name} onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })} data-testid="input-edit-agent-name" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Agent Type</Label>
                  <Select value={editingAgent.agentType} onValueChange={(v) => setEditingAgent({ ...editingAgent, agentType: v, isRouter: v === "router" })}>
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
                {(editingAgent.agentType === "department" || editingAgent.agentType === "specialist") && (
                  <div className="space-y-2">
                    <Label className="font-medium">Department Name</Label>
                    <Input value={editingAgent.departmentName || ""} onChange={(e) => setEditingAgent({ ...editingAgent, departmentName: e.target.value || null })} data-testid="input-edit-department" />
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
                  <Textarea value={editingAgent.greeting} onChange={(e) => setEditingAgent({ ...editingAgent, greeting: e.target.value })} rows={3} data-testid="textarea-edit-greeting" />
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
                          onClick={() => generateGreeting(editingAgent)}
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
                                setEditingAgent({ ...editingAgent, greeting: aiGreetingPreview });
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
                              onClick={() => generateGreeting(editingAgent)}
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
                  <Textarea value={editingAgent.businessDescription} onChange={(e) => setEditingAgent({ ...editingAgent, businessDescription: e.target.value })} rows={3} data-testid="textarea-edit-business" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">System Prompt</Label>
                  <Textarea value={editingAgent.systemPrompt || ""} onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value || null })} rows={3} placeholder="Custom instructions for this agent..." data-testid="textarea-edit-prompt" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Voice Preference</Label>
                  <Select value={editingAgent.voicePreference} onValueChange={(v) => setEditingAgent({ ...editingAgent, voicePreference: v })}>
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
                  <Switch checked={editingAgent.inboundEnabled} onCheckedChange={(v) => setEditingAgent({ ...editingAgent, inboundEnabled: v })} data-testid="switch-edit-inbound" />
                </div>
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Outbound Calls</Label>
                    <p className="text-xs text-muted-foreground">Allow AI to make outgoing calls</p>
                  </div>
                  <Switch checked={editingAgent.outboundEnabled} onCheckedChange={(v) => setEditingAgent({ ...editingAgent, outboundEnabled: v })} data-testid="switch-edit-outbound" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Agent Role</Label>
                  <Select value={editingAgent.roles} onValueChange={(v) => setEditingAgent({ ...editingAgent, roles: v })}>
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
                  <Switch checked={editingAgent.complianceDisclosure} onCheckedChange={(v) => setEditingAgent({ ...editingAgent, complianceDisclosure: v })} data-testid="switch-edit-compliance" />
                </div>
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Router Agent</Label>
                    <p className="text-xs text-muted-foreground">Entry point that routes calls to specialists</p>
                  </div>
                  <Switch checked={editingAgent.isRouter} onCheckedChange={(v) => setEditingAgent({ ...editingAgent, isRouter: v, agentType: v ? "router" : editingAgent.agentType })} data-testid="switch-edit-router" />
                </div>
              </TabsContent>

              <TabsContent value="faq" className="mt-4 space-y-4">
                {editingAgent.faqEntries.length > 0 && (
                  <div className="space-y-3">
                    {editingAgent.faqEntries.map((entry, index) => (
                      <div key={index} className="border rounded-md p-3 space-y-2 bg-muted/30">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium" data-testid={`text-edit-faq-q-${index}`}>{entry.question}</p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-edit-faq-a-${index}`}>{entry.answer}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => {
                            const updated = editingAgent.faqEntries.filter((_, i) => i !== index);
                            setEditingAgent({ ...editingAgent, faqEntries: updated });
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
                  onAdd={(q, a) => setEditingAgent({ ...editingAgent, faqEntries: [...editingAgent.faqEntries, { question: q, answer: a }] })}
                  onGenerateAnswer={(question) => generateFaqAnswer(editingAgent, question)}
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
                  <Input value={editingAgent.handoffNumber} onChange={(e) => setEditingAgent({ ...editingAgent, handoffNumber: e.target.value })} placeholder="+1 (555) 123-4567" data-testid="input-edit-handoff" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Handoff Trigger</Label>
                  <Select value={editingAgent.handoffTrigger} onValueChange={(v) => setEditingAgent({ ...editingAgent, handoffTrigger: v })}>
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
                  <Switch checked={editingAgent.negotiationEnabled} onCheckedChange={(v) => setEditingAgent({ ...editingAgent, negotiationEnabled: v })} data-testid="switch-edit-negotiation" />
                </div>
                {editingAgent.negotiationEnabled && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="font-medium">Min Price ($)</Label>
                      <Input type="number" value={editingAgent.negotiationGuardrails?.minPrice ?? ""} onChange={(e) => setEditingAgent({ ...editingAgent, negotiationGuardrails: { ...editingAgent.negotiationGuardrails, minPrice: parseFloat(e.target.value) || 0 } })} data-testid="input-edit-min-price" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-medium">Max Price ($)</Label>
                      <Input type="number" value={editingAgent.negotiationGuardrails?.maxPrice ?? ""} onChange={(e) => setEditingAgent({ ...editingAgent, negotiationGuardrails: { ...editingAgent.negotiationGuardrails, maxPrice: parseFloat(e.target.value) || 0 } })} data-testid="input-edit-max-price" />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAgent(null)} data-testid="button-cancel-edit">Cancel</Button>
            <Button onClick={() => editingAgent && updateAgent(editingAgent)} disabled={savingAgent} data-testid="button-save-edit">
              {savingAgent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {savingAgent ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE CONFIRM DIALOG ==================== */}
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
      <Dialog open={!!testChatAgent} onOpenChange={(open) => { if (!open) setTestChatAgent(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Test Chat: {testChatAgent?.name}
            </DialogTitle>
            <DialogDescription>
              Simulate a conversation with this agent. Messages are not saved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[400px] space-y-3 p-3 rounded-md border bg-muted/30" data-testid="test-chat-messages">
            {testChatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                <MessageSquare className="h-8 w-8 opacity-40" />
                <p>Send a message to start the conversation</p>
                {testChatAgent?.greeting && (
                  <p className="text-xs italic text-center max-w-xs">Agent greeting: &ldquo;{testChatAgent.greeting}&rdquo;</p>
                )}
              </div>
            )}
            {testChatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  }`}
                  data-testid={`test-chat-msg-${i}`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {testChatSending && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg px-3 py-2 bg-card border text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Input
              value={testChatInput}
              onChange={(e) => setTestChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTestMessage(); } }}
              placeholder="Type a message..."
              disabled={testChatSending}
              data-testid="input-test-chat"
            />
            <Button
              size="icon"
              onClick={sendTestMessage}
              disabled={!testChatInput.trim() || testChatSending}
              data-testid="button-send-test-chat"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter className="flex-row justify-between gap-2">
            <Button variant="outline" onClick={() => { setTestChatMessages([]); }} disabled={testChatMessages.length === 0} data-testid="button-clear-test-chat">
              Clear Chat
            </Button>
            <Button variant="outline" onClick={() => setTestChatAgent(null)} data-testid="button-close-test-chat">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
