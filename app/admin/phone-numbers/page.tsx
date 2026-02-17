"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Phone, Plus, Unlink, XCircle } from "lucide-react";

interface PhoneNumber {
  id: number;
  phoneNumber: string;
  friendlyName: string | null;
  orgId: number | null;
  twilioSid: string | null;
  capabilities: { voice?: boolean; sms?: boolean } | null;
  isActive: boolean;
  assignedAt: string | null;
  createdAt: string;
  orgName: string | null;
}

interface OrgOption {
  id: number;
  name: string;
}

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PhoneNumber | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [formPhone, setFormPhone] = useState("");
  const [formFriendlyName, setFormFriendlyName] = useState("");
  const [formTwilioSid, setFormTwilioSid] = useState("");

  const fetchPhoneNumbers = () => {
    setLoading(true);
    fetch("/api/admin/phone-numbers")
      .then((r) => r.json())
      .then((d) => {
        if (d?.phoneNumbers) setPhoneNumbers(d.phoneNumbers);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  const fetchOrgs = () => {
    fetch("/api/admin/clients?limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (d?.clients) {
          setOrgOptions(d.clients.map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })));
        }
      })
      .catch((error) => { console.error("Fetch org options for phone numbers failed:", error); });
  };

  useEffect(() => {
    fetchPhoneNumbers();
    fetchOrgs();
  }, []);

  const handleCreate = async () => {
    if (!formPhone) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formPhone,
          friendlyName: formFriendlyName || undefined,
          twilioSid: formTwilioSid || undefined,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        fetchPhoneNumbers();
      }
    } catch (error) {
      console.error("Create phone number failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    setSaving(true);
    try {
      const orgId = selectedOrgId === "unassign" ? null : parseInt(selectedOrgId, 10);
      const res = await fetch("/api/admin/phone-numbers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignTarget.id, orgId }),
      });
      if (res.ok) {
        setAssignDialogOpen(false);
        setAssignTarget(null);
        setSelectedOrgId("");
        fetchPhoneNumbers();
      }
    } catch (error) {
      console.error("Assign phone number failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (pn: PhoneNumber) => {
    if (!confirm(`Deactivate ${pn.phoneNumber}?`)) return;
    try {
      const res = await fetch(`/api/admin/phone-numbers?id=${pn.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPhoneNumbers();
      }
    } catch (error) {
      console.error("Deactivate phone number failed:", error);
    }
  };

  const openAssignDialog = (pn: PhoneNumber) => {
    setAssignTarget(pn);
    setSelectedOrgId(pn.orgId ? String(pn.orgId) : "");
    setAssignDialogOpen(true);
  };

  const resetForm = () => {
    setFormPhone("");
    setFormFriendlyName("");
    setFormTwilioSid("");
  };

  const activeCount = phoneNumbers.filter((p) => p.isActive).length;
  const assignedCount = phoneNumbers.filter((p) => p.orgId !== null).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
            <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-phone-numbers-title">
              Phone Number Management
            </h1>
            <p className="text-sm text-muted-foreground">Manage Twilio phone numbers and org assignments.</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-phone-number">
          <Plus className="h-4 w-4 mr-2" />
          Add Phone Number
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
          {activeCount} active
        </Badge>
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
          {assignedCount} assigned
        </Badge>
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
          {phoneNumbers.length} total
        </Badge>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-phone-number">
          <DialogHeader>
            <DialogTitle>Add New Phone Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number (E.164) *</Label>
              <Input
                id="phone-number"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+14155551234"
                data-testid="input-phone-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="friendly-name">Friendly Name</Label>
              <Input
                id="friendly-name"
                value={formFriendlyName}
                onChange={(e) => setFormFriendlyName(e.target.value)}
                placeholder="Main line"
                data-testid="input-friendly-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio-sid">Twilio SID</Label>
              <Input
                id="twilio-sid"
                value={formTwilioSid}
                onChange={(e) => setFormTwilioSid(e.target.value)}
                placeholder="PN..."
                data-testid="input-twilio-sid"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving || !formPhone} data-testid="button-save-phone-number">
                {saving ? "Saving..." : "Add Number"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-assign-phone-number">
          <DialogHeader>
            <DialogTitle>Assign Phone Number</DialogTitle>
          </DialogHeader>
          {assignTarget && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Assigning <span className="font-mono font-semibold text-foreground">{assignTarget.phoneNumber}</span>
              </p>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger data-testid="select-assign-org">
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassign">Unassign</SelectItem>
                    {orgOptions.map((org) => (
                      <SelectItem key={org.id} value={String(org.id)}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)} data-testid="button-cancel-assign">
                  Cancel
                </Button>
                <Button onClick={handleAssign} disabled={saving || !selectedOrgId} data-testid="button-save-assign">
                  {saving ? "Saving..." : "Save Assignment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-muted-foreground" data-testid="text-phone-numbers-error">
              Failed to load phone numbers.
            </div>
          ) : phoneNumbers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground" data-testid="text-phone-numbers-empty">
              No phone numbers found. Add one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Friendly Name</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phoneNumbers.map((pn) => (
                  <TableRow key={pn.id} data-testid={`row-phone-number-${pn.id}`}>
                    <TableCell>
                      <span className="font-mono text-sm" data-testid={`text-phone-${pn.id}`}>
                        {pn.phoneNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" data-testid={`text-friendly-name-${pn.id}`}>
                        {pn.friendlyName || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {pn.orgName ? (
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-org-${pn.id}`}>
                          {pn.orgName}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground" data-testid={`text-unassigned-${pn.id}`}>
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pn.isActive ? (
                        <Badge
                          variant="secondary"
                          className="no-default-hover-elevate no-default-active-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          data-testid={`badge-status-${pn.id}`}
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="no-default-hover-elevate no-default-active-elevate bg-red-500/10 text-red-600 dark:text-red-400"
                          data-testid={`badge-status-${pn.id}`}
                        >
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAssignDialog(pn)}
                          disabled={!pn.isActive}
                          data-testid={`button-assign-${pn.id}`}
                        >
                          {pn.orgId ? (
                            <>
                              <Unlink className="h-3.5 w-3.5 mr-1" />
                              Reassign
                            </>
                          ) : (
                            "Assign"
                          )}
                        </Button>
                        {pn.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(pn)}
                            className="text-red-600 dark:text-red-400"
                            data-testid={`button-deactivate-${pn.id}`}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Deactivate
                          </Button>
                        )}
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
  );
}
