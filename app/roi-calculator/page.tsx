"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { TalkTimeInfo, TalkTimeFootnote } from "@/components/talk-time-info";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  TrendingDown,
  Clock,
  Users,
  Phone,
  PoundSterling,
  Cpu,
  Building2,
  Handshake,
  Shield,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CUSTOMER_TIERS,
  PRESET_SCENARIOS,
  INDUSTRY_BENCHMARKS,
  AFFILIATE_COMMISSION_RATE,
  calculateFullHumanCost,
  calculateAICost,
  calculatePartnerMargin,
  calculateAffiliateEarnings,
  calculateSavings,
  calculatePayback,
  calculateMultiYear,
  calculateSensitivity,
  calculateRevenueImpact,
  formatGBP,
  formatPercent,
  formatNumber,
  type TierKey,
  type ScenarioKey,
} from "@/lib/pricing-config";

type Persona = "explorer" | "technical" | "partner";

const PERSONAS = [
  {
    key: "explorer" as const,
    label: "I'm exploring AI for my business",
    shortLabel: "Exploring AI",
    icon: Building2,
    tier: "direct" as TierKey,
    description: "See how much you could save — no technical knowledge needed",
  },
  {
    key: "technical" as const,
    label: "I'm technical / I have API keys",
    shortLabel: "Technical",
    icon: Cpu,
    tier: "byok" as TierKey,
    description: "Full cost transparency with build-vs-buy comparison",
  },
  {
    key: "partner" as const,
    label: "I want to resell / white-label",
    shortLabel: "Partner",
    icon: Handshake,
    tier: "whiteLabel" as TierKey,
    description: "Calculate your margins and partner earnings",
  },
];

function SliderWithInput({
  label,
  value,
  min,
  max,
  step,
  unit,
  icon: Icon,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: typeof Calculator;
  onChange: (v: number) => void;
  testId: string;
}) {
  const displayValue = unit === "£" ? formatGBP(value) : formatNumber(value);

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= min && v <= max) onChange(v);
            }}
            className="w-24 h-8 text-right text-sm font-mono tabular-nums"
            data-testid={`${testId}-input`}
          />
          {unit && unit !== "£" && (
            <span className="text-xs text-muted-foreground">{unit}</span>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        data-testid={`${testId}-slider`}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {unit === "£" ? formatGBP(min) : formatNumber(min)}
        </span>
        <span className="text-xs text-muted-foreground">
          {unit === "£" ? formatGBP(max) : formatNumber(max)}
        </span>
      </div>
    </div>
  );
}

