import { cn } from "@/lib/utils";

export default function SectionCard({
  title,
  description,
  children,
  className,
  right,
  "data-testid": dataTestId,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <section
      className={cn(
        "enter rounded-2xl border bg-card/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/65 grain",
        "transition-all duration-300 hover:shadow-md hover:bg-card/90",
        className
      )}
      data-testid={dataTestId}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-5 sm:p-6">
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
    </section>
  );
}
