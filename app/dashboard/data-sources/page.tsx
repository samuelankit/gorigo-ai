"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/lib/use-toast";
import {
  Upload,
  FileSpreadsheet,
  Keyboard,
  Building2,
  Plug,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Trash2,
  RefreshCw,
  WifiOff,
  Bell,
  Search,
  Key,
  ChevronRight,
  Eye,
  EyeOff,
  Unplug,
  Clock,
  BarChart3,
  Shield,
} from "lucide-react";
import { SiGoogle, SiHubspot, SiSalesforce, SiAirtable } from "react-icons/si";
import { CsvUpload } from "@/components/dashboard/data-sources/csv-upload";
import { ManualEntry } from "@/components/dashboard/data-sources/manual-entry";
import CompaniesHouseSearch from "@/components/dashboard/data-sources/companies-house-search";

interface ConnectorResponse {
  id: number;
  connectorType: string;
  name: string;
  authType: string;
  status: string;
  oauthEmail?: string;
  maskedKey?: string;
  totalLookups: number;
  lastTestedAt?: string;
  lastErrorMessage?: string;
  createdAt: string;
  config?: Record<string, unknown>;
}

type ActiveModal =
  | null
  | "csv"
  | "manual"
  | "companies-house"
  | "connector-detail"
  | "connector-setup"
  | "disconnect-confirm";

const CONNECTOR_TYPES_INFO: Record<
  string,
  {
    label: string;
    description: string;
    authType: "oauth" | "api_key" | "none";
    comingSoon?: boolean;
    setupTime?: string;
  }
> = {
  google_sheets: {
    label: "Google Sheets",
    description: "Import from any spreadsheet",
    authType: "oauth",
  },
  hubspot: {
    label: "HubSpot",
    description: "Import CRM contacts",
    authType: "oauth",
  },
  salesforce: {
    label: "Salesforce",
    description: "Import CRM contacts",
    authType: "oauth",
    comingSoon: true,
  },
  pipedrive: {
    label: "Pipedrive",
    description: "Import CRM contacts",
    authType: "oauth",
    comingSoon: true,
  },
  airtable: {
    label: "Airtable",
    description: "Import from Airtable bases",
    authType: "api_key",
    comingSoon: true,
  },
  google_places: {
    label: "Google Places",
    description: "Search local businesses",
    authType: "api_key",
    setupTime: "2 min",
  },
  yelp: {
    label: "Yelp",
    description: "Search businesses by category",
    authType: "api_key",
    setupTime: "3 min",
  },
  apollo: {
    label: "Apollo.io",
    description: "B2B contact enrichment",
    authType: "api_key",
    setupTime: "2 min",
  },
};

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 no-default-hover-elevate no-default-active-elevate"
          data-testid="badge-status-active"
        >
          Active
        </Badge>
      );
    case "expired":
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 no-default-hover-elevate no-default-active-elevate"
          data-testid="badge-status-expired"
        >
          Expiring
        </Badge>
      );
    case "disconnected":
    case "error":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 no-default-hover-elevate no-default-active-elevate"
          data-testid="badge-status-disconnected"
        >
          {status === "disconnected" ? "Disconnected" : "Error"}
        </Badge>
      );
    case "pending_auth":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 no-default-hover-elevate no-default-active-elevate"
          data-testid="badge-status-pending"
        >
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
          {status}
        </Badge>
      );
  }
}

function ConnectorIcon({ type, className }: { type: string; className?: string }) {
  const cls = className || "h-5 w-5";
  switch (type) {
    case "google_sheets":
      return <SiGoogle className={cls} />;
    case "hubspot":
      return <SiHubspot className={cls} />;
    case "salesforce":
      return <SiSalesforce className={cls} />;
    case "airtable":
      return <SiAirtable className={cls} />;
    case "companies_house":
      return <Building2 className={cls} />;
    case "google_places":
      return <Search className={cls} />;
    case "csv":
      return <FileSpreadsheet className={cls} />;
    case "manual":
      return <Keyboard className={cls} />;
    default:
      return <Plug className={cls} />;
  }
}

