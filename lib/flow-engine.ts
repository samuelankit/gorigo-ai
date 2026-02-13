import { db } from "@/lib/db";
import { agentFlows, agents, callHops } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { deductFromWallet } from "@/lib/wallet";

export interface FlowNode {
  id: string;
  type: "agent" | "router" | "decision" | "action" | "entry" | "end";
  label: string;
  agentId?: number;
  position: { x: number; y: number };
  data?: {
    actionType?: "transfer" | "voicemail" | "webhook" | "hangup" | "hold";
    webhookUrl?: string;
    transferNumber?: string;
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

export interface FlowDiagram {
  nodes: FlowNode[];
  edges: FlowEdge[];
  entryAgentId?: number;
}

export interface HopResult {
  fromAgentId: number | null;
  toAgentId: number;
  reason: string;
  hopCost: number;
}

export async function getActiveFlow(orgId: number): Promise<FlowDiagram | null> {
  const [flow] = await db
    .select()
    .from(agentFlows)
    .where(and(eq(agentFlows.orgId, orgId), eq(agentFlows.isActive, true)))
    .limit(1);

  if (!flow) return null;

  return {
    nodes: (flow.nodes as FlowNode[]) || [],
    edges: (flow.edges as FlowEdge[]) || [],
    entryAgentId: flow.entryAgentId ?? undefined,
  };
}

export function findEntryNode(flow: FlowDiagram): FlowNode | null {
  const entryNode = flow.nodes.find((n) => n.type === "entry");
  if (entryNode) return entryNode;

  if (flow.entryAgentId) {
    return flow.nodes.find((n) => n.agentId === flow.entryAgentId) || null;
  }

  const routerNode = flow.nodes.find((n) => n.type === "router");
  if (routerNode) return routerNode;

  return flow.nodes.find((n) => n.type === "agent") || null;
}

export function resolveNextNode(
  flow: FlowDiagram,
  currentNodeId: string,
  context: { intent?: string; callerInput?: string; sentiment?: string }
): FlowNode | null {
  const outgoingEdges = flow.edges.filter((e) => e.source === currentNodeId);

  if (outgoingEdges.length === 0) return null;

  if (outgoingEdges.length === 1) {
    return flow.nodes.find((n) => n.id === outgoingEdges[0].target) || null;
  }

  for (const edge of outgoingEdges) {
    if (edge.condition) {
      const { field, operator, value } = edge.condition;
      const contextValue = context[field as keyof typeof context] || "";

      let matches = false;
      switch (operator) {
        case "equals":
          matches = contextValue.toLowerCase() === value.toLowerCase();
          break;
        case "contains":
          matches = contextValue.toLowerCase().includes(value.toLowerCase());
          break;
        case "starts_with":
          matches = contextValue.toLowerCase().startsWith(value.toLowerCase());
          break;
        case "intent_is":
          matches = contextValue.toLowerCase() === value.toLowerCase();
          break;
      }

      if (matches) {
        return flow.nodes.find((n) => n.id === edge.target) || null;
      }
    }
  }

  const defaultEdge = outgoingEdges.find((e) => !e.condition || e.label === "default");
  if (defaultEdge) {
    return flow.nodes.find((n) => n.id === defaultEdge.target) || null;
  }

  return flow.nodes.find((n) => n.id === outgoingEdges[0].target) || null;
}

export function validateFlow(flow: FlowDiagram): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (flow.nodes.length === 0) {
    errors.push("Flow must have at least one node");
    return { valid: false, errors };
  }

  const entryNode = findEntryNode(flow);
  if (!entryNode) {
    errors.push("Flow must have an entry point");
  }

  const agentNodes = flow.nodes.filter((n) => n.type === "agent" || n.type === "router");
  if (agentNodes.length === 0) {
    errors.push("Flow must have at least one agent node");
  }

  const nodeIds = new Set(flow.nodes.map((n) => n.id));
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references non-existent source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references non-existent target node: ${edge.target}`);
    }
  }

  const agentNodesWithoutAgentId = agentNodes.filter((n) => !n.agentId);
  if (agentNodesWithoutAgentId.length > 0) {
    errors.push(`${agentNodesWithoutAgentId.length} agent node(s) missing agent assignment`);
  }

  const cycles = detectCycles(flow);
  if (cycles.length > 0) {
    errors.push(`Flow contains circular routes: ${cycles.join(", ")}. This would cause infinite loops during call routing.`);
  }

  return { valid: errors.length === 0, errors };
}

function detectCycles(flow: FlowDiagram): string[] {
  const adjacency = new Map<string, string[]>();
  for (const node of flow.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of flow.edges) {
    const neighbors = adjacency.get(edge.source);
    if (neighbors) neighbors.push(edge.target);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[] = [];

  function dfs(nodeId: string, path: string[]): boolean {
    if (inStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cyclePath = path.slice(cycleStart).concat(nodeId);
      const labels = cyclePath.map(id => {
        const n = flow.nodes.find(node => node.id === id);
        return n?.label || id;
      });
      cycles.push(labels.join(" -> "));
      return true;
    }
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adjacency.get(nodeId) || []) {
      dfs(neighbor, [...path, nodeId]);
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of flow.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  }

  return cycles;
}

export async function recordCallHop(
  callLogId: number,
  orgId: number,
  fromAgentId: number | null,
  toAgentId: number,
  hopOrder: number,
  reason: string,
  hopCost: number = 0
) {
  const [hop] = await db
    .insert(callHops)
    .values({
      callLogId,
      orgId,
      fromAgentId,
      toAgentId,
      hopOrder,
      reason,
      hopCost: String(hopCost),
      status: "completed",
    })
    .returning();

  if (hopCost > 0) {
    await deductFromWallet(
      orgId,
      hopCost,
      `Agent hop #${hopOrder}: ${reason}`,
      "call",
      `hop_${hop.id}`
    );
  }

  return hop;
}

export async function getCallHops(callLogId: number) {
  return db
    .select()
    .from(callHops)
    .where(eq(callHops.callLogId, callLogId));
}

export async function getOrgAgentCount(orgId: number): Promise<number> {
  const orgAgents = await db
    .select()
    .from(agents)
    .where(and(eq(agents.orgId, orgId)));

  return orgAgents.filter((a) => a.status !== "deleted").length;
}

export function calculateFlowComplexity(flow: FlowDiagram): {
  nodeCount: number;
  edgeCount: number;
  agentCount: number;
  decisionCount: number;
  complexityTier: "simple" | "standard" | "complex" | "enterprise";
  multiplier: number;
} {
  const nodeCount = flow.nodes.length;
  const edgeCount = flow.edges.length;
  const agentCount = flow.nodes.filter((n) => n.type === "agent" || n.type === "router").length;
  const decisionCount = flow.nodes.filter((n) => n.type === "decision").length;

  let complexityTier: "simple" | "standard" | "complex" | "enterprise" = "simple";
  let multiplier = 1.0;

  if (agentCount <= 1 && decisionCount === 0) {
    complexityTier = "simple";
    multiplier = 1.0;
  } else if (agentCount <= 3 && decisionCount <= 2) {
    complexityTier = "standard";
    multiplier = 1.2;
  } else if (agentCount <= 6 && decisionCount <= 5) {
    complexityTier = "complex";
    multiplier = 1.5;
  } else {
    complexityTier = "enterprise";
    multiplier = 2.0;
  }

  return { nodeCount, edgeCount, agentCount, decisionCount, complexityTier, multiplier };
}
