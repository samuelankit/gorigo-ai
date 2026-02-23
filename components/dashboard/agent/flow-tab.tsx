"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useToast } from "@/lib/use-toast";
import {
  Plus, Trash2, Check, X, Bot, Loader2, Zap, Network, Save, LayoutGrid,
  Square, ArrowRight, Sparkles, Eye, Wand2,
  GitBranch, Headphones,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import type { AgentRecord, FlowNode, FlowEdge, FlowRecord } from "./types";
import {
  generateId, generateEdgeId,
  NODE_COLORS, NODE_WIDTH, NODE_HEIGHT, PORT_RADIUS,
  FRIENDLY_NODE_INFO, FRIENDLY_NODE_ICONS,
  FLOW_TEMPLATES, TEMPLATE_ICONS,
} from "./types";
import { useFlows, useSaveFlow } from "@/hooks/use-flows";

interface FlowTabProps {
  allAgents: AgentRecord[];
}

export function FlowTab({ allAgents }: FlowTabProps) {
  const { toast } = useToast();
  const activeAgents = allAgents.filter((a) => a.status !== "deleted");

  const { data: flowsData, isLoading: flowsLoading } = useFlows();
  const saveFlowMutation = useSaveFlow();
  const savingFlow = saveFlowMutation.isPending;

  const flows = flowsData?.flows || [];
  const [activeFlowId, setActiveFlowId] = useState<number | null>(null);
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [flowName, setFlowName] = useState("Main Flow");
  const svgRef = useRef<SVGSVGElement>(null);

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
  const [flowsInitialized, setFlowsInitialized] = useState(false);

  useEffect(() => {
    if (flowsData && !flowsInitialized) {
      if (flowsData.activeFlow) {
        setActiveFlowId(flowsData.activeFlow.id);
        setFlowNodes(flowsData.activeFlow.nodes || []);
        setFlowEdges(flowsData.activeFlow.edges || []);
        setFlowName(flowsData.activeFlow.name || "Main Flow");
      } else if (flows.length > 0) {
        const first = flows[0];
        setActiveFlowId(first.id);
        setFlowNodes(first.nodes || []);
        setFlowEdges(first.edges || []);
        setFlowName(first.name || "Main Flow");
      }
      setFlowsInitialized(true);
    }
  }, [flowsData, flowsInitialized, flows]);

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

  const saveFlow = () => {
    saveFlowMutation.mutate(
      { id: activeFlowId ?? undefined, name: flowName, nodes: flowNodes, edges: flowEdges, isActive: true },
      {
        onSuccess: (data: any) => {
          if (!activeFlowId && data?.flow?.id) {
            setActiveFlowId(data.flow.id);
          }
          toast({ title: activeFlowId ? "Flow saved" : "Flow created", description: activeFlowId ? "Automation flow updated." : "New automation flow saved." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save flow.", variant: "destructive" });
        },
      }
    );
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

  const selectedNode = flowNodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = flowEdges.find((e) => e.id === selectedEdgeId) || null;

  return (
    <div className="mt-6 space-y-4">
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
    </div>
  );
}