function SavingsCard({
  label,
  value,
  sublabel,
  icon: Icon,
  highlight,
  testId,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: typeof Calculator;
  highlight?: boolean;
  testId: string;
}) {
  return (
    <Card className={highlight ? "border-primary/40" : ""} data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-2xl font-semibold tabular-nums" data-testid={`${testId}-value`}>{value}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

function PersonaExplorer({
  callsPerMonth,
  avgDuration,
  automationRate,
}: {
  callsPerMonth: number;
  avgDuration: number;
  automationRate: number;
}) {
  const tier = CUSTOMER_TIERS.direct;
  const totalMinutes = callsPerMonth * avgDuration;
  const aiMinutes = totalMinutes * (automationRate / 100);

  const agentCount = Math.max(1, Math.ceil(callsPerMonth / 600));
  const humanCost = calculateFullHumanCost(agentCount);
  const aiCost = calculateAICost(aiMinutes, "direct");
  const reducedAgents = Math.max(1, Math.ceil(agentCount * (1 - automationRate / 100)));
  const reducedHumanCost = calculateFullHumanCost(reducedAgents);
  const totalAICost = aiCost + reducedHumanCost;

  const savings = calculateSavings(humanCost, totalAICost);
  const payback = calculatePayback(savings.monthlySavings);
  const revenueImpact = calculateRevenueImpact(callsPerMonth, 0.15);
  const multiYear3 = calculateMultiYear(savings.monthlySavings, 3);

  const comparisonData = [
    { name: "Today", cost: Math.round(humanCost), fill: "hsl(var(--muted-foreground))" },
    { name: "With GoRigo", cost: Math.round(totalAICost), fill: "hsl(148, 72%, 34%)" },
  ];

  return (
    <div className="space-y-6" data-testid="section-persona-explorer">
      <Card className="border-primary/30 bg-primary/[0.02]" data-testid="card-explorer-summary">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">Based on your numbers, you could save approximately</p>
            <p className="text-5xl sm:text-6xl font-semibold text-primary tabular-nums" data-testid="text-explorer-savings">
              {formatGBP(savings.monthlySavings)}
            </p>
            <p className="text-lg text-muted-foreground">
              every month — that's <span className="font-medium text-foreground">{formatGBP(savings.annualSavings)}</span> per year
            </p>
            <p className="text-sm text-muted-foreground">
              Your rate: <span className="font-medium text-foreground">{formatGBP(tier.ratePerMinute, 2)}/min</span> of talk time<TalkTimeInfo />
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SavingsCard
          label="Monthly Savings"
          value={formatGBP(savings.monthlySavings)}
          sublabel={`${savings.savingsPercent.toFixed(0)}% less than today`}
          icon={TrendingDown}
          highlight
          testId="metric-explorer-monthly"
        />
        <SavingsCard
          label="3-Year Savings"
          value={formatGBP(multiYear3)}
          sublabel="Cumulative over 3 years"
          icon={PoundSterling}
          testId="metric-explorer-3year"
        />
        <SavingsCard
          label="Recovered Revenue"
          value={formatGBP(revenueImpact.additionalRevenuePerMonth)}
          sublabel={`${revenueImpact.recoveredCallsPerMonth} missed calls/mo recovered`}
          icon={Phone}
          testId="metric-explorer-revenue"
        />
        <SavingsCard
          label="Payback"
          value={payback === Infinity ? "N/A" : `${payback} month${payback === 1 ? "" : "s"}`}
          sublabel="To recover setup cost"
          icon={Clock}
          testId="metric-explorer-payback"
        />
      </div>

      <Card data-testid="card-explorer-comparison">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Your Monthly Costs: Before vs After
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} barSize={80}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [formatGBP(v), "Monthly Cost"]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]} fill="hsl(148, 72%, 34%)">
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-explorer-plain-summary">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-medium">What this means for your business</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">24/7 coverage</p>
                <p className="text-xs text-muted-foreground">Your AI agents never sleep, take breaks, or call in sick</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Staff from {agentCount} to {reducedAgents}</p>
                <p className="text-xs text-muted-foreground">Keep your best people for complex calls</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">No more missed calls</p>
                <p className="text-xs text-muted-foreground">~{revenueImpact.recoveredCallsPerMonth} calls/month currently going to voicemail</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Consistent quality</p>
                <p className="text-xs text-muted-foreground">Every call handled the same way, every time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PersonaTechnical({
  callsPerMonth,
  avgDuration,
  agentCount,
  agentSalary,
  automationRate,
}: {
  callsPerMonth: number;
  avgDuration: number;
  agentCount: number;
  agentSalary: number;
  automationRate: number;
}) {
  const [estimatedApiRate, setEstimatedApiRate] = useState(0.025);

  const totalMinutes = callsPerMonth * avgDuration;
  const aiMinutes = totalMinutes * (automationRate / 100);

  const humanCost = calculateFullHumanCost(agentCount, agentSalary);
  const byokPlatformCost = calculateAICost(aiMinutes, "byok");
  const estimatedApiCost = aiMinutes * estimatedApiRate;
  const byokTotalCost = byokPlatformCost + estimatedApiCost;

  const managedCost = calculateAICost(aiMinutes, "direct");

  const reducedAgents = Math.max(1, Math.ceil(agentCount * (1 - automationRate / 100)));
  const reducedHumanCost = calculateFullHumanCost(reducedAgents, agentSalary);

  const byokFullCost = byokTotalCost + reducedHumanCost;
  const managedFullCost = managedCost + reducedHumanCost;

  const byokSavings = calculateSavings(humanCost, byokFullCost);
  const managedSavings = calculateSavings(humanCost, managedFullCost);

  const sensitivity = calculateSensitivity(byokSavings.monthlySavings, 0.15, 0.20);

  const buildVsBuyData = [
    { category: "AI/ML Engineering (2 FTEs)", buildCost: "£120,000/yr", gorigo: "Included" },
    { category: "Twilio Integration & Maintenance", buildCost: "£15,000/yr", gorigo: "Included" },
    { category: "Infrastructure (Azure/AWS)", buildCost: "£8,000/yr", gorigo: "Included" },
    { category: "Compliance (TCPA, GDPR, DNC)", buildCost: "£25,000/yr", gorigo: "Included" },
    { category: "QA, Monitoring, Analytics", buildCost: "£20,000/yr", gorigo: "Included" },
    { category: "Ongoing AI Model Updates", buildCost: "£30,000/yr", gorigo: "Included" },
    { category: "Platform Licence", buildCost: "£0", gorigo: `${formatGBP(CUSTOMER_TIERS.byok.ratePerMinute, 2)}/min` },
  ];

  const costStackData = [
    { name: "GoRigo Platform Fee", cost: byokPlatformCost, perMin: CUSTOMER_TIERS.byok.ratePerMinute },
    { name: "Your API Costs (STT + LLM + TTS)", cost: estimatedApiCost, perMin: estimatedApiRate },
    { name: "Remaining Staff", cost: reducedHumanCost, perMin: null },
  ];

  const totalPerMin = CUSTOMER_TIERS.byok.ratePerMinute + estimatedApiRate;

  return (
    <div className="space-y-6" data-testid="section-persona-technical">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SavingsCard
          label="BYOK Savings"
          value={formatGBP(byokSavings.monthlySavings)}
          sublabel={`${byokSavings.savingsPercent.toFixed(0)}% reduction`}
          icon={TrendingDown}
          highlight
          testId="metric-tech-byok-savings"
        />
        <SavingsCard
          label="Managed Savings"
          value={formatGBP(managedSavings.monthlySavings)}
          sublabel={`${managedSavings.savingsPercent.toFixed(0)}% reduction`}
          icon={TrendingDown}
          testId="metric-tech-managed-savings"
        />
        <SavingsCard
          label="True Cost/Min (BYOK)"
          value={formatGBP(totalPerMin, 3)}
          sublabel={`Platform ${formatGBP(CUSTOMER_TIERS.byok.ratePerMinute, 2)} + API ${formatGBP(totalPerMin - CUSTOMER_TIERS.byok.ratePerMinute, 3)}`}
          icon={Calculator}
          testId="metric-tech-cost-per-min"
        />
        <SavingsCard
          label="BYOK vs Managed"
          value={formatGBP(managedFullCost - byokFullCost)}
          sublabel="Extra you save with BYOK/month"
          icon={PoundSterling}
          testId="metric-tech-byok-vs-managed"
        />
      </div>

      <Card data-testid="card-api-cost-estimate">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Your Estimated API Cost
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Adjust based on your AI provider pricing (STT + LLM + TTS combined per minute).
            Typical range: 1-5p/min depending on your provider and model choice.
          </p>
          <SliderWithInput
            label="API Cost Per Minute"
            value={estimatedApiRate}
            min={0.005}
            max={0.10}
            step={0.001}
            unit="£"
            icon={Cpu}
            onChange={setEstimatedApiRate}
            testId="input-api-rate"
          />
        </CardContent>
      </Card>

      <Card data-testid="card-cost-stack">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
            BYOK Cost Stack — What You Pay
          </h3>
          <div className="space-y-2">
            {costStackData.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2 text-sm" data-testid={`cost-stack-${item.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <span className="text-muted-foreground">{item.name}</span>
                <div className="flex items-center gap-4">
                  {item.perMin !== null && (
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {formatGBP(item.perMin, 3)}/min
                    </span>
                  )}
                  <span className="font-mono tabular-nums w-24 text-right">{formatGBP(item.cost)}/mo</span>
                </div>
              </div>
            ))}
            <div className="border-t border-border/50 pt-2 flex items-center justify-between gap-2 font-medium text-sm">
              <span>Total Monthly Cost</span>
              <span className="font-mono tabular-nums" data-testid="text-tech-total-cost">{formatGBP(byokFullCost)}/mo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-build-vs-buy">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Build It Yourself vs GoRigo
            </h3>
            <div className="space-y-2">
              {buildVsBuyData.map((row) => (
                <div key={row.category} className="grid grid-cols-3 gap-2 text-sm py-1.5 border-b border-border/30 last:border-0" data-testid={`bvb-${row.category.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                  <span className="text-muted-foreground col-span-1">{row.category}</span>
                  <span className="font-mono tabular-nums text-right">{row.buildCost}</span>
                  <span className="font-mono tabular-nums text-right text-primary">{row.gorigo}</span>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 text-sm pt-2 font-medium">
                <span>Total Year 1</span>
                <span className="font-mono tabular-nums text-right">~£218,000</span>
                <span className="font-mono tabular-nums text-right text-primary">{formatGBP(byokFullCost * 12)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-sensitivity">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Sensitivity Analysis
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              What if automation is 15% different, or volume grows/shrinks 20%?
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Best case</span>
                <span className="font-mono tabular-nums text-primary font-medium" data-testid="text-sensitivity-best">
                  {formatGBP(sensitivity.bestCase)}/mo
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Base case</span>
                <span className="font-mono tabular-nums font-medium" data-testid="text-sensitivity-base">
                  {formatGBP(sensitivity.baseCase)}/mo
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Worst case</span>
                <span className="font-mono tabular-nums text-muted-foreground" data-testid="text-sensitivity-worst">
                  {formatGBP(sensitivity.worstCase)}/mo
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Even in the worst case, you save significantly vs the current setup.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-tech-comparison-chart">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Monthly Cost: Current vs BYOK vs Managed
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Current Staff", cost: Math.round(humanCost) },
                  { name: "GoRigo BYOK", cost: Math.round(byokFullCost) },
                  { name: "GoRigo Managed", cost: Math.round(managedFullCost) },
                ]}
                barSize={60}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [formatGBP(v), "Monthly Cost"]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]} fill="hsl(148, 72%, 34%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PersonaPartner({
  callsPerMonth,
  avgDuration,
  automationRate,
}: {
  callsPerMonth: number;
  avgDuration: number;
  automationRate: number;
}) {
  const [retailRate, setRetailRate] = useState(0.22);
  const [numberOfClients, setNumberOfClients] = useState(5);

  const totalMinutes = callsPerMonth * avgDuration;
  const aiMinutes = totalMinutes * (automationRate / 100);

  const wholesaleRate = CUSTOMER_TIERS.whiteLabel.ratePerMinute;
  const marginPerMin = retailRate - wholesaleRate;
  const monthlyMarginPerClient = calculatePartnerMargin(wholesaleRate, retailRate, aiMinutes);
  const monthlyRevenuePerClient = aiMinutes * retailRate;
  const monthlyCostPerClient = aiMinutes * wholesaleRate;

  const totalMonthlyRevenue = monthlyRevenuePerClient * numberOfClients;
  const totalMonthlyCost = monthlyCostPerClient * numberOfClients;
  const totalMonthlyProfit = monthlyMarginPerClient * numberOfClients;

  const affiliateClientSpend = aiMinutes * CUSTOMER_TIERS.direct.ratePerMinute;
  const affiliateEarnings = calculateAffiliateEarnings(affiliateClientSpend);
  const affiliateAnnual = affiliateEarnings * 12;

  const projectionData = [
    { year: "Year 1", clients: numberOfClients, revenue: totalMonthlyProfit * 12 },
    { year: "Year 2", clients: Math.round(numberOfClients * 1.5), revenue: totalMonthlyProfit * 12 * 1.5 },
    { year: "Year 3", clients: numberOfClients * 2, revenue: totalMonthlyProfit * 12 * 2 },
  ];

  const volumeTiers = [
    { mins: 10_000, label: "10k mins" },
    { mins: 50_000, label: "50k mins" },
    { mins: 100_000, label: "100k mins" },
    { mins: 500_000, label: "500k mins" },
  ];

  return (
    <div className="space-y-6" data-testid="section-persona-partner">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-partner-margin-calc">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Your Margin Calculator
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">You buy from GoRigo at</span>
                <span className="font-mono tabular-nums font-medium">{formatGBP(wholesaleRate, 2)}/min</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">You sell to your customers at</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={retailRate}
                      min={wholesaleRate}
                      max={1.0}
                      step={0.01}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= wholesaleRate) setRetailRate(v);
                      }}
                      className="w-20 h-8 text-right text-sm font-mono"
                      data-testid="input-retail-rate"
                    />
                    <span className="text-xs text-muted-foreground">/min</span>
                  </div>
                </div>
                <Slider
                  value={[retailRate]}
                  min={wholesaleRate}
                  max={0.50}
                  step={0.01}
                  onValueChange={([v]) => setRetailRate(v)}
                  data-testid="slider-retail-rate"
                />
              </div>
              <div className="border-t border-border/50 pt-3 flex items-center justify-between gap-2 text-sm font-medium">
                <span>Your margin per minute</span>
                <span className="text-primary font-mono tabular-nums" data-testid="text-margin-per-min">
                  {formatGBP(marginPerMin, 2)} ({((marginPerMin / retailRate) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-partner-clients">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Scale Your Earnings
            </h3>
            <SliderWithInput
              label="Number of Clients"
              value={numberOfClients}
              min={1}
              max={50}
              step={1}
              unit=""
              icon={Users}
              onChange={setNumberOfClients}
              testId="input-client-count"
            />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Monthly revenue</span>
                <span className="font-mono tabular-nums">{formatGBP(totalMonthlyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Monthly GoRigo cost</span>
                <span className="font-mono tabular-nums">-{formatGBP(totalMonthlyCost)}</span>
              </div>
              <div className="border-t border-border/50 pt-2 flex items-center justify-between gap-2 font-medium">
                <span>Monthly profit</span>
                <span className="text-primary font-mono tabular-nums" data-testid="text-partner-monthly-profit">
                  {formatGBP(totalMonthlyProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 font-medium">
                <span>Annual profit</span>
                <span className="text-primary font-mono tabular-nums" data-testid="text-partner-annual-profit">
                  {formatGBP(totalMonthlyProfit * 12)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-partner-volume-table">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Partner Earnings by Volume
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Total Minutes/mo</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">GoRigo Cost</th>
                  <th className="text-right p-3 font-medium text-primary">Your Profit</th>
                  <th className="text-right p-3 font-medium text-primary">Annual</th>
                </tr>
              </thead>
              <tbody>
                {volumeTiers.map((tier) => {
                  const rev = tier.mins * retailRate;
                  const cost = tier.mins * wholesaleRate;
                  const profit = tier.mins * marginPerMin;
                  return (
                    <tr key={tier.label} className="border-b border-border/30 last:border-0" data-testid={`row-volume-${tier.label.replace(/\s+/g, "-")}`}>
                      <td className="p-3 font-mono tabular-nums">{tier.label}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{formatGBP(rev)}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{formatGBP(cost)}</td>
                      <td className="p-3 text-right font-mono tabular-nums font-medium text-primary">{formatGBP(profit)}</td>
                      <td className="p-3 text-right font-mono tabular-nums font-medium text-primary">{formatGBP(profit * 12)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-3year-projection">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
              3-Year Growth Projection
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectionData} barSize={50}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatGBP(v), "Annual Profit"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="hsl(148, 72%, 34%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Based on adding ~50% more clients each year
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-affiliate-calculator">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Affiliate Commission
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Prefer not to resell? Refer clients to GoRigo directly and earn {formatPercent(AFFILIATE_COMMISSION_RATE)} recurring commission.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Client pays GoRigo (Direct rate)</span>
                <span className="font-mono tabular-nums">{formatGBP(affiliateClientSpend)}/mo</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Your commission ({formatPercent(AFFILIATE_COMMISSION_RATE)})</span>
                <span className="font-mono tabular-nums font-medium text-primary" data-testid="text-affiliate-monthly">
                  {formatGBP(affiliateEarnings)}/mo
                </span>
              </div>
              <div className="border-t border-border/50 pt-2 flex items-center justify-between gap-2 text-sm font-medium">
                <span>Annual per referred client</span>
                <span className="text-primary font-mono tabular-nums" data-testid="text-affiliate-annual">
                  {formatGBP(affiliateAnnual)}/yr
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-kpi-benchmarks">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Industry KPI Benchmarks — Sell This to Your Clients
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">First Contact Resolution</p>
              <p className="text-sm text-muted-foreground">{formatPercent(INDUSTRY_BENCHMARKS.fcrHuman)}</p>
              <ChevronRight className="h-3 w-3 mx-auto my-0.5 text-primary rotate-90" />
              <p className="text-lg font-semibold text-primary" data-testid="text-kpi-fcr">{formatPercent(INDUSTRY_BENCHMARKS.fcrAI)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Customer Satisfaction</p>
              <p className="text-sm text-muted-foreground">{formatPercent(INDUSTRY_BENCHMARKS.csatHuman)}</p>
              <ChevronRight className="h-3 w-3 mx-auto my-0.5 text-primary rotate-90" />
              <p className="text-lg font-semibold text-primary" data-testid="text-kpi-csat">{formatPercent(INDUSTRY_BENCHMARKS.csatAI)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">AI Automation Rate</p>
              <p className="text-sm text-muted-foreground">0%</p>
              <ChevronRight className="h-3 w-3 mx-auto my-0.5 text-primary rotate-90" />
              <p className="text-lg font-semibold text-primary" data-testid="text-kpi-automation">
                {formatPercent(INDUSTRY_BENCHMARKS.aiAutomationRateMin)}–{formatPercent(INDUSTRY_BENCHMARKS.aiAutomationRateMax)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg Handle Time</p>
              <p className="text-sm text-muted-foreground">{INDUSTRY_BENCHMARKS.averageHandleTimeMinutes} min</p>
              <ChevronRight className="h-3 w-3 mx-auto my-0.5 text-primary rotate-90" />
              <p className="text-lg font-semibold text-primary" data-testid="text-kpi-aht">~3 min</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RoiCalculatorPage() {
  const [persona, setPersona] = useState<Persona>("explorer");
  const [scenario, setScenario] = useState<ScenarioKey | null>(null);
  const [byokEnabled, setByokEnabled] = useState(false);

  const [callsPerMonth, setCallsPerMonth] = useState(5000);
  const [avgDuration, setAvgDuration] = useState(4);
  const [agentCount, setAgentCount] = useState(8);
  const [agentSalary, setAgentSalary] = useState(26000);
  const [automationRate, setAutomationRate] = useState(65);

  useEffect(() => {
    fetch("/api/public/deployment-packages")
      .then((res) => res.json())
      .then((data) => setByokEnabled(!!data.byok))
      .catch(() => {});
  }, []);

  const applyScenario = (key: ScenarioKey) => {
    const s = PRESET_SCENARIOS[key];
    setCallsPerMonth(s.callsPerMonth);
    setAvgDuration(s.avgCallDurationMinutes);
    setAgentCount(s.agentCount);
    setScenario(key);
  };

  const currentPersona = PERSONAS.find((p) => p.key === persona)!;

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background" data-testid="page-roi-calculator">
        <Navbar />
        <Breadcrumbs items={[{ label: "ROI Calculator" }]} />

        <section className="relative" data-testid="section-roi-hero">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-12 text-center">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6" data-testid="badge-roi">
              Savings Calculator
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]" data-testid="text-roi-hero-title">
              Calculate your
              <br />
              <span className="font-normal">real savings</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed" data-testid="text-roi-hero-subtitle">
              See exactly how much you could save with AI-powered voice agents.
              Pick your profile below — we will show you what matters most.
            </p>
          </div>
        </section>

        <section className="pb-6" data-testid="section-persona-selector">
          <div className="max-w-4xl mx-auto px-6">
            <div className={`grid grid-cols-1 gap-3 ${byokEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {PERSONAS.filter((p) => p.key !== "technical" || byokEnabled).map((p) => {
                const Icon = p.icon;
                const isActive = persona === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPersona(p.key)}
                    className={`text-left p-4 rounded-md border transition-colors ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover-elevate"
                    }`}
                    data-testid={`button-persona-${p.key}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{p.shortLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-6" data-testid="section-presets">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Quick start:</span>
              {(Object.keys(PRESET_SCENARIOS) as ScenarioKey[]).map((key) => {
                const s = PRESET_SCENARIOS[key];
                return (
                  <Badge
                    key={key}
                    variant={scenario === key ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => applyScenario(key)}
                    data-testid={`badge-preset-${key}`}
                  >
                    {s.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pb-16" data-testid="section-calculator">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <Card data-testid="card-inputs">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Calculator className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-medium uppercase tracking-wider">Your Numbers</h2>
                    </div>

                    <SliderWithInput
                      label="Monthly Calls"
                      value={callsPerMonth}
                      min={100}
                      max={200000}
                      step={100}
                      unit="calls"
                      icon={Phone}
                      onChange={setCallsPerMonth}
                      testId="input-calls"
                    />

                    <SliderWithInput
                      label="Average Call Length"
                      value={avgDuration}
                      min={1}
                      max={15}
                      step={0.5}
                      unit="min"
                      icon={Clock}
                      onChange={setAvgDuration}
                      testId="input-duration"
                    />

                    {persona !== "explorer" && (
                      <>
                        <SliderWithInput
                          label="Current Agents"
                          value={agentCount}
                          min={1}
                          max={200}
                          step={1}
                          unit=""
                          icon={Users}
                          onChange={setAgentCount}
                          testId="input-agents"
                        />
                        <SliderWithInput
                          label="Average Salary (Annual)"
                          value={agentSalary}
                          min={18000}
                          max={50000}
                          step={1000}
                          unit="£"
                          icon={PoundSterling}
                          onChange={setAgentSalary}
                          testId="input-salary"
                        />
                      </>
                    )}

                    <SliderWithInput
                      label="AI Automation Rate"
                      value={automationRate}
                      min={20}
                      max={90}
                      step={5}
                      unit="%"
                      icon={Cpu}
                      onChange={setAutomationRate}
                      testId="input-automation"
                    />

                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">Tip:</span>{" "}
                        {persona === "explorer" && "Most businesses automate 60-80% of calls within 90 days."}
                        {persona === "technical" && `BYOK rate: ${formatGBP(CUSTOMER_TIERS.byok.ratePerMinute, 2)}/min platform + your own API costs. Managed: ${formatGBP(CUSTOMER_TIERS.direct.ratePerMinute, 2)}/min all-in.`}
                        {persona === "partner" && `Wholesale rate: ${formatGBP(CUSTOMER_TIERS.whiteLabel.ratePerMinute, 2)}/min. Set your own retail price for your customers.`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                {persona === "explorer" && (
                  <PersonaExplorer
                    callsPerMonth={callsPerMonth}
                    avgDuration={avgDuration}
                    automationRate={automationRate}
                  />
                )}
                {persona === "technical" && (
                  <PersonaTechnical
                    callsPerMonth={callsPerMonth}
                    avgDuration={avgDuration}
                    agentCount={agentCount}
                    agentSalary={agentSalary}
                    automationRate={automationRate}
                  />
                )}
                {persona === "partner" && (
                  <PersonaPartner
                    callsPerMonth={callsPerMonth}
                    avgDuration={avgDuration}
                    automationRate={automationRate}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 border-t border-border/50" data-testid="section-disclaimer">
          <div className="max-w-4xl mx-auto px-6">
            <TalkTimeFootnote className="mb-4" />
            <div className="flex items-start gap-3 p-4 rounded-md border border-border/50 bg-muted/30">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <p>
                  <strong className="text-foreground">Disclaimer:</strong> All figures
                  are estimates based on publicly available data and UK market rates as of
                  February 2026. Actual savings depend on your specific call patterns,
                  industry, and configuration. GoRigo does not guarantee specific outcomes.
                  Contact us for a personalised assessment.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border/50" data-testid="section-roi-cta">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-light tracking-tight mb-4" data-testid="text-roi-cta-title">
              Ready to see these savings in action?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              {persona === "explorer" && "Book a demo and we will walk through your specific numbers."}
              {persona === "technical" && "Try GoRigo with your own API keys — set up takes under 30 minutes."}
              {persona === "partner" && "Apply for our partner programme and start earning on day one."}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href={persona === "technical" ? "/register" : persona === "partner" ? "/partners" : "/contact"}>
                <Button size="lg" data-testid="button-roi-cta-primary">
                  {persona === "explorer" && "Book a Demo"}
                  {persona === "technical" && "Start Free Trial"}
                  {persona === "partner" && "Apply to Partner"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" data-testid="button-roi-cta-pricing">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <ConversionCta talkToAiMessage="Talk to AI to explore your ROI" />
        <Footer />
      </div>
    </PublicLayout>
  );
}
