"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { Users, UserPlus, Shield, Crown, Mail, XCircle, Clock, Upload, Download, FileText, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

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

interface ParsedCsvRow {
  email: string;
  name: string;
  role: string;
  department: string;
  valid: boolean;
  reason?: string;
  status: "valid" | "invalid" | "duplicate" | "existing";
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
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteOrgRole, setInviteOrgRole] = useState("AGENT");
  const [inviteDeptId, setInviteDeptId] = useState("");
  const [inviteDeptRole, setInviteDeptRole] = useState("AGENT");
  const [inviteWelcomeMessage, setInviteWelcomeMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<ParsedCsvRow[]>([]);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<{ sent: number; skipped: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resending, setResending] = useState<number | null>(null);

  const fetchAll = useCallback(() => {
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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRoleChange = async (memberId: number, role: string) => {
    try {
      await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      fetchAll();
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
      if (inviteDisplayName) body.name = inviteDisplayName;
      if (inviteWelcomeMessage) body.welcomeMessage = inviteWelcomeMessage;
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
        fetchAll();
      }
    } catch (err) {
      console.error("Send invite failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (id: number) => {
    setResending(id);
    try {
      await fetch("/api/admin/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchAll();
    } catch (err) {
      console.error("Resend failed:", err);
    } finally {
      setResending(null);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await fetch(`/api/admin/invitations?id=${id}`, { method: "DELETE" });
      fetchAll();
    } catch (err) {
      console.error("Revoke failed:", err);
    }
  };

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteDisplayName("");
    setInviteOrgRole("AGENT");
    setInviteDeptId("");
    setInviteDeptRole("AGENT");
    setInviteWelcomeMessage("");
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      setCsvRows([]);
      return;
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));

    const emailIdx = headers.findIndex(h => h === "email" || h === "e-mail");
    const nameIdx = headers.findIndex(h => h === "name" || h === "display_name" || h === "display name");
    const roleIdx = headers.findIndex(h => h === "role" || h === "org_role" || h === "org role");
    const deptIdx = headers.findIndex(h => h === "department" || h === "dept" || h === "department_name");

    if (emailIdx === -1) {
      setCsvRows([]);
      return;
    }

    const memberEmails = new Set(members.map(m => m.email.toLowerCase()));
    const pendingEmails = new Set(invitations.filter(i => i.status === "pending").map(i => i.email.toLowerCase()));
    const seenEmails = new Set<string>();

    const rows: ParsedCsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
      const email = (cols[emailIdx] || "").toLowerCase().trim();
      const name = nameIdx >= 0 ? (cols[nameIdx] || "") : "";
      let role = roleIdx >= 0 ? (cols[roleIdx] || "AGENT").toUpperCase() : "AGENT";
      const department = deptIdx >= 0 ? (cols[deptIdx] || "") : "";

      if (role === "BOARD MEMBER" || role === "BOARD_MEMBER" || role === "BOARDMEMBER") {
        role = "VIEWER";
      }
      if (!["ADMIN", "MANAGER", "AGENT", "VIEWER"].includes(role)) {
        role = "AGENT";
      }

      if (!email) continue;

      let valid = true;
      let reason: string | undefined;
      let status: ParsedCsvRow["status"] = "valid";

      if (!isValidEmail(email)) {
        valid = false;
        reason = "Invalid email format";
        status = "invalid";
      } else if (seenEmails.has(email)) {
        valid = false;
        reason = "Duplicate in file";
        status = "duplicate";
      } else if (memberEmails.has(email)) {
        valid = false;
        reason = "Already a member";
        status = "existing";
      } else if (pendingEmails.has(email)) {
        valid = false;
        reason = "Pending invitation exists";
        status = "existing";
      }

      seenEmails.add(email);
      rows.push({ email, name, role, department, valid, reason, status });
    }

    setCsvRows(rows);
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) parseCsv(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleBulkSend = async () => {
    const validRows = csvRows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setBulkSending(true);
    setBulkProgress(10);

    try {
      const deptMap = new Map(departments.map(d => [d.name.toLowerCase(), d.id]));

      const invites = validRows.map(r => ({
        email: r.email,
        name: r.name || undefined,
        orgRole: r.role as "ADMIN" | "MANAGER" | "AGENT" | "VIEWER",
        departmentId: r.department ? (deptMap.get(r.department.toLowerCase()) || null) : null,
        departmentRole: r.department && deptMap.get(r.department.toLowerCase()) ? "AGENT" as const : undefined,
      }));

      setBulkProgress(30);

      const res = await fetch("/api/admin/invitations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invites }),
      });

      setBulkProgress(80);

      if (res.ok) {
        const data = await res.json();
        setBulkResult({ sent: data.sent, skipped: data.skipped });
        setBulkProgress(100);
        fetchAll();
      }
    } catch (err) {
      console.error("Bulk send failed:", err);
    } finally {
      setBulkSending(false);
    }
  };

  const resetBulkForm = () => {
    setCsvRows([]);
    setBulkResult(null);
    setBulkProgress(0);
    setBulkSending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadSampleCsv = () => {
    const csv = "email,name,role,department\njohn@example.com,John Smith,AGENT,Sales\njane@example.com,Jane Doe,MANAGER,Support\nboard@example.com,Board Member,VIEWER,";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invite-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending" || inv.status === "expired");
  const adminCount = members.filter((m) => m.orgRole === "ADMIN" || m.orgRole === "OWNER").length;
  const managerCount = members.filter((m) => m.orgRole === "MANAGER").length;
  const validCsvCount = csvRows.filter(r => r.valid).length;

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

  const getRoleLabel = (role: string) => {
    if (role === "VIEWER") return "Board Member";
    return role.charAt(0) + role.slice(1).toLowerCase();
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

  const getCsvRowStatusClass = (status: ParsedCsvRow["status"]) => {
    switch (status) {
      case "valid":
        return "text-emerald-600 dark:text-emerald-400";
      case "invalid":
        return "text-red-600 dark:text-red-400";
      case "duplicate":
      case "existing":
        return "text-amber-600 dark:text-amber-400";
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { resetBulkForm(); setBulkOpen(true); }} data-testid="button-bulk-invite">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Invite
          </Button>
          <Button onClick={() => { resetInviteForm(); setInviteOpen(true); }} data-testid="button-invite-employee">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>
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
                              <SelectItem value="VIEWER">Board Member</SelectItem>
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
              ) : pendingInvitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Mail className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No pending invitations</p>
                  <p className="text-xs text-muted-foreground">Send an invitation to add team members.</p>
                </div>
              ) : (
                <Table data-testid="table-invitations">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Assigned Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((inv) => (
                      <TableRow key={inv.id} data-testid={`row-invitation-${inv.id}`}>
                        <TableCell className="font-medium" data-testid={`text-invitation-email-${inv.id}`}>
                          {inv.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`no-default-hover-elevate ${getRoleBadgeClass(inv.orgRole)}`}>
                            {getRoleLabel(inv.orgRole)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {inv.departmentName || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "-"}
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
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleResend(inv.id)}
                              disabled={resending === inv.id}
                              data-testid={`button-resend-invite-${inv.id}`}
                            >
                              {resending === inv.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRevoke(inv.id)}
                              data-testid={`button-revoke-invite-${inv.id}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
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
            <DialogTitle>Invite Member</DialogTitle>
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
              <Label htmlFor="invite-name">Display Name (optional)</Label>
              <Input
                id="invite-name"
                type="text"
                value={inviteDisplayName}
                onChange={(e) => setInviteDisplayName(e.target.value)}
                placeholder="John Smith"
                data-testid="input-invite-name"
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
                  <SelectItem value="VIEWER">Board Member</SelectItem>
                </SelectContent>
              </Select>
              {inviteOrgRole === "VIEWER" && (
                <p className="text-xs text-muted-foreground">Board Members get read-only access to agent configurations and team analytics.</p>
              )}
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
            <div className="space-y-2">
              <Label htmlFor="invite-message">Personal Welcome Message (optional)</Label>
              <Textarea
                id="invite-message"
                value={inviteWelcomeMessage}
                onChange={(e) => setInviteWelcomeMessage(e.target.value)}
                placeholder="Welcome to the team! We're excited to have you on board."
                className="resize-none"
                rows={3}
                data-testid="input-invite-message"
              />
            </div>
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

      <Dialog open={bulkOpen} onOpenChange={(open) => { setBulkOpen(open); if (!open) resetBulkForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-bulk-invite">
          <DialogHeader>
            <DialogTitle>Bulk Invite via CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {!bulkResult ? (
              <>
                <div
                  className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  data-testid="dropzone-csv"
                >
                  <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    data-testid="input-csv-file"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-browse-csv"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    Required columns: email. Optional: name, role (ADMIN/MANAGER/AGENT/Board Member), department.
                  </p>
                  <Button variant="ghost" size="sm" onClick={downloadSampleCsv} data-testid="button-download-template">
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                {csvRows.length > 0 && (
                  <>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{csvRows.length} rows parsed</span>
                        <Badge variant="secondary" className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {validCsvCount} valid
                        </Badge>
                        {csvRows.length - validCsvCount > 0 && (
                          <Badge variant="secondary" className="no-default-hover-elevate bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            {csvRows.length - validCsvCount} skipped
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border rounded-md">
                      <Table data-testid="table-csv-preview">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8" />
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvRows.map((row, idx) => (
                            <TableRow key={idx} data-testid={`row-csv-${idx}`}>
                              <TableCell>
                                {row.valid ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : row.status === "invalid" ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{row.email}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{row.name || "-"}</TableCell>
                              <TableCell className="text-sm">{getRoleLabel(row.role)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{row.department || "-"}</TableCell>
                              <TableCell>
                                <span className={`text-xs font-medium ${getCsvRowStatusClass(row.status)}`}>
                                  {row.valid ? "Ready" : row.reason}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {bulkSending && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Sending invitations...</span>
                    </div>
                    <Progress value={bulkProgress} className="h-2" />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setBulkOpen(false)} data-testid="button-cancel-bulk">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkSend}
                    disabled={bulkSending || validCsvCount === 0}
                    data-testid="button-send-bulk"
                  >
                    {bulkSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      `Send ${validCsvCount} Valid Invitation${validCsvCount !== 1 ? "s" : ""}`
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground" data-testid="text-bulk-result">
                    {bulkResult.sent} invitation{bulkResult.sent !== 1 ? "s" : ""} sent
                  </p>
                  {bulkResult.skipped > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {bulkResult.skipped} skipped (duplicates or existing members)
                    </p>
                  )}
                </div>
                <Button onClick={() => { setBulkOpen(false); resetBulkForm(); }} data-testid="button-close-bulk-result">
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
