import { cn } from "@/lib/utils";

export default function StatusPill({
  label,
  tone = "neutral",
  "data-testid": dataTestId,
}: {
  label: string;
  tone?: "neutral" | "success" | "danger" | "brand";
  "data-testid"?: string;
}) {
  const styles =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
      : tone === "danger"
        ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
        : tone === "brand"
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-muted text-foreground/70 border-border/60";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
        styles
      )}
      data-testid={dataTestId}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
