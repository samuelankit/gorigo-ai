"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Clock, PoundSterling, Bot, Activity, Shield, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface TeamDashboardData {
  orgName: string;
  deploymentModel: string;
  stats: {
    totalMembers: number;
    activeDepartments: number;
    sharedAgents: number;
  };
  members: Array<{
    userId: number;
    email: string;
    name: string;
    role: string;
    roleLabel: string;
  }>;
  departments: Array<{
    id: number;
    name: string;
    color: string;
    memberCount: number;
    spendingCap: number | null;
    spentThisMonth: number;
    budgetPercentage: number | null;
  }>;
  sharedAgents: Array<{
    id: number;
    name: string;
    visibility: string;
    status: string;
    departmentName: string | null;
  }>;
  recentActivity: Array<{
    id: number;
    userId: number;
    action: string;
    entityType: string;
    entityId: number;
    details: any;
    createdAt: string;
    userEmail: string;
    userName: string;
  }>;
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getBudgetColor(percentage: number | null): string {
  if (percentage === null) return "bg-gray-200 dark:bg-gray-700";
  if (percentage >= 80) return "bg-red-500";
  if (percentage >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

function getBudgetBadge(percentage: number | null): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (percentage === null) return { label: "Unlimited", variant: "outline" };
  if (percentage >= 100) return { label: "Exceeded", variant: "destructive" };
  if (percentage >= 80) return { label: "Critical", variant: "destructive" };
  if (percentage >= 60) return { label: "Warning", variant: "secondary" };
  return { label: "Healthy", variant: "default" };
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "OWNER": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "ADMIN": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "VIEWER": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  }
}

export default function TeamDashboardPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery<TeamDashboardData>({
    queryKey: ["/api/dashboard/team"],
  });

  useEffect(() => {
    if (error && (error as any)?.status === 403) {
      router.push("/dashboard");
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="team-dashboard-loading">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center" data-testid="team-dashboard-empty">
        <p className="text-muted-foreground">Team dashboard is only available for Team and Custom deployment models.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="team-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent" data-testid="team-dashboard-title">
            Team Overview
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="team-org-name">
            {data.orgName} &middot; {data.stats.totalMembers} members
          </p>
        </div>
        <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" data-testid="team-badge">
          <Shield className="w-3 h-3 mr-1" />
          Team Package
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-indigo-200 dark:border-indigo-800/50" data-testid="stat-total-members">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{data.stats.totalMembers}</p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-200 dark:border-violet-800/50" data-testid="stat-departments">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Departments</p>
                <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{data.stats.activeDepartments}</p>
              </div>
              <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                <Building2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800/50" data-testid="stat-shared-agents">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shared Agents</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.stats.sharedAgents}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800/50" data-testid="stat-monthly-spend">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dept. Budgets Set</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.departments.filter(d => d.spendingCap !== null).length}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <PoundSterling className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="team-members-table">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No team members yet
                    </TableCell>
                  </TableRow>
                ) : (
                  data.members.map(member => (
                    <TableRow key={member.userId} data-testid={`member-row-${member.userId}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                          {member.roleLabel}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card data-testid="department-budgets-table">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Department Budgets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.departments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No departments created yet</p>
            ) : (
              data.departments.map(dept => {
                const budget = getBudgetBadge(dept.budgetPercentage);
                return (
                  <div key={dept.id} className="p-3 rounded-lg border bg-card" data-testid={`dept-budget-${dept.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || "#6366f1" }} />
                        <span className="font-medium text-sm">{dept.name}</span>
                        <span className="text-xs text-muted-foreground">({dept.memberCount} members)</span>
                      </div>
                      <Badge variant={budget.variant} className="text-xs">{budget.label}</Badge>
                    </div>
                    {dept.spendingCap !== null ? (
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getBudgetColor(dept.budgetPercentage)}`}
                            style={{ width: `${Math.min(100, dept.budgetPercentage || 0)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>£{dept.spentThisMonth.toFixed(2)} spent</span>
                          <span>£{dept.spendingCap.toFixed(2)} cap</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No spending cap set</p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="shared-agents-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Company-Wide Shared Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.sharedAgents.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No shared agents yet. Create an agent and set visibility to &quot;Whole Company&quot;.</p>
            ) : (
              <div className="space-y-2">
                {data.sharedAgents.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border bg-card" data-testid={`shared-agent-${agent.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{agent.name}</p>
                        {agent.departmentName && (
                          <p className="text-xs text-muted-foreground">Dept: {agent.departmentName}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-xs">
                      {agent.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="team-activity-feed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Recent Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No recent activity</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {data.recentActivity.slice(0, 20).map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm" data-testid={`activity-${activity.id}`}>
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full mt-0.5">
                      <Activity className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p>
                        <span className="font-medium">{activity.userName || activity.userEmail}</span>
                        {" "}
                        <span className="text-muted-foreground">{formatAction(activity.action)}</span>
                        {activity.entityType && (
                          <span className="text-muted-foreground"> ({activity.entityType})</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
