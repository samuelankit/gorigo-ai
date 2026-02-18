"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Shield, Crown, Mail, XCircle, Clock } from "lucide-react";

interface MemberDepartment {
  departmentId: number;
  departmentRole: string;
  departmentName: string;
}

interface Member {
  id: number;
  userId: number;
  orgRole: string;
  email: string;
  businessName: string;
  createdAt: string;
  departments: MemberDepartment[];
}

interface Invitation {
  id: number;
  email: string;
  orgRole: string;
  departmentId?: number;
  departmentRole?: string;
  departmentName?: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface Department {
  id: number;
  name: string;
}

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <TeamContent />
    </Suspense>
  );
}

function TeamContent() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOrgRole, setInviteOrgRole] = useState("AGENT");
  const [inviteDeptId, setInviteDeptId] = useState("");
  const [inviteDeptRole, setInviteDeptRole] = useState("AGENT");
  const [sending, setSending] = useState(false);

  const fetchMembers = () => {
    fetch("/api/admin/team")
      .then((r) => r.json())
      .then((d) => {
        if (d?.members) setMembers(d.members);
        else if (Array.isArray(d)) setMembers(d);
      })
      .catch(() => { setError(true); });
  };

  const fetchInvitations = () => {
    fetch("/api/admin/invitations")
      .then((r) => r.json())
      .then((d) => {
        if (d?.invitations) setInvitations(d.invitations);
        else if (Array.isArray(d)) setInvitations(d);
      })
      .catch(() => {});
  };

  const fetchDepartments = () => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((d) => {
        if (d?.departments) setDepartments(d.departments);
        else if (Array.isArray(d)) setDepartments(d);
      })
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/team").then((r) => r.json()),
      fetch("/api/admin/invitations").then((r) => r.json()),
      fetch("/api/admin/departments").then((r) => r.json()),
    ])
      .then(([teamData, invData, deptData]) => {
        if (teamData?.members) setMembers(teamData.members);
        else if (Array.isArray(teamData)) setMembers(teamData);
        if (invData?.invitations) setInvitations(invData.invitations);
        else if (Array.isArray(invData)) setInvitations(invData);
        if (deptData?.departments) setDepartments(deptData.departments);
        else if (Array.isArray(deptData)) setDepartments(deptData);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (memberId: number, role: string) => {
    try {
      await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      fetchMembers();
    } catch (err) {
      console.error("Role change failed:", err);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    setSending(true);
    try {
      const body: Record<string, unknown> = {
        email: inviteEmail,
        orgRole: inviteOrgRole,
      };
      if (inviteDeptId && inviteDeptId !== "none") {
        body.departmentId = parseInt(inviteDeptId);
        body.departmentRole = inviteDeptRole;
      }
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setInviteOpen(false);
        resetInviteForm();
        fetchInvitations();
      }
    } catch (err) {
      console.error("Send invite failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await fetch(`/api/admin/invitations?id=${id}`, { method: "DELETE" });
      fetchInvitations();
    } catch (err) {
      console.error("Revoke failed:", err);
    }
  };

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteOrgRole("AGENT");
    setInviteDeptId("");
    setInviteDeptRole("AGENT");
  };

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending");
  const adminCount = members.filter((m) => m.orgRole === "ADMIN" || m.orgRole === "OWNER").length;
  const managerCount = members.filter((m) => m.orgRole === "MANAGER").length;

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "ADMIN":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "MANAGER":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "AGENT":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "VIEWER":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
      default:
        return "";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "accepted":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "expired":
      case "revoked":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-team-title">
              Team Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage organization members and send invitations.
            </p>
          </div>
        </div>
        <Button onClick={() => setInviteOpen(true)} data-testid="button-invite-employee">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Employee
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Members</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-total-members">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Admins</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-admins">{adminCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Managers</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-managers">{managerCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending Invitations</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-pending-invitations">{pendingInvitations.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2 flex-wrap">
            <Shield className="w-4 h-4 text-muted-foreground" />
            Members
          </h2>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Users className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">Failed to load team members</p>
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Users className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No members yet</p>
                  <p className="text-xs text-muted-foreground">Invite your first team member to get started.</p>
                </div>
              ) : (
                <Table data-testid="table-members">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Org Role</TableHead>
                      <TableHead>Departments</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                        <TableCell className="font-medium" data-testid={`text-member-name-${member.id}`}>
                          {member.businessName || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-member-email-${member.id}`}>
                          {member.email}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.orgRole}
                            onValueChange={(val) => handleRoleChange(member.id, val)}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-member-role-${member.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNER">Owner</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="AGENT">Agent</SelectItem>
                              <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {member.departments && member.departments.length > 0
                              ? member.departments.map((d) => (
                                  <Badge
                                    key={d.departmentId}
                                    variant="secondary"
                                    className="no-default-hover-elevate"
                                    data-testid={`badge-dept-${member.id}-${d.departmentId}`}
                                  >
                                    {d.departmentName}
                                  </Badge>
                                ))
                              : <span className="text-sm text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2 flex-wrap">
            <Mail className="w-4 h-4 text-muted-foreground" />
            Pending Invitations
          </h2>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : invitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Mail className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No invitations</p>
                  <p className="text-xs text-muted-foreground">Send an invitation to add team members.</p>
                </div>
              ) : (
                <Table data-testid="table-invitations">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Assigned Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => (
                      <TableRow key={inv.id} data-testid={`row-invitation-${inv.id}`}>
                        <TableCell className="font-medium" data-testid={`text-invitation-email-${inv.id}`}>
                          {inv.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`no-default-hover-elevate ${getRoleBadgeClass(inv.orgRole)}`}>
                            {inv.orgRole}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {inv.departmentName || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`no-default-hover-elevate ${getStatusBadgeClass(inv.status)}`}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {inv.status === "pending" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRevoke(inv.id)}
                              data-testid={`button-revoke-invite-${inv.id}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-invite-employee">
          <DialogHeader>
            <DialogTitle>Invite Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="employee@example.com"
                data-testid="input-invite-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Organization Role</Label>
              <Select value={inviteOrgRole} onValueChange={setInviteOrgRole}>
                <SelectTrigger data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department (optional)</Label>
              <Select value={inviteDeptId || "none"} onValueChange={setInviteDeptId}>
                <SelectTrigger data-testid="select-invite-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteDeptId && inviteDeptId !== "none" && (
              <div className="space-y-2">
                <Label>Department Role</Label>
                <Select value={inviteDeptRole} onValueChange={setInviteDeptRole}>
                  <SelectTrigger data-testid="select-invite-department-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="AGENT">Agent</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)} data-testid="button-cancel-invite">
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={sending || !inviteEmail}
                data-testid="button-send-invite"
              >
                {sending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
