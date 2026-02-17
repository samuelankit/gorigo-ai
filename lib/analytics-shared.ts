export const CHART_COLORS = {
  primary: "hsl(262, 83%, 58%)",
  secondary: "hsl(217, 91%, 60%)",
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 84%, 60%)",
  info: "hsl(199, 89%, 48%)",
};

export const PIE_COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(199, 89%, 48%)",
];

export const FUNNEL_COLORS = [
  "hsl(262, 83%, 48%)",
  "hsl(262, 78%, 53%)",
  "hsl(262, 73%, 58%)",
  "hsl(262, 68%, 63%)",
  "hsl(262, 63%, 68%)",
  "hsl(262, 58%, 73%)",
];

export const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};

export const PERIODS = ["7d", "30d", "90d"] as const;

export const AUTO_REFRESH_INTERVAL = 60_000;

export const formatNumber = (n: number) => new Intl.NumberFormat().format(n);
export const formatPercent = (n: number) => `${Math.round(n)}%`;

export async function fetchAnalyticsData(period: string, metric: string) {
  const res = await fetch(`/api/analytics/data?period=${period}&metric=${metric}`);
  if (res.status === 401) {
    window.location.href = '/login';
    return null;
  }
  if (!res.ok) return null;
  return res.json();
}

export function bounceRateColor(rate: number): string {
  if (rate < 30) return CHART_COLORS.success;
  if (rate <= 50) return CHART_COLORS.warning;
  return CHART_COLORS.danger;
}

export function bounceRateTextClass(rate: number): string {
  if (rate < 30) return "text-green-600 dark:text-green-400";
  if (rate <= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function categorizeSource(source: string): string {
  const s = source.toLowerCase();
  if (s === "direct" || s === "(direct)" || s === "") return "Direct";
  if (s.includes("google") || s.includes("bing") || s.includes("yahoo") || s.includes("duckduckgo")) return "Search";
  if (s.includes("facebook") || s.includes("twitter") || s.includes("linkedin") || s.includes("instagram") || s.includes("tiktok") || s.includes("reddit") || s.includes("youtube")) return "Social";
  return "Referral";
}

export function formatChange(current: number, previous: number): { label: string; isUp: boolean; percent: number } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { label: "+100%", isUp: true, percent: 100 };
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return null;
  return {
    label: `${percent > 0 ? "+" : ""}${percent}%`,
    isUp: percent > 0,
    percent: Math.abs(percent),
  };
}
