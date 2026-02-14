"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  TrendingDown,
  TrendingUp,
  Clock,
  Users,
  Phone,
  PoundSterling,
  Server,
  Cpu,
  Headphones,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COSTS = {
  ukAgentSalaryAnnual: 26000,
  ukEmployerNI: 0.138,
  ukEmployerPension: 0.03,
  ukWorkspaceCostMonthly: 350,
  ukRecruitmentPerAgent: 3000,
  ukTrainingPerAgent: 1500,

  openaiWhisperPerMin: 0.006,
  openaiGpt4oMiniPerMin: 0.003,
  openaiTtsPerMin: 0.015,
  anthropicClaudePerMin: 0.008,

  twilioInboundPerMin: 0.014,
  twilioOutboundPerMin: 0.014,
  twilioNumberMonthly: 1.15,

  azureContainerAppVCpuHr: 0.0504,
  azureContainerAppMemGbHr: 0.0063,
  azurePostgresFlexPerHr: 0.049,
  azureBandwidthPerGb: 0.07,

  gorigoPlatformFeePerMin: 0.02,
  gorigoPlatformBaseMonthly: 0,
};

const formatGBP = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const formatGBPDecimal = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(v);

const CHART_COLORS = [
  "hsl(148, 72%, 34%)",
  "hsl(210, 70%, 50%)",
  "hsl(260, 50%, 55%)",
  "hsl(30, 80%, 55%)",
  "hsl(340, 60%, 50%)",
];

