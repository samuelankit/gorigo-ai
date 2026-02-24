"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users, Download, Search, Eye, ChevronLeft, ChevronRight,
  Cloud, Key, Phone, DollarSign, Building2,
} from "lucide-react";

interface Client {
  id: number;
  businessName: string;
  ownerEmail: string | null;
  partnerName: string;
  partnerId: number | null;
  channelType: string;
  deploymentModel: string;
  totalCalls: number;
  totalRevenue: number;
  walletBalance: number;
  walletActive: boolean;
  agentCount: number;
  joinedAt: string;
}

interface PartnerOption {
  id: number;
  name: string;
}

const PAGE_SIZE = 25;

const PACKAGE_LABELS: Record<string, { label: string; color: string }> = {
  individual: { label: "Individual", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  custom: { label: "Custom", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

const PACKAGE_ICONS: Record<string, typeof Cloud> = {
  individual: Cloud,
  custom: Building2,
};

function getStatusBadge(channelType: string) {
  if (channelType === "suspended") {
    return <Badge variant="destructive" className="no-default-hover-elevate">Suspended</Badge>;
  }
  return <Badge variant="secondary" className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</Badge>;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterPartner, setFilterPartner] = useState("all");
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchClients = useCallback(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (filterPartner && filterPartner !== "all") params.set("partnerId", filterPartner);
    if (filterPackage && filterPackage !== "all") params.set("package", filterPackage);
    if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
    if (searchTerm) params.set("search", searchTerm);

    fetch(`/api/admin/clients?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.clients) {
          setClients(d.clients);
          setTotal(d.pagination?.total ?? d.clients.length);
        } else if (Array.isArray(d)) {
          setClients(d);
          setTotal(d.length);
        }
      })
      .catch(() => { setError(true); })
      .finally(() => setLoading(false));
  }, [page, filterPartner, filterPackage, filterStatus, searchTerm]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    fetch("/api/admin/partners")
      .then((r) => r.json())
      .then((d) => {
        const list = d?.partners || d;
        if (Array.isArray(list)) {
          setPartners(list.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })));
        }
      })
      .catch((error) => { console.error("Fetch admin partners list failed:", error); });
  }, []);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(0);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const exportCSV = () => {
    const headers = ["ID", "Business Name", "Owner Email", "Partner", "Package", "Status", "Total Calls", "Revenue", "Wallet Balance", "Agents", "Joined"];
    const rows = clients.map((c) => [
      String(c.id),
      c.businessName,
      c.ownerEmail || "",
      c.partnerName,
      c.deploymentModel,
      c.channelType === "suspended" ? "Suspended" : "Active",
      String(c.totalCalls ?? 0),
      String(c.totalRevenue ?? 0),
      String(c.walletBalance ?? 0),
      String(c.agentCount ?? 0),
      c.joinedAt ? new Date(c.joinedAt).toLocaleDateString() : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
            <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-clients-title">
              Client Management
            </h1>
            <p className="text-sm text-muted-foreground">
              {total} client{total !== 1 ? "s" : ""} across the platform.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-clients">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Total Clients</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-clients">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-4 h-4 text-emerald-500" />
              <p className="text-sm text-muted-foreground">Total Calls</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-calls">{clients.reduce((s, c) => s + c.totalCalls, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(clients.reduce((s, c) => s + c.totalRevenue, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-violet-500" />
              <p className="text-sm text-muted-foreground">Total Agents</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-agents">{clients.reduce((s, c) => s + c.agentCount, 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search by business name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            data-testid="input-search-clients"
          />
          <Button variant="outline" size="icon" onClick={handleSearch} data-testid="button-search-clients">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={filterPartner} onValueChange={(v) => { setFilterPartner(v); setPage(0); }}>
          <SelectTrigger className="w-44" data-testid="select-partner-filter">
            <SelectValue placeholder="Partner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Partners</SelectItem>
            <SelectItem value="d2c">D2C Only</SelectItem>
            {partners.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPackage} onValueChange={(v) => { setFilterPackage(v); setPage(0); }}>
          <SelectTrigger className="w-40" data-testid="select-package-filter">
            <SelectValue placeholder="Package" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Packages</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
          <SelectTrigger className="w-36" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Users className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-clients-error">Failed to load client data.</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Users className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-no-clients">No clients found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-clients">
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Agents</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const pkg = PACKAGE_LABELS[client.deploymentModel] || { label: client.deploymentModel, color: "" };
                    return (
                      <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                        <TableCell className="font-medium">{client.businessName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{client.ownerEmail || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="default" className={`no-default-hover-elevate ${pkg.color}`}>
                            {pkg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(client.channelType)}</TableCell>
                        <TableCell>
                          {client.partnerName === "D2C" ? (
                            <Badge variant="outline" className="no-default-hover-elevate">D2C</Badge>
                          ) : (
                            <span className="text-sm">{client.partnerName}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">{client.totalCalls.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(client.totalRevenue)}</TableCell>
                        <TableCell className="text-right text-sm">
                          <span className={client.walletBalance <= 0 ? "text-destructive" : ""}>
                            {formatCurrency(client.walletBalance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">{client.agentCount}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{client.joinedAt ? formatDate(client.joinedAt) : "-"}</TableCell>
                        <TableCell>
                          <Link href={`/admin/clients/${client.id}`}>
                            <Button variant="ghost" size="icon" data-testid={`button-view-client-${client.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && !error && clients.length > 0 && (
            <div className="flex items-center justify-between gap-3 p-4 border-t flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                data-testid="button-clients-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={clients.length < PAGE_SIZE}
                onClick={() => setPage(page + 1)}
                data-testid="button-clients-next"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
