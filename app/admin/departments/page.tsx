"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { Building2, Plus, Pencil, Trash2, Users, UserPlus, Crown } from "lucide-react";

interface Department {
  id: number;
  name: string;
  description?: string;
  color?: string;
  status: string;
  managerId?: number;
  manager?: { id: number; email: string; businessName: string } | null;
  memberCount?: number;
  createdAt?: string;
}

interface DepartmentDetail extends Department {
  members?: DepartmentMember[];
}

interface DepartmentMember {
  id: number;
  userId: number;
  businessName: string;
  email: string;
  departmentRole: string;
  joinedAt?: string;
}

interface TeamMember {
  id: number;
  userId: number;
  businessName: string;
  email: string;
  orgRole?: string;
}

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <DepartmentsContent />
    </Suspense>
  );
}

function DepartmentsContent() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#3b82f6");
  const [formManagerId, setFormManagerId] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewDept, setViewDept] = useState<DepartmentDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("AGENT");
  const [addingMember, setAddingMember] = useState(false);

  const fetchDepartments = () => {
    setLoading(true);
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((d) => {
        if (d?.departments) setDepartments(d.departments);
        else if (Array.isArray(d)) setDepartments(d);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoading(false));
  };

  const fetchTeamMembers = () => {
    fetch("/api/admin/team")
      .then((r) => r.json())
      .then((d) => {
        if (d?.members) setTeamMembers(d.members);
        else if (Array.isArray(d)) setTeamMembers(d);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchDepartments();
    fetchTeamMembers();
  }, []);

  const activeDepts = departments.filter((d) => d.status === "active");
  const totalMembers = departments.reduce((sum, d) => sum + (d.memberCount || 0), 0);
  const managerCount = departments.filter((d) => d.managerId).length;

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormColor("#3b82f6");
    setFormManagerId("");
    setEditingDept(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateEditOpen(true);
  };

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormDescription(dept.description || "");
    setFormColor(dept.color || "#3b82f6");
    setFormManagerId(dept.managerId ? String(dept.managerId) : "");
    setCreateEditOpen(true);
  };

  const handleSave = async () => {
    if (!formName) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: formName,
        description: formDescription || undefined,
        color: formColor,
      };
      if (formManagerId && formManagerId !== "none") body.managerId = parseInt(formManagerId);
      else body.managerId = null;

      const url = editingDept
        ? `/api/admin/departments/${editingDept.id}`
        : "/api/admin/departments";
      const method = editingDept ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setCreateEditOpen(false);
        resetForm();
        fetchDepartments();
      }
    } catch (err) {
      console.error("Save department failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/departments/${dept.id}`, { method: "DELETE" });
      if (res.ok) fetchDepartments();
    } catch (err) {
      console.error("Delete department failed:", err);
    }
  };

  const openViewDialog = async (dept: Department) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewDept(null);
    try {
      const res = await fetch(`/api/admin/departments/${dept.id}`);
      const data = await res.json();
      setViewDept(data?.department || data);
    } catch {
      setViewDept({ ...dept, members: [] });
    } finally {
      setViewLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!viewDept || !addMemberUserId) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/admin/departments/${viewDept.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: parseInt(addMemberUserId), departmentRole: addMemberRole }),
      });
      if (res.ok) {
        setAddMemberUserId("");
        setAddMemberRole("AGENT");
        await refreshViewDept(viewDept.id);
        fetchDepartments();
      }
    } catch (err) {
      console.error("Add member failed:", err);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!viewDept) return;
    try {
      const res = await fetch(`/api/admin/departments/${viewDept.id}/members?memberId=${memberId}`, { method: "DELETE" });
      if (res.ok) {
        await refreshViewDept(viewDept.id);
        fetchDepartments();
      }
    } catch (err) {
      console.error("Remove member failed:", err);
    }
  };

  const handleChangeRole = async (memberId: number, newRole: string) => {
    if (!viewDept) return;
    try {
      const res = await fetch(`/api/admin/departments/${viewDept.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, departmentRole: newRole }),
      });
      if (res.ok) {
        await refreshViewDept(viewDept.id);
      }
    } catch (err) {
      console.error("Change role failed:", err);
    }
  };

  const refreshViewDept = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/departments/${id}`);
      const data = await res.json();
      setViewDept(data?.department || data);
    } catch {}
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "archived":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-departments-title">
              Departments
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage departments, assign members, and set managers.
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-department">
          <Plus className="h-4 w-4 mr-2" />
          New Department
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Departments</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-total-departments">{departments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Active</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-active-departments">{activeDepts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Members</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-total-members">{totalMembers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Managers</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-managers">{managerCount}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
              <Building2 className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-departments-error">Failed to load departments</p>
          </CardContent>
        </Card>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
              <Building2 className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No departments yet</p>
            <p className="text-xs text-muted-foreground mb-3">Create your first department to get started.</p>
            <Button onClick={openCreateDialog} data-testid="button-create-department-empty">
              <Plus className="h-4 w-4 mr-2" />
              New Department
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card
              key={dept.id}
              className="hover-elevate cursor-pointer"
              onClick={() => openViewDialog(dept)}
              data-testid={`card-department-${dept.id}`}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: dept.color || "#3b82f6" }}
                      data-testid={`dot-department-color-${dept.id}`}
                    />
                    <h3 className="font-semibold text-foreground truncate" data-testid={`text-department-name-${dept.id}`}>
                      {dept.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className={`no-default-hover-elevate ${getStatusBadgeClass(dept.status)}`}>
                      {dept.status}
                    </Badge>
                  </div>
                </div>

                {dept.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-department-description-${dept.id}`}>
                    {dept.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Crown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground" data-testid={`text-department-manager-${dept.id}`}>
                    {dept.manager?.businessName || dept.manager?.email || "No manager assigned"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                  <Badge variant="secondary" className="no-default-hover-elevate" data-testid={`badge-member-count-${dept.id}`}>
                    <Users className="w-3 h-3 mr-1" />
                    {dept.memberCount || 0} members
                  </Badge>
                  <div className="flex items-center gap-1" style={{ visibility: "visible" }}>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); openEditDialog(dept); }}
                      data-testid={`button-edit-department-${dept.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleDelete(dept); }}
                      data-testid={`button-delete-department-${dept.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createEditOpen} onOpenChange={setCreateEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-create-department">
          <DialogHeader>
            <DialogTitle>{editingDept ? "Edit Department" : "New Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name *</Label>
              <Input
                id="dept-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Department name"
                data-testid="input-department-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-description">Description</Label>
              <Textarea
                id="dept-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description..."
                data-testid="input-department-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-color">Color</Label>
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className="w-8 h-8 rounded-md border"
                  style={{ backgroundColor: formColor }}
                  data-testid="preview-department-color"
                />
                <Input
                  id="dept-color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                  data-testid="input-department-color"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select value={formManagerId || "none"} onValueChange={setFormManagerId}>
                <SelectTrigger data-testid="select-department-manager">
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={String(m.userId)}>
                      {m.businessName || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateEditOpen(false)} data-testid="button-cancel-department">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !formName} data-testid="button-submit-department">
                {saving ? "Saving..." : editingDept ? "Update Department" : "Create Department"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-view-department">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {viewDept && (
                <>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: viewDept.color || "#3b82f6" }}
                  />
                  {viewDept.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {viewLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : viewDept ? (
            <div className="space-y-5 mt-2">
              {viewDept.description && (
                <p className="text-sm text-muted-foreground" data-testid="text-view-department-description">
                  {viewDept.description}
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className={`no-default-hover-elevate ${getStatusBadgeClass(viewDept.status)}`}>
                  {viewDept.status}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {viewDept.manager?.businessName || viewDept.manager?.email || "No manager assigned"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Members</h4>
                {viewDept.members && viewDept.members.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewDept.members.map((member) => (
                          <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                            <TableCell className="font-medium" data-testid={`text-member-name-${member.id}`}>
                              {member.businessName}
                            </TableCell>
                            <TableCell className="text-muted-foreground" data-testid={`text-member-email-${member.id}`}>
                              {member.email}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={member.departmentRole}
                                onValueChange={(val) => handleChangeRole(member.id, val)}
                              >
                                <SelectTrigger className="w-28" data-testid={`select-member-role-${member.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MANAGER">Manager</SelectItem>
                                  <SelectItem value="AGENT">Agent</SelectItem>
                                  <SelectItem value="VIEWER">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveMember(member.id)}
                                data-testid={`button-remove-member-${member.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No members in this department yet.</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 flex-wrap">
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </h4>
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="space-y-1.5 flex-1 min-w-[180px]">
                    <Label className="text-xs">User</Label>
                    <Select value={addMemberUserId || "placeholder"} onValueChange={(val) => val !== "placeholder" && setAddMemberUserId(val)}>
                      <SelectTrigger data-testid="select-add-member-user">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>Select user</SelectItem>
                        {teamMembers.map((m) => (
                          <SelectItem key={m.id} value={String(m.userId)}>
                            {m.businessName || m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 w-32">
                    <Label className="text-xs">Role</Label>
                    <Select value={addMemberRole} onValueChange={setAddMemberRole}>
                      <SelectTrigger data-testid="select-add-member-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="AGENT">Agent</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleAddMember}
                    disabled={addingMember || !addMemberUserId || addMemberUserId === "placeholder"}
                    data-testid="button-add-member"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {addingMember ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
