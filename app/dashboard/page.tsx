"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PhoneCall, Clock, Users, Bot, CreditCard,
  PhoneIncoming, PhoneOutgoing, ArrowRight, Activity,
  ChevronRight, GitBranch, Zap, CheckCircle2, Circle, Sparkles,
  Radio, PhoneOff, Target, Headphones, Cloud, Key, Server, Shield,
  Check, MessageSquare, Globe, MapPin,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { CustomIcon } from "@/components/ui/custom-icon";

interface Usage {
  minutesUsed: number;
  minuteLimit: number;
  callCount: number;
  leadsCaptured: number;
}

interface Call {
  id: number;
  direction: string;
  callerNumber: string;
  duration: number;
  status: string;
  createdAt: string;
}

interface AgentStat {
  id: number;
  name: string;
  agentType: string;
  departmentName: string | null;
  isRouter: boolean;
  callCount: number;
  totalMinutes: number;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
}

interface AgentStatsData {
  totalAgents: number;
  agentBreakdown: AgentStat[];
  hopStats: { totalHops: number; totalHopCost: number };
  flowComplexity: { complexityTier: string; multiplier: number; agentCount: number } | null;
  hasActiveFlow: boolean;
}

interface OnboardingData {
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  allComplete: boolean;
}

interface TodayStatsData {
  totalToday: number;
  completedToday: number;
  activeNow: number;
  failedToday: number;
  totalMinutesToday: number;
  leadsToday: number;
}

interface InternationalSummary {
  activeCountries: { id: number; name: string; isoCode: string; callingCode: string; region: string; tier: string; status: string }[];
  allAvailableCountries: { id: number; name: string; isoCode: string; callingCode: string; region: string; tier: string; status: string }[];
  countryCallStats: { countryCode: string | null; totalCalls: number; avgDuration: string | null }[];
  compliance: { totalCalls: number; dncBlocked: number; disclosurePlayed: number; consentObtained: number; rate: number };
  totalCountries: number;
  countriesWithCalls: number;
  hasCallHistory: boolean;
}

interface LiveActiveCall {
  id: number;
  direction: string;
  callerNumber: string;
  status: string;
  currentState: string;
  startedAt: string | null;
  agentName: string | null;
  turnCount: number;
  handoffTriggered: boolean;
}

interface LiveRecentCall {
  id: number;
  direction: string;
  callerNumber: string;
  status: string;
  duration: number;
  endedAt: string | null;
  agentName: string | null;
  qualityScore: string | null;
  sentimentLabel: string | null;
  leadCaptured: boolean;
}

interface LiveAgentStatus {
  id: number;
  name: string;
  activeCalls: number;
  isOnCall: boolean;
  status: string;
}

interface LiveDashboardData {
  activeCalls: LiveActiveCall[];
  recentCompleted: LiveRecentCall[];
  todayStats: {
    totalToday: number;
    completedToday: number;
    activeNow: number;
    failedToday: number;
    totalMinutesToday: number;
    inboundToday: number;
    outboundToday: number;
  };
  agentStatus: LiveAgentStatus[];
}