function SliderInput({
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
  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-mono tabular-nums text-foreground" data-testid={`${testId}-value`}>
          {unit === "£"
            ? formatGBP(value)
            : `${value.toLocaleString("en-GB")}${unit ? ` ${unit}` : ""}`}
        </span>
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
          {unit === "£" ? formatGBP(min) : `${min.toLocaleString()}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {unit === "£" ? formatGBP(max) : `${max.toLocaleString()}`}
        </span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  testId,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: typeof Calculator;
  trend?: "up" | "down";
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
          </div>
          {trend === "down" && <TrendingDown className="h-4 w-4 text-emerald-500" />}
          {trend === "up" && <TrendingUp className="h-4 w-4 text-rose-500" />}
        </div>
        <p className="text-2xl font-semibold mt-2 tabular-nums" data-testid={`${testId}-value`}>{value}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

export default function RoiCalculatorPage() {
  const [monthlyCallVolume, setMonthlyCallVolume] = useState(5000);
  const [avgCallDuration, setAvgCallDuration] = useState(4);
  const [agentCount, setAgentCount] = useState(8);
  const [agentSalary, setAgentSalary] = useState(COSTS.ukAgentSalaryAnnual);
  const [automationRate, setAutomationRate] = useState(65);

  const calculations = useMemo(() => {
    const totalMinutes = monthlyCallVolume * avgCallDuration;
    const aiMinutes = totalMinutes * (automationRate / 100);
    const humanMinutes = totalMinutes - aiMinutes;

    const salaryMonthly = agentSalary / 12;
    const niMonthly = (agentSalary * COSTS.ukEmployerNI) / 12;
    const pensionMonthly = (agentSalary * COSTS.ukEmployerPension) / 12;
    const totalAgentCostMonthly =
      (salaryMonthly + niMonthly + pensionMonthly + COSTS.ukWorkspaceCostMonthly) * agentCount;
    const recruitTrainAmortised =
      ((COSTS.ukRecruitmentPerAgent + COSTS.ukTrainingPerAgent) * agentCount) / 12;
    const currentTotalMonthly = totalAgentCostMonthly + recruitTrainAmortised;

    const aiSttCost = aiMinutes * COSTS.openaiWhisperPerMin;
    const aiLlmCost = aiMinutes * COSTS.openaiGpt4oMiniPerMin;
    const aiTtsCost = aiMinutes * COSTS.openaiTtsPerMin;
    const aiProviderTotal = aiSttCost + aiLlmCost + aiTtsCost;

    const telephonyCost =
      aiMinutes * COSTS.twilioInboundPerMin + COSTS.twilioNumberMonthly * 2;

    const containerHours = 730;
    const azureCompute =
      COSTS.azureContainerAppVCpuHr * 2 * containerHours +
      COSTS.azureContainerAppMemGbHr * 4 * containerHours;
    const azureDb = COSTS.azurePostgresFlexPerHr * containerHours;
    const azureBandwidth = (aiMinutes * 0.05) * COSTS.azureBandwidthPerGb;
    const azureTotal = azureCompute + azureDb + azureBandwidth;

    const platformFee =
      aiMinutes * COSTS.gorigoPlatformFeePerMin + COSTS.gorigoPlatformBaseMonthly;

    const reducedAgents = Math.ceil(agentCount * (1 - automationRate / 100));
    const reducedHumanCost =
      (salaryMonthly + niMonthly + pensionMonthly + COSTS.ukWorkspaceCostMonthly) * reducedAgents;
    const reducedRecruitTrain =
      ((COSTS.ukRecruitmentPerAgent + COSTS.ukTrainingPerAgent) * reducedAgents) / 12;

    const aiTotalMonthly =
      aiProviderTotal + telephonyCost + azureTotal + platformFee + reducedHumanCost + reducedRecruitTrain;

    const monthlySavings = currentTotalMonthly - aiTotalMonthly;
    const annualSavings = monthlySavings * 12;
    const savingsPercent = currentTotalMonthly > 0 ? (monthlySavings / currentTotalMonthly) * 100 : 0;

    const costPerCallCurrent = currentTotalMonthly / monthlyCallVolume;
    const costPerCallAI = aiTotalMonthly / monthlyCallVolume;

    const costPerMinuteAI =
      COSTS.openaiWhisperPerMin +
      COSTS.openaiGpt4oMiniPerMin +
      COSTS.openaiTtsPerMin +
      COSTS.twilioInboundPerMin +
      COSTS.gorigoPlatformFeePerMin;

    const paybackMonths = monthlySavings > 0 ? Math.ceil(2500 / monthlySavings) : 0;

    return {
      currentTotalMonthly,
      aiTotalMonthly,
      monthlySavings,
      annualSavings,
      savingsPercent,
      costPerCallCurrent,
      costPerCallAI,
      costPerMinuteAI,
      paybackMonths,
      aiMinutes,
      breakdown: {
        aiProvider: aiProviderTotal,
        telephony: telephonyCost,
        azure: azureTotal,
        platform: platformFee,
        humanRemaining: reducedHumanCost + reducedRecruitTrain,
      },
      perMinBreakdown: {
        stt: COSTS.openaiWhisperPerMin,
        llm: COSTS.openaiGpt4oMiniPerMin,
        tts: COSTS.openaiTtsPerMin,
        telephony: COSTS.twilioInboundPerMin,
        platform: COSTS.gorigoPlatformFeePerMin,
      },
    };
  }, [monthlyCallVolume, avgCallDuration, agentCount, agentSalary, automationRate]);

  const comparisonData = [
    {
      name: "Current",
      cost: Math.round(calculations.currentTotalMonthly),
      fill: "hsl(340, 60%, 50%)",
    },
    {
      name: "With GoRigo",
      cost: Math.round(calculations.aiTotalMonthly),
      fill: "hsl(148, 72%, 34%)",
    },
  ];

  const breakdownData = [
    { name: "AI Models", value: Math.round(calculations.breakdown.aiProvider), color: CHART_COLORS[0] },
    { name: "Telephony", value: Math.round(calculations.breakdown.telephony), color: CHART_COLORS[1] },
    { name: "Azure Hosting", value: Math.round(calculations.breakdown.azure), color: CHART_COLORS[2] },
    { name: "GoRigo Platform", value: Math.round(calculations.breakdown.platform), color: CHART_COLORS[3] },
    { name: "Remaining Staff", value: Math.round(calculations.breakdown.humanRemaining), color: CHART_COLORS[4] },
  ].filter((d) => d.value > 0);

  const perMinData = [
    { name: "Speech-to-Text", cost: calculations.perMinBreakdown.stt },
    { name: "LLM Processing", cost: calculations.perMinBreakdown.llm },
    { name: "Text-to-Speech", cost: calculations.perMinBreakdown.tts },
    { name: "Telephony", cost: calculations.perMinBreakdown.telephony },
    { name: "Platform Fee", cost: calculations.perMinBreakdown.platform },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="page-roi-calculator">
      <Navbar />
      <Breadcrumbs items={[{ label: "ROI Calculator" }]} />

      <section className="relative" data-testid="section-roi-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-16 text-center">
          <p
            className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6"
            data-testid="badge-roi"
          >
            Savings Calculator
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-roi-hero-title"
          >
            Calculate your
            <br />
            <span className="font-normal">real savings</span>
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
            data-testid="text-roi-hero-subtitle"
          >
            See exactly how much you could save by switching to AI-powered voice
            agents. Real costs, real numbers — no hidden fees.
          </p>
        </div>
      </section>

      <section className="pb-12" data-testid="section-calculator">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <Card data-testid="card-inputs">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-medium uppercase tracking-wider">Your Current Setup</h2>
                  </div>

                  <SliderInput
                    label="Monthly Call Volume"
                    value={monthlyCallVolume}
                    min={500}
                    max={100000}
                    step={500}
                    unit="calls"
                    icon={Phone}
                    onChange={setMonthlyCallVolume}
                    testId="input-call-volume"
                  />

                  <SliderInput
                    label="Average Call Duration"
                    value={avgCallDuration}
                    min={1}
                    max={15}
                    step={0.5}
                    unit="min"
                    icon={Clock}
                    onChange={setAvgCallDuration}
                    testId="input-call-duration"
                  />

                  <SliderInput
                    label="Current Agent Headcount"
                    value={agentCount}
                    min={1}
                    max={100}
                    step={1}
                    unit=""
                    icon={Users}
                    onChange={setAgentCount}
                    testId="input-agent-count"
                  />

                  <SliderInput
                    label="Average Agent Salary (Annual)"
                    value={agentSalary}
                    min={20000}
                    max={45000}
                    step={1000}
                    unit="£"
                    icon={PoundSterling}
                    onChange={setAgentSalary}
                    testId="input-agent-salary"
                  />

                  <SliderInput
                    label="AI Automation Rate"
                    value={automationRate}
                    min={20}
                    max={90}
                    step={5}
                    unit="%"
                    icon={Cpu}
                    onChange={setAutomationRate}
                    testId="input-automation-rate"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                  label="Monthly Savings"
                  value={formatGBP(calculations.monthlySavings)}
                  sublabel={`${calculations.savingsPercent.toFixed(0)}% reduction`}
                  icon={TrendingDown}
                  trend="down"
                  testId="metric-monthly-savings"
                />
                <MetricCard
                  label="Annual Savings"
                  value={formatGBP(calculations.annualSavings)}
                  sublabel="Projected yearly"
                  icon={PoundSterling}
                  trend="down"
                  testId="metric-annual-savings"
                />
                <MetricCard
                  label="Cost Per Call"
                  value={formatGBPDecimal(calculations.costPerCallAI)}
                  sublabel={`was ${formatGBPDecimal(calculations.costPerCallCurrent)}`}
                  icon={Phone}
                  trend="down"
                  testId="metric-cost-per-call"
                />
                <MetricCard
                  label="Payback"
                  value={`${calculations.paybackMonths} mo`}
                  sublabel="To recover setup cost"
                  icon={Clock}
                  testId="metric-payback"
                />
              </div>

              <Card data-testid="card-comparison-chart">
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
                    Monthly Cost Comparison
                  </h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} barSize={60}>
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
                        <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                          {comparisonData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid="card-breakdown-chart">
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
                      AI Cost Breakdown
                    </h3>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={breakdownData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {breakdownData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => [formatGBP(v), ""]}
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            iconSize={8}
                            wrapperStyle={{ fontSize: "11px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-per-minute-breakdown">
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
                      Cost Per AI Minute
                    </h3>
                    <div className="space-y-3">
                      {perMinData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between gap-2"
                          data-testid={`per-min-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <span className="text-sm text-muted-foreground">{item.name}</span>
                          <span className="text-sm font-mono tabular-nums">
                            {formatGBPDecimal(item.cost)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-border/50 pt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Total per minute</span>
                        <span className="text-sm font-mono tabular-nums font-semibold" data-testid="text-total-per-min">
                          {formatGBPDecimal(calculations.costPerMinuteAI)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-border/50" data-testid="section-infrastructure-costs">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Transparent Pricing
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-infra-title">
              What makes up the cost
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-cost-ai">
              <CardContent className="p-6">
                <Cpu className="h-5 w-5 text-emerald-500 mb-3" />
                <h3 className="font-medium mb-1">AI Processing</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  OpenAI Whisper (STT) + GPT-4o-mini (LLM) + TTS for natural voice
                </p>
                <p className="text-lg font-mono tabular-nums" data-testid="text-ai-rate">
                  {formatGBPDecimal(COSTS.openaiWhisperPerMin + COSTS.openaiGpt4oMiniPerMin + COSTS.openaiTtsPerMin)}/min
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-cost-telephony">
              <CardContent className="p-6">
                <Headphones className="h-5 w-5 text-blue-500 mb-3" />
                <h3 className="font-medium mb-1">Telephony</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Twilio Programmable Voice for UK inbound and outbound calls
                </p>
                <p className="text-lg font-mono tabular-nums" data-testid="text-telephony-rate">
                  {formatGBPDecimal(COSTS.twilioInboundPerMin)}/min
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-cost-azure">
              <CardContent className="p-6">
                <Server className="h-5 w-5 text-violet-500 mb-3" />
                <h3 className="font-medium mb-1">Azure UK South</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Container Apps (2 vCPU, 4 GB) + PostgreSQL Flexible Server + bandwidth
                </p>
                <p className="text-lg font-mono tabular-nums" data-testid="text-azure-rate">
                  ~{formatGBP(Math.round(COSTS.azureContainerAppVCpuHr * 2 * 730 + COSTS.azureContainerAppMemGbHr * 4 * 730 + COSTS.azurePostgresFlexPerHr * 730))}/mo
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-cost-platform">
              <CardContent className="p-6">
                <Calculator className="h-5 w-5 text-amber-500 mb-3" />
                <h3 className="font-medium mb-1">GoRigo Platform</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Orchestration, analytics, compliance, agent management, and support
                </p>
                <p className="text-lg font-mono tabular-nums" data-testid="text-platform-rate">
                  {formatGBPDecimal(COSTS.gorigoPlatformFeePerMin)}/min
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-border/50" data-testid="section-human-cost">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              The Full Picture
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-human-cost-title">
              True cost of a human agent
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Salary is only part of the cost. UK employers pay National Insurance,
              pension contributions, workspace costs, and absorb recruitment and
              training expenses.
            </p>
          </div>

          <Card data-testid="card-human-cost-table">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 font-medium text-muted-foreground">Component</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Annual (per agent)</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Monthly (per agent)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Base Salary", annual: agentSalary },
                      { name: "Employer's NI (13.8%)", annual: agentSalary * COSTS.ukEmployerNI },
                      { name: "Employer's Pension (3%)", annual: agentSalary * COSTS.ukEmployerPension },
                      { name: "Workspace & Equipment", annual: COSTS.ukWorkspaceCostMonthly * 12 },
                      { name: "Recruitment (amortised)", annual: COSTS.ukRecruitmentPerAgent },
                      { name: "Training (amortised)", annual: COSTS.ukTrainingPerAgent },
                    ].map((row, i, arr) => (
                      <tr
                        key={row.name}
                        className={i < arr.length - 1 ? "border-b border-border/50" : ""}
                        data-testid={`row-cost-${row.name.toLowerCase().replace(/[^a-z]/g, "-")}`}
                      >
                        <td className="p-4">{row.name}</td>
                        <td className="p-4 text-right font-mono tabular-nums">{formatGBP(row.annual)}</td>
                        <td className="p-4 text-right font-mono tabular-nums">{formatGBP(Math.round(row.annual / 12))}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="p-4">Total Cost Per Agent</td>
                      <td className="p-4 text-right font-mono tabular-nums" data-testid="text-total-agent-annual">
                        {formatGBP(
                          agentSalary +
                          agentSalary * COSTS.ukEmployerNI +
                          agentSalary * COSTS.ukEmployerPension +
                          COSTS.ukWorkspaceCostMonthly * 12 +
                          COSTS.ukRecruitmentPerAgent +
                          COSTS.ukTrainingPerAgent
                        )}
                      </td>
                      <td className="p-4 text-right font-mono tabular-nums">
                        {formatGBP(
                          Math.round(
                            (agentSalary +
                              agentSalary * COSTS.ukEmployerNI +
                              agentSalary * COSTS.ukEmployerPension +
                              COSTS.ukWorkspaceCostMonthly * 12 +
                              COSTS.ukRecruitmentPerAgent +
                              COSTS.ukTrainingPerAgent) / 12
                          )
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12 border-t border-border/50" data-testid="section-disclaimer">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-start gap-3 p-4 rounded-md border border-border/50 bg-muted/30">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
              <p>
                <strong className="text-foreground">Disclaimer:</strong> All figures
                shown are estimates based on publicly available pricing from Azure,
                OpenAI, and Twilio as of February 2026. Actual costs will vary based
                on usage patterns, negotiated rates, currency fluctuations, and
                specific configuration choices. GoRigo does not guarantee specific
                savings outcomes. UK employer costs based on current HMRC rates.
                Contact us for a personalised assessment.
              </p>
              <p>
                Pricing sources: Azure UK South Container Apps and PostgreSQL
                Flexible Server, OpenAI Whisper/GPT-4o-mini/TTS API pricing, Twilio
                Programmable Voice UK rates. All figures in GBP.
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
            Book a personalised demo and we will walk through your specific
            numbers with your team.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/contact">
              <Button size="lg" data-testid="button-roi-cta-demo">
                Book a Demo
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

      <ConversionCta />
      <Footer />
    </div>
  );
}
