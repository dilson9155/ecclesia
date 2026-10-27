import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusPill({
  active,
  activeLabel = "Ativo",
  inactiveLabel = "Inativo",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        active
          ? "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-border bg-muted/60 text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-muted-foreground/50"
        )}
      />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

const STAT_TONES = {
  primary: {
    bar: "from-primary/0 via-primary/60 to-primary/0",
    icon: "bg-primary/10 text-primary ring-primary/15",
  },
  emerald: {
    bar: "from-emerald-500/0 via-emerald-500/50 to-emerald-500/0",
    icon: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-300",
  },
  amber: {
    bar: "from-amber-500/0 via-amber-500/50 to-amber-500/0",
    icon: "bg-amber-500/10 text-amber-600 ring-amber-500/15 dark:text-amber-300",
  },
  sky: {
    bar: "from-sky-500/0 via-sky-500/50 to-sky-500/0",
    icon: "bg-sky-500/10 text-sky-600 ring-sky-500/15 dark:text-sky-300",
  },
  violet: {
    bar: "from-violet-500/0 via-violet-500/50 to-violet-500/0",
    icon: "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-300",
  },
} as const;

export type StatTone = keyof typeof STAT_TONES;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: StatTone;
}) {
  const styles = STAT_TONES[tone];

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-80 transition-opacity group-hover:opacity-100",
          styles.bar
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
              styles.icon
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  message,
  icon: Icon = Inbox,
}: {
  message: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed bg-card/60 px-6 py-10">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-2.5 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
