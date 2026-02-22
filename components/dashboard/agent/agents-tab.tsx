"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Plus, Trash2, Edit, Bot, Sparkles, AlertTriangle, Copy, MessageSquare,
} from "lucide-react";
import type { AgentRecord } from "./types";

interface AgentsTabProps {
  agents: AgentRecord[];
  onEdit: (agent: AgentRecord) => void;
  onDelete: (id: number) => void;
  onClone: (agent: AgentRecord) => void;
  onTestChat: (agent: AgentRecord) => void;
  onAdd: () => void;
  savingAgent: boolean;
  agentTypeBadge: (type: string, isRouter: boolean) => React.ReactNode;
}

export function AgentsTab({
  agents,
  onEdit,
  onDelete,
  onClone,
  onTestChat,
  onAdd,
  savingAgent,
  agentTypeBadge,
}: AgentsTabProps) {
  const activeAgents = agents.filter((a) => a.status !== "deleted");

  return (
    <div className="mt-6 space-y-6">
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
        <Button onClick={onAdd} data-testid="button-add-agent">
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
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onClone(agent); }} data-testid={`button-clone-agent-${agent.id}`}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Clone agent</TooltipContent>
                    </Tooltip>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onTestChat(agent); }} data-testid={`button-test-agent-${agent.id}`}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(agent); }} data-testid={`button-edit-agent-${agent.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(agent.id); }} data-testid={`button-delete-agent-${agent.id}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2" onClick={() => onEdit(agent)}>
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
    </div>
  );
}