export default function DataSourcesPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorResponse | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [byokKey, setByokKey] = useState("");
  const [byokType, setByokType] = useState("");
  const [byokName, setByokName] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testingConnector, setTestingConnector] = useState<number | null>(null);

  const {
    data: connectors = [],
    isLoading,
  } = useQuery<ConnectorResponse[]>({
    queryKey: ["/api/connectors"],
    enabled: isOnline,
  });

  const hasConnectors = connectors.length > 0;
  const hasImportedBefore = connectors.some(
    (c) =>
      c.connectorType === "csv" ||
      c.connectorType === "manual" ||
      c.totalLookups > 0
  );

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      const label =
        connected === "google_sheets"
          ? "Google Sheets"
          : connected === "hubspot"
          ? "HubSpot"
          : connected;
      toast({
        title: `${label} connected!`,
        description: "Your account has been linked successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      window.history.replaceState({}, "", "/dashboard/data-sources");
    }

    if (error) {
      const msg =
        error === "invalid_state"
          ? "Invalid session. Please try again."
          : "Connection failed. Please try again.";
      toast({
        title: "Connection Failed",
        description: msg,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/dashboard/data-sources");
    }
  }, [searchParams, toast, queryClient]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [queryClient]);

  const interestMutation = useMutation({
    mutationFn: (connectorType: string) =>
      apiRequest("/api/connectors/interest", {
        method: "POST",
        body: JSON.stringify({ connectorType }),
      }),
    onSuccess: () => {
      toast({
        title: "Interest recorded",
        description: "We'll notify you when this connector is available.",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/connectors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Connector disconnected" });
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      setActiveModal(null);
      setSelectedConnector(null);
    },
  });

  const createByokMutation = useMutation({
    mutationFn: (data: { connectorType: string; name: string; apiKey: string }) =>
      apiRequest("/api/connectors", {
        method: "POST",
        body: JSON.stringify({
          connectorType: data.connectorType,
          name: data.name,
          authType: "api_key",
          credentials: data.apiKey,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Connector added" });
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      setActiveModal(null);
      setByokKey("");
      setByokType("");
      setByokName("");
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to add connector",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = useCallback(
    async (id: number) => {
      setTestingConnector(id);
      try {
        const res = await apiRequest(`/api/connectors/${id}/test`, {
          method: "POST",
        });
        toast({
          title: "Connection successful",
          description: (res as { message?: string })?.message || "Connector is working.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      } catch (err: unknown) {
        toast({
          title: "Connection test failed",
          description: (err as Error)?.message || "Could not reach the service.",
          variant: "destructive",
        });
      } finally {
        setTestingConnector(null);
      }
    },
    [toast, queryClient]
  );

  const handleOAuthConnect = (provider: "google" | "hubspot") => {
    const returnUrl = encodeURIComponent("/dashboard/data-sources");
    window.location.href = `/api/oauth/${provider}/authorize?returnUrl=${returnUrl}`;
  };

  const openConnectorDetail = (connector: ConnectorResponse) => {
    setSelectedConnector(connector);
    setActiveModal("connector-detail");
  };

  const openByokSetup = (type: string) => {
    setByokType(type);
    setByokName(CONNECTOR_TYPES_INFO[type]?.label || type);
    setByokKey("");
    setShowKey(false);
    setActiveModal("connector-setup");
  };

  const googleConnector = connectors.find(
    (c) => c.connectorType === "google_sheets" && c.status !== "disconnected"
  );
  const hubspotConnector = connectors.find(
    (c) => c.connectorType === "hubspot" && c.status !== "disconnected"
  );

  const activeConnectors = connectors.filter(
    (c) =>
      c.connectorType !== "companies_house" &&
      c.connectorType !== "csv" &&
      c.connectorType !== "manual"
  );

  const byokConnectorTypes = Object.entries(CONNECTOR_TYPES_INFO).filter(
    ([, info]) => info.authType === "api_key" && !info.comingSoon
  );

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto" data-testid="loading-data-sources">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto" data-testid="page-data-sources">
      {!isOnline && (
        <Alert
          variant="destructive"
          className="sticky top-0 z-40"
          data-testid="banner-offline"
        >
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You&apos;re offline. Reconnect to manage your data sources.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">
            {hasConnectors ? "Data Sources" : "Get started by adding your contacts"}
          </h1>
          {hasConnectors && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect your data to create calling campaigns
            </p>
          )}
        </div>
      </div>

      {!hasConnectors && !hasImportedBefore && (
        <div className="space-y-3" data-testid="section-first-time">
          <Card
            className="hover-elevate cursor-pointer"
            onClick={() => setActiveModal("csv")}
            data-testid="card-upload-file"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-md bg-muted p-3">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Upload a File</p>
                <p className="text-sm text-muted-foreground">
                  Import from CSV or Excel
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          <Card
            className="hover-elevate cursor-pointer"
            onClick={() => handleOAuthConnect("google")}
            data-testid="card-connect-google"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-md bg-muted p-3">
                <SiGoogle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Connect Google Sheets</p>
                <p className="text-sm text-muted-foreground">
                  One-click import from your spreadsheets
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          <Card
            className="hover-elevate cursor-pointer"
            onClick={() => setActiveModal("manual")}
            data-testid="card-enter-manually"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-md bg-muted p-3">
                <Keyboard className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Enter Manually</p>
                <p className="text-sm text-muted-foreground">
                  Type in a few contacts
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          <button
            className="text-sm text-muted-foreground w-full text-center py-2"
            onClick={() => {}}
            data-testid="link-show-more-sources"
          >
            Show more sources
          </button>
        </div>
      )}

      {(hasConnectors || hasImportedBefore) && (
        <>
          <div className="space-y-3" data-testid="section-quick-actions">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => setActiveModal("csv")}
                data-testid="button-upload-contacts"
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm">Upload Contacts</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => setActiveModal("manual")}
                data-testid="button-enter-manually"
              >
                <Keyboard className="h-5 w-5" />
                <span className="text-sm">Enter Manually</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => setActiveModal("companies-house")}
                data-testid="button-search-companies"
              >
                <Building2 className="h-5 w-5" />
                <span className="text-sm">Search Companies</span>
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3" data-testid="section-one-click-connect">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              One-Click Connect
            </h2>

            <Card data-testid="card-google-sheets-connector">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="rounded-md bg-muted p-2.5 shrink-0">
                  <SiGoogle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">Google Sheets</p>
                    {!googleConnector && (
                      <Badge
                        variant="secondary"
                        className="text-xs no-default-hover-elevate no-default-active-elevate"
                      >
                        1-click
                      </Badge>
                    )}
                  </div>
                  {googleConnector ? (
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        Connected as {googleConnector.oauthEmail || "your account"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Import from any spreadsheet
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {googleConnector ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => openConnectorDetail(googleConnector)}
                        data-testid="button-google-import"
                      >
                        Import Contacts
                      </Button>
                      <button
                        className="text-xs text-muted-foreground"
                        onClick={() => {
                          setSelectedConnector(googleConnector);
                          setActiveModal("disconnect-confirm");
                        }}
                        data-testid="link-google-disconnect"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleOAuthConnect("google")}
                      className="w-full sm:w-auto"
                      data-testid="button-connect-google"
                    >
                      <SiGoogle className="h-4 w-4 mr-2" />
                      Connect with Google
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-hubspot-connector">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="rounded-md bg-muted p-2.5 shrink-0">
                  <SiHubspot className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">HubSpot</p>
                  {hubspotConnector ? (
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        Connected as {hubspotConnector.oauthEmail || "your account"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Import CRM contacts
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hubspotConnector ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => openConnectorDetail(hubspotConnector)}
                        data-testid="button-hubspot-import"
                      >
                        Import Contacts
                      </Button>
                      <button
                        className="text-xs text-muted-foreground"
                        onClick={() => {
                          setSelectedConnector(hubspotConnector);
                          setActiveModal("disconnect-confirm");
                        }}
                        data-testid="link-hubspot-disconnect"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleOAuthConnect("hubspot")}
                      className="w-full sm:w-auto"
                      data-testid="button-connect-hubspot"
                    >
                      <SiHubspot className="h-4 w-4 mr-2" />
                      Connect with HubSpot
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-salesforce-connector">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="rounded-md bg-muted p-2.5 shrink-0">
                  <SiSalesforce className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Salesforce</p>
                  <p className="text-sm text-muted-foreground">
                    Import CRM contacts
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className="text-xs no-default-hover-elevate no-default-active-elevate"
                  >
                    Coming Soon
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => interestMutation.mutate("salesforce")}
                    disabled={interestMutation.isPending}
                    data-testid="button-notify-salesforce"
                  >
                    {interestMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Bell className="h-3.5 w-3.5 mr-1.5" />
                        Notify Me
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {activeConnectors.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3" data-testid="section-connected-sources">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Connected Sources
                </h2>
                <div className="space-y-2">
                  {activeConnectors.map((connector) => (
                    <Card
                      key={connector.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => openConnectorDetail(connector)}
                      data-testid={`card-connector-${connector.id}`}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <ConnectorIcon
                          type={connector.connectorType}
                          className="h-5 w-5 text-muted-foreground shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {connector.name}
                          </p>
                          {connector.oauthEmail && (
                            <p className="text-xs text-muted-foreground truncate">
                              {connector.oauthEmail}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(connector.status)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <Accordion type="single" collapsible data-testid="section-advanced-sources">
            <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger className="text-sm font-semibold text-muted-foreground uppercase tracking-wide py-0 [&[data-state=open]>svg]:rotate-180">
                Advanced Sources (BYOK)
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-0">
                <div className="space-y-2">
                  {byokConnectorTypes.map(([type, info]) => {
                    const existing = connectors.find(
                      (c) => c.connectorType === type
                    );
                    return (
                      <Card key={type} data-testid={`card-byok-${type}`}>
                        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                          <ConnectorIcon
                            type={type}
                            className="h-5 w-5 text-muted-foreground shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">
                                {info.label}
                              </p>
                              {info.setupTime && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs no-default-hover-elevate no-default-active-elevate"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {info.setupTime} setup
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {info.description}
                            </p>
                          </div>
                          {existing ? (
                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusBadge(existing.status)}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openConnectorDetail(existing)}
                                data-testid={`button-manage-${type}`}
                              >
                                Manage
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openByokSetup(type)}
                              data-testid={`button-setup-${type}`}
                            >
                              <Key className="h-3.5 w-3.5 mr-1.5" />
                              Set Up
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {Object.entries(CONNECTOR_TYPES_INFO)
                    .filter(([, info]) => info.comingSoon && info.authType === "api_key")
                    .map(([type, info]) => (
                      <Card key={type} className="opacity-60" data-testid={`card-byok-${type}`}>
                        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                          <ConnectorIcon
                            type={type}
                            className="h-5 w-5 text-muted-foreground shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{info.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {info.description}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs no-default-hover-elevate no-default-active-elevate"
                          >
                            Coming Soon
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}

      <Dialog
        open={activeModal === "csv"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-csv-upload">
          <CsvUpload
            onComplete={() => {
              setActiveModal(null);
              queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
            }}
            onCancel={() => setActiveModal(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal === "manual"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-manual-entry">
          <ManualEntry
            onComplete={() => {
              setActiveModal(null);
              queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
            }}
            onCancel={() => setActiveModal(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal === "companies-house"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" data-testid="dialog-companies-house">
          <CompaniesHouseSearch
            onClose={() => setActiveModal(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal === "connector-detail" && !!selectedConnector}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setSelectedConnector(null);
          }
        }}
      >
        <DialogContent className="max-w-md" data-testid="dialog-connector-detail">
          {selectedConnector && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <ConnectorIcon
                    type={selectedConnector.connectorType}
                    className="h-6 w-6"
                  />
                  <div>
                    <DialogTitle>{selectedConnector.name}</DialogTitle>
                    <DialogDescription className="mt-0.5">
                      {selectedConnector.oauthEmail
                        ? `Connected as ${selectedConnector.oauthEmail}`
                        : selectedConnector.connectorType}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(selectedConnector.status)}
                <span className="text-xs text-muted-foreground">
                  Connected{" "}
                  {new Date(selectedConnector.createdAt).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "short", year: "numeric" }
                  )}
                </span>
              </div>

              {(selectedConnector.status === "expired" ||
                selectedConnector.status === "disconnected") && (
                <Alert variant="destructive" data-testid="alert-connector-expired">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {selectedConnector.status === "expired"
                      ? "Connection expired"
                      : "You've disconnected this source"}
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() =>
                        handleOAuthConnect(
                          selectedConnector.connectorType === "google_sheets"
                            ? "google"
                            : "hubspot"
                        )
                      }
                      data-testid="button-reconnect"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Reconnect
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Total lookups
                  </span>
                  <span className="text-sm font-medium">
                    {selectedConnector.totalLookups}
                  </span>
                </div>

                {selectedConnector.lastTestedAt && (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      Last tested
                    </span>
                    <span className="text-sm">
                      {new Date(
                        selectedConnector.lastTestedAt
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {selectedConnector.maskedKey && (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      API Key
                    </span>
                    <span className="text-sm font-mono">
                      {selectedConnector.maskedKey}
                    </span>
                  </div>
                )}

                {selectedConnector.lastErrorMessage && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {selectedConnector.lastErrorMessage}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-col">
                {selectedConnector.authType === "api_key" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      handleTestConnection(selectedConnector.id)
                    }
                    disabled={testingConnector === selectedConnector.id}
                    data-testid="button-test-connection"
                  >
                    {testingConnector === selectedConnector.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full text-destructive"
                  onClick={() => setActiveModal("disconnect-confirm")}
                  data-testid="button-disconnect"
                >
                  <Unplug className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal === "disconnect-confirm" && !!selectedConnector}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setSelectedConnector(null);
          }
        }}
      >
        <DialogContent className="max-w-sm" data-testid="dialog-disconnect-confirm">
          <DialogHeader>
            <DialogTitle>Disconnect {selectedConnector?.name}?</DialogTitle>
            <DialogDescription>
              This won&apos;t delete contacts already imported. You can reconnect
              anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setActiveModal(null);
                setSelectedConnector(null);
              }}
              data-testid="button-cancel-disconnect"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedConnector &&
                disconnectMutation.mutate(selectedConnector.id)
              }
              disabled={disconnectMutation.isPending}
              data-testid="button-confirm-disconnect"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal === "connector-setup"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setByokKey("");
            setByokType("");
            setByokName("");
          }
        }}
      >
        <DialogContent className="max-w-md" data-testid="dialog-connector-setup">
          <DialogHeader>
            <DialogTitle>
              Set Up {CONNECTOR_TYPES_INFO[byokType]?.label || byokType}
            </DialogTitle>
            <DialogDescription>
              Enter your API key to connect. Your key is encrypted and stored
              securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="byok-name" className="text-sm">
                Display Name
              </Label>
              <Input
                id="byok-name"
                value={byokName}
                onChange={(e) => setByokName(e.target.value)}
                placeholder="My API Key"
                className="mt-1"
                data-testid="input-byok-name"
              />
            </div>

            <div>
              <Label htmlFor="byok-key" className="text-sm">
                API Key
              </Label>
              <div className="relative mt-1">
                <Input
                  id="byok-key"
                  type={showKey ? "text" : "password"}
                  value={byokKey}
                  onChange={(e) => setByokKey(e.target.value)}
                  placeholder="Paste your API key..."
                  className="pr-10"
                  data-testid="input-byok-key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowKey(!showKey)}
                  data-testid="button-toggle-key-visibility"
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {byokKey && byokKey.startsWith("http") && (
                <p className="text-xs text-destructive mt-1" data-testid="text-key-format-hint">
                  That looks like a URL, not an API key. The key usually starts
                  with &quot;AIza...&quot;
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setActiveModal(null);
                setByokKey("");
                setByokType("");
              }}
              data-testid="button-cancel-setup"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                createByokMutation.mutate({
                  connectorType: byokType,
                  name: byokName,
                  apiKey: byokKey,
                })
              }
              disabled={
                !byokKey.trim() || !byokName.trim() || createByokMutation.isPending
              }
              data-testid="button-save-connector"
            >
              {createByokMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Save & Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