function LiveDuration({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span className="font-mono text-xs font-semibold">{m}:{s.toString().padStart(2, "0")}</span>;
}

const demoChartData = [
  { name: "Mon", calls: 0 },
  { name: "Tue", calls: 0 },
  { name: "Wed", calls: 0 },
  { name: "Thu", calls: 0 },
  { name: "Fri", calls: 0 },
  { name: "Sat", calls: 0 },
  { name: "Sun", calls: 0 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [subscription, setSubscription] = useState<{ planId: number } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [agentStats, setAgentStats] = useState<AgentStatsData | null>(null);
  const [loadingAgentStats, setLoadingAgentStats] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStatsData | null>(null);
  const [liveData, setLiveData] = useState<LiveDashboardData | null>(null);
  const [deploymentModel, setDeploymentModel] = useState<string | null>(null);
  const [serviceHealth, setServiceHealth] = useState<"healthy" | "unhealthy" | null>(null);
  const [internationalData, setInternationalData] = useState<InternationalSummary | null>(null);
  const [loadingInternational, setLoadingInternational] = useState(true);

  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gorigo_onboarding_dismissed") === "true";
    }
    return false;
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((d) => {
        if (d?.user) setBusinessName(d.user.businessName || "");
        if (d?.org?.deploymentModel) setDeploymentModel(d.org.deploymentModel);
      })
      .catch((error) => { console.error("Fetch dashboard user data failed:", error); });

    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        if (d?.usage) setUsage(d.usage);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoadingUsage(false));

    fetch("/api/calls?limit=5")
      .then((r) => r.json())
      .then((d) => {
        if (d?.calls) setCalls(d.calls);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoadingCalls(false));

    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then((d) => {
        if (d?.subscription) setSubscription(d.subscription);
      })
      .catch((error) => { console.error("Fetch subscription failed:", error); });

    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d?.wallet) setWalletBalance(d.wallet.balance);
      })
      .catch((error) => { console.error("Fetch wallet balance failed:", error); });

    fetch("/api/agents/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setAgentStats(d);
      })
      .catch((error) => { console.error("Fetch agent stats failed:", error); })
      .finally(() => setLoadingAgentStats(false));

    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setOnboarding(d);
      })
      .catch((error) => { console.error("Fetch onboarding status failed:", error); });

    fetch("/api/international/summary")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setInternationalData(d);
      })
      .catch((error) => { console.error("Fetch international summary failed:", error); })
      .finally(() => setLoadingInternational(false));

    const fetchTodayStats = () => {
      fetch("/api/calls/today")
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) setTodayStats(d);
        })
        .catch((error) => { console.error("Fetch today call stats failed:", error); });
    };
    fetchTodayStats();
    const todayInterval = setInterval(fetchTodayStats, 15000);

    const fetchLiveData = () => {
      fetch("/api/calls/live")
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) setLiveData(d);
        })
        .catch((error) => { console.error("Fetch live call data failed:", error); });
    };
    fetchLiveData();
    const liveInterval = setInterval(fetchLiveData, 5000);

    const fetchHealth = () => {
      fetch("/api/health")
        .then((r) => r.json())
        .then((d) => {
          setServiceHealth(d?.status === "healthy" ? "healthy" : "unhealthy");
        })
        .catch(() => setServiceHealth("unhealthy"));
    };
    fetchHealth();
    const healthInterval = setInterval(fetchHealth, 30000);

    return () => { clearInterval(todayInterval); clearInterval(liveInterval); clearInterval(healthInterval); };
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const minutePercent = usage ? Math.min((usage.minutesUsed / (usage.minuteLimit || 1)) * 100, 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-dashboard-greeting">
            {businessName ? businessName : "Dashboard"}
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-sm text-muted-foreground">Overview of your AI call center</p>
            {serviceHealth && deploymentModel === "managed" && (
              <div className="flex items-center gap-1" data-testid="indicator-service-health">
                <span className={cn(
                  "relative flex h-2 w-2",
                )}>
                  {serviceHealth === "healthy" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  )}
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    serviceHealth === "healthy" ? "bg-green-500" : "bg-red-500"
                  )} />
                </span>
                <span className={cn(
                  "text-xs",
                  serviceHealth === "healthy" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {serviceHealth === "healthy" ? "All systems operational" : "Service disruption"}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm" data-testid="button-try-demo">
            <Link href="/dashboard/demo">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Live Demo
            </Link>
          </Button>
          <Button asChild size="sm" data-testid="button-configure-agent">
            <Link href="/dashboard/agent">
              <CustomIcon name="ai-voice-head" size={14} className="mr-1.5" />
              Configure Agent
            </Link>
          </Button>
        </div>
      </div>

      {deploymentModel && (
        <Card data-testid="card-deployment-model">
          <CardContent className="flex items-center justify-between gap-4 p-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                deploymentModel === "managed" ? "bg-blue-500/10" : deploymentModel === "byok" ? "bg-amber-500/10" : deploymentModel === "custom" ? "bg-violet-500/10" : "bg-emerald-500/10"
              )}>
                {deploymentModel === "managed" ? (
                  <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ) : deploymentModel === "byok" ? (
                  <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : deploymentModel === "custom" ? (
                  <MessageSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                ) : (
                  <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" data-testid="text-deployment-label">
                    {deploymentModel === "managed" ? "Managed Package" : deploymentModel === "byok" ? "BYOK Package" : deploymentModel === "custom" ? "Custom Package" : "Self-Hosted Package"}
                  </span>
                  <Badge variant="secondary" className="no-default-hover-elevate text-[11px]" data-testid="badge-rate">
                    {deploymentModel === "managed" ? "\u00A30.15/min" : deploymentModel === "byok" ? "\u00A30.05/min" : deploymentModel === "custom" ? "Custom" : "\u00A30.03/min"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {deploymentModel === "managed"
                    ? "AI + Telephony included \u2022 Fully managed"
                    : deploymentModel === "byok"
                      ? "Platform fee only \u2022 Your API keys"
                      : deploymentModel === "custom"
                        ? "Tailored solution \u2022 Custom rates"
                        : "Licence fee only \u2022 Your infrastructure"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {deploymentModel === "managed" && (
                <>
                  <Badge variant="outline" className="no-default-hover-elevate text-[11px]" data-testid="badge-ai-included">
                    <Shield className="h-3 w-3 mr-1" />
                    AI Included
                  </Badge>
                  <Badge variant="outline" className="no-default-hover-elevate text-[11px]" data-testid="badge-telephony-included">
                    <PhoneCall className="h-3 w-3 mr-1" />
                    Telephony Included
                  </Badge>
                </>
              )}
              {deploymentModel === "byok" && (
                <Badge variant="outline" className="no-default-hover-elevate text-[11px]" data-testid="badge-byok-keys">
                  <Key className="h-3 w-3 mr-1" />
                  Your API Keys
                </Badge>
              )}
              {deploymentModel === "self_hosted" && (
                <Badge variant="outline" className="no-default-hover-elevate text-[11px]" data-testid="badge-self-hosted-infra">
                  <Server className="h-3 w-3 mr-1" />
                  Your Infrastructure
                </Badge>
              )}
              {deploymentModel === "custom" && (
                <Badge variant="outline" className="no-default-hover-elevate text-[11px]" data-testid="badge-custom-bespoke">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Bespoke Solution
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="text-sm text-muted-foreground py-2" data-testid="text-dashboard-error">
          Some data failed to load.
        </div>
      )}

      {onboarding && !onboarding.allComplete && !onboardingDismissed && (
        <Card data-testid="card-onboarding-checklist">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Getting Started</span>
                <Badge variant="secondary" className="text-xs no-default-hover-elevate">{onboarding.completedCount}/{onboarding.totalSteps}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setOnboardingDismissed(true); localStorage.setItem("gorigo_onboarding_dismissed", "true"); }} data-testid="button-dismiss-onboarding">
                Dismiss
              </Button>
            </div>
            <Progress value={(onboarding.completedCount / onboarding.totalSteps) * 100} className="h-1 mb-3" data-testid="progress-onboarding" />
            <div className="grid gap-1.5 sm:grid-cols-2">
              {onboarding.steps.map((step) => (
                <Link
                  key={step.id}
                  href={step.link}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded hover-elevate text-sm"
                  data-testid={`link-onboarding-${step.id}`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className={step.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                      {step.title}
                    </span>
                    {step.description && !step.completed && (
                      <p className="text-[11px] text-muted-foreground truncate">{step.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Calls</span>
              <CustomIcon name="vr-phone-mic" size={16} className="text-muted-foreground/60" />
            </div>
            {loadingUsage ? <Skeleton className="h-7 w-16" /> : (
              <p className="text-2xl font-semibold" data-testid="text-total-calls">{usage?.callCount ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Minutes Used</span>
              <Clock className="h-4 w-4 text-muted-foreground/60" />
            </div>
            {loadingUsage ? <Skeleton className="h-7 w-16" /> : (
              <p className="text-2xl font-semibold" data-testid="text-minutes-used">{Math.round(usage?.minutesUsed ?? 0)}</p>
            )}
            {!loadingUsage && (
              <div className="mt-2">
                <Progress value={minutePercent} className="h-1" data-testid="progress-minutes" />
                <p className="text-xs text-muted-foreground mt-1">of {usage?.minuteLimit ?? 0} min</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leads</span>
              <Users className="h-4 w-4 text-muted-foreground/60" />
            </div>
            {loadingUsage ? <Skeleton className="h-7 w-16" /> : (
              <p className="text-2xl font-semibold" data-testid="text-leads-captured">{usage?.leadsCaptured ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Balance</span>
              <CreditCard className="h-4 w-4 text-muted-foreground/60" />
            </div>
            {loadingUsage ? <Skeleton className="h-7 w-16" /> : (
              <p className="text-2xl font-semibold" data-testid="text-wallet-balance">
                {walletBalance !== null ? `\u00A3${Number(walletBalance).toFixed(2)}` : "\u00A30.00"}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{subscription ? "Active plan" : "Prepaid"}</p>
          </CardContent>
        </Card>
      </div>

      {todayStats && (
        <Card data-testid="card-today-activity">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-sm font-medium">Today</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Live</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: "Calls", value: todayStats.totalToday, id: "text-today-total" },
                { label: "Completed", value: todayStats.completedToday, id: "text-today-completed" },
                { label: "Active", value: todayStats.activeNow, id: "text-today-active" },
                { label: "Failed", value: todayStats.failedToday, id: "text-today-failed" },
                { label: "Minutes", value: todayStats.totalMinutesToday, id: "text-today-minutes" },
                { label: "Leads", value: todayStats.leadsToday, id: "text-today-leads" },
              ].map((stat) => (
                <div key={stat.id} className="text-center">
                  <p className="text-lg font-semibold" data-testid={stat.id}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-international-calling">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 pb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-sm font-medium">International Calling</CardTitle>
            {internationalData && (
              <Badge variant="secondary" className="no-default-hover-elevate text-[11px]">
                {internationalData.hasCallHistory
                  ? `${internationalData.countriesWithCalls} active`
                  : `${internationalData.totalCountries} available`}
              </Badge>
            )}
          </div>
          <Button asChild variant="ghost" size="sm" data-testid="button-view-international">
            <Link href="/dashboard/compliance">
              Details
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loadingInternational ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !internationalData || internationalData.totalCountries === 0 ? (
            <div className="text-center py-6">
              <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-countries">
                No countries available.
              </p>
            </div>
          ) : !internationalData.hasCallHistory ? (
            <div className="space-y-3">
              <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Ready to call {internationalData.totalCountries} countries</p>
                    <p className="text-muted-foreground mt-0.5">
                      Your platform supports international calling across {internationalData.totalCountries} countries with automatic compliance. Start a campaign to see per-country analytics here.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {internationalData.activeCountries.slice(0, 10).map((country) => (
                  <div
                    key={country.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs"
                    data-testid={`badge-country-${country.isoCode}`}
                  >
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-medium">{country.isoCode}</span>
                  </div>
                ))}
                {internationalData.activeCountries.length > 10 && (
                  <div className="flex items-center px-2 py-1 text-xs text-muted-foreground">
                    +{internationalData.activeCountries.length - 10} more
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button asChild variant="outline" size="sm" data-testid="button-intl-campaigns">
                  <Link href="/dashboard/campaigns">
                    <Target className="h-3.5 w-3.5 mr-1.5" />
                    Start Campaign
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" data-testid="button-intl-compliance">
                  <Link href="/dashboard/compliance">
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                    Compliance
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded bg-muted/50">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Active</p>
                  <p className="text-lg font-semibold" data-testid="text-intl-countries">{internationalData.countriesWithCalls}</p>
                </div>
                <div className="p-3 rounded bg-muted/50">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Available</p>
                  <p className="text-lg font-semibold" data-testid="text-intl-available">{internationalData.totalCountries}</p>
                </div>
                <div className="p-3 rounded bg-muted/50">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Compliance</p>
                  <p className={cn("text-lg font-semibold", internationalData.compliance.rate >= 90 ? "text-emerald-600 dark:text-emerald-400" : internationalData.compliance.rate >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")} data-testid="text-intl-compliance">{internationalData.compliance.rate}%</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {internationalData.activeCountries.slice(0, 12).map((country) => (
                  <div
                    key={country.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/20 bg-primary/5 text-xs"
                    data-testid={`badge-country-${country.isoCode}`}
                  >
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-medium">{country.isoCode}</span>
                    <span className="text-muted-foreground hidden sm:inline">{country.callingCode}</span>
                  </div>
                ))}
                {internationalData.activeCountries.length > 12 && (
                  <div className="flex items-center px-2 py-1 text-xs text-muted-foreground">
                    +{internationalData.activeCountries.length - 12} more
                  </div>
                )}
              </div>

              {internationalData.countryCallStats.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">Country</TableHead>
                        <TableHead className="text-right text-[11px]">Calls</TableHead>
                        <TableHead className="text-right text-[11px]">Avg Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {internationalData.countryCallStats.slice(0, 5).map((stat) => {
                        const country = internationalData.activeCountries.find((c) => c.isoCode === stat.countryCode)
                          || internationalData.allAvailableCountries?.find((c) => c.isoCode === stat.countryCode);
                        return (
                          <TableRow key={stat.countryCode || "unknown"} data-testid={`row-intl-${stat.countryCode}`}>
                            <TableCell className="text-[13px]">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="font-medium">{country?.name || stat.countryCode || "Unknown"}</span>
                                {country && <span className="text-muted-foreground text-xs">{country.callingCode}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-[13px] font-mono">{stat.totalCalls}</TableCell>
                            <TableCell className="text-right text-[13px] font-mono">
                              {stat.avgDuration ? `${Math.round(Number(stat.avgDuration))}s` : "--"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <Button asChild variant="outline" size="sm" data-testid="button-intl-compliance">
                  <Link href="/dashboard/compliance">
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                    Compliance
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" data-testid="button-intl-campaigns">
                  <Link href="/dashboard/campaigns">
                    <Target className="h-3.5 w-3.5 mr-1.5" />
                    Campaigns
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" data-testid="button-intl-settings">
                  <Link href="/dashboard/settings">
                    <Globe className="h-3.5 w-3.5 mr-1.5" />
                    Settings
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {liveData && (liveData.activeCalls.length > 0 || liveData.recentCompleted.length > 0) && (
        <Card data-testid="card-live-activity">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-sm font-medium">Live Activity</CardTitle>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </div>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-call-centre">
              <Link href="/dashboard/calls">
                Call Centre
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid gap-4 lg:grid-cols-2">
              {liveData.activeCalls.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Active Calls</p>
                  <div className="space-y-2">
                    {liveData.activeCalls.slice(0, 4).map((call) => (
                      <div
                        key={call.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-muted/40"
                        data-testid={`row-live-call-${call.id}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm font-medium">{call.callerNumber || "Unknown"}</span>
                            {call.agentName && (
                              <span className="text-xs text-muted-foreground ml-2">{call.agentName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">{call.currentState}</Badge>
                          {call.startedAt && <LiveDuration startedAt={call.startedAt} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {liveData.recentCompleted.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Recently Completed</p>
                  <div className="space-y-2">
                    {liveData.recentCompleted.slice(0, 4).map((call) => (
                      <div
                        key={call.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-md"
                        data-testid={`row-recent-completed-${call.id}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${
                            call.status === "completed" ? "bg-emerald-500/10" : "bg-red-500/10"
                          }`}>
                            {call.status === "completed" ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <PhoneOff className="w-3 h-3 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-medium">{call.callerNumber || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {call.duration > 0 ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, "0")}` : "0:00"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {call.qualityScore && Number(call.qualityScore) > 0 && (
                            <span className={cn("text-xs font-semibold",
                              Number(call.qualityScore) >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                              Number(call.qualityScore) >= 60 ? "text-amber-600 dark:text-amber-400" :
                              "text-red-600 dark:text-red-400"
                            )}>
                              {Math.round(Number(call.qualityScore))}%
                            </span>
                          )}
                          {call.sentimentLabel && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">
                              {call.sentimentLabel.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 pb-0">
            <CardTitle className="text-sm font-medium">Call Activity</CardTitle>
            <Badge variant="secondary" className="no-default-hover-elevate text-[11px]">This Week</Badge>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demoChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(207, 100%, 41%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(207, 100%, 41%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-[11px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis className="text-[11px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="hsl(207, 100%, 41%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#callGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            {[
              { href: "/dashboard/agent", icon: Bot, label: "Agent Config", desc: "Set up AI voice agent", id: "link-quick-agent" },
              { href: "/dashboard/calls", icon: PhoneCall, label: "Call History", desc: "Review call logs", id: "link-quick-calls" },
              { href: "/dashboard/billing", icon: CreditCard, label: "Billing", desc: "Monitor costs", id: "link-quick-billing" },
              { href: "/dashboard/knowledge", icon: Target, label: "Knowledge Base", desc: "Manage AI knowledge", id: "link-quick-knowledge" },
            ].map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="flex items-center gap-3 px-2.5 py-2 rounded hover-elevate"
                data-testid={action.id}
              >
                <action.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground">{action.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {agentStats && agentStats.totalAgents > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Agents</CardTitle>
              {agentStats.flowComplexity && (
                <Badge variant="outline" className="no-default-hover-elevate text-[11px]" data-testid="badge-flow-complexity">
                  {agentStats.flowComplexity.complexityTier}
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate text-[11px]" data-testid="badge-total-agents">
              {agentStats.totalAgents} agent{agentStats.totalAgents !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loadingAgentStats ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3 mb-3">
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Active</p>
                    <p className="text-lg font-semibold" data-testid="text-active-agents">{agentStats.totalAgents}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Hops</p>
                    <p className="text-lg font-semibold" data-testid="text-total-hops">{agentStats.hopStats.totalHops}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Hop Cost</p>
                    <p className="text-lg font-semibold" data-testid="text-hop-cost">&pound;{Number(agentStats.hopStats.totalHopCost).toFixed(2)}</p>
                  </div>
                </div>
                {agentStats.agentBreakdown.length > 1 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px]">Agent</TableHead>
                          <TableHead className="text-[11px]">Type</TableHead>
                          <TableHead className="text-right text-[11px]">Calls</TableHead>
                          <TableHead className="text-right text-[11px]">Minutes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentStats.agentBreakdown.map((agent) => (
                          <TableRow key={agent.id} data-testid={`row-agent-${agent.id}`}>
                            <TableCell className="text-[13px] font-medium">{agent.name}</TableCell>
                            <TableCell>
                              <Badge variant={agent.isRouter ? "default" : "secondary"} className="no-default-hover-elevate text-[11px]">
                                {agent.isRouter ? "Router" : agent.agentType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-[13px]">{agent.callCount}</TableCell>
                            <TableCell className="text-right text-[13px] font-mono">{agent.totalMinutes}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 pb-2">
          <CardTitle className="text-sm font-medium">Recent Calls</CardTitle>
          <Button asChild variant="ghost" size="sm" data-testid="button-view-calls">
            <Link href="/dashboard/calls">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loadingCalls ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-8">
              <PhoneCall className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-calls">
                No calls yet. Your call history will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Time</TableHead>
                    <TableHead className="text-[11px]">Direction</TableHead>
                    <TableHead className="text-[11px]">Caller</TableHead>
                    <TableHead className="text-[11px]">Duration</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow key={call.id} data-testid={`row-call-${call.id}`}>
                      <TableCell className="text-[13px] whitespace-nowrap">{formatTime(call.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={call.direction === "inbound" ? "secondary" : "outline"} className="no-default-hover-elevate text-[11px]">
                          {call.direction === "inbound" ? (
                            <PhoneIncoming className="h-3 w-3 mr-1" />
                          ) : (
                            <PhoneOutgoing className="h-3 w-3 mr-1" />
                          )}
                          {call.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[13px]">{call.callerNumber || "Unknown"}</TableCell>
                      <TableCell className="text-[13px] font-mono">{formatDuration(call.duration || 0)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={call.status === "completed" ? "default" : "destructive"}
                          className="no-default-hover-elevate text-[11px]"
                        >
                          {call.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
