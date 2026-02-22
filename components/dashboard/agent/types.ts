import {
  Briefcase, CalendarCheck, Wrench,
  PhoneIncoming, GitBranch, Users, HelpCircle, Zap, PhoneOff,
  Headphones, TrendingUp, LifeBuoy,
} from "lucide-react";

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface AgentRecord {
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

export interface FlowNode {
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

export interface FlowEdge {
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

export interface FlowRecord {
  id: number;
  name: string;
  description: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  entryAgentId: number | null;
  isActive: boolean;
  version: number;
}

export interface KnowledgeDoc {
  id: number;
  title: string;
  sourceType: string;
  status: string;
  chunkCount: number;
  createdAt: string;
}

export interface RAGStats {
  totalDocuments: number;
  totalChunks: number;
  processedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  cacheEntries: number;
  cacheHitRate: number;
}

export function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateEdgeId(): string {
  return `edge_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  entry: { bg: "#22c55e", border: "#16a34a", text: "#ffffff" },
  agent: { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },
  router: { bg: "#f97316", border: "#ea580c", text: "#ffffff" },
  decision: { bg: "#eab308", border: "#ca8a04", text: "#1a1a1a" },
  action: { bg: "#a855f7", border: "#9333ea", text: "#ffffff" },
  end: { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
};

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 70;
export const PORT_RADIUS = 6;

export const FRIENDLY_NODE_INFO: Record<string, { label: string; description: string; icon: string }> = {
  entry: { label: "When a Call Arrives", description: "Starting point - every call begins here", icon: "PhoneIncoming" },
  router: { label: "Receptionist (Auto-Route)", description: "Listens to the caller and sends them to the right team", icon: "GitBranch" },
  agent: { label: "Department / Team", description: "A team that handles calls (e.g. Sales, Support)", icon: "Users" },
  decision: { label: "Check a Condition", description: "Route the call based on what the caller says or needs", icon: "HelpCircle" },
  action: { label: "Take an Action", description: "Do something specific: transfer, voicemail, webhook", icon: "Zap" },
  end: { label: "End Call", description: "The call ends here - wrap up and goodbye", icon: "PhoneOff" },
};

export const FRIENDLY_NODE_ICONS: Record<string, any> = {
  PhoneIncoming, GitBranch, Users, HelpCircle, Zap, PhoneOff,
};

export const FLOW_TEMPLATES = [
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

export const TEMPLATE_ICONS: Record<string, any> = { Headphones, TrendingUp, LifeBuoy };

export const AGENT_TEMPLATES = [
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
