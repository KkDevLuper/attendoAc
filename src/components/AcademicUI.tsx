import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
      {children}
    </div>
  );
}

export function Ring({
  value,
  size = 76,
  stroke = 7,
  label,
  caption,
  tone = "default",
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
  tone?: "default" | "muted";
}) {
  const has = value !== null && Number.isFinite(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = has ? (Math.max(0, Math.min(100, value)) / 100) * c : 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-border"
          />
          {has && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              className={cn(
                "stroke-primary transition-[stroke-dashoffset] duration-500",
                tone === "muted" && "stroke-muted-foreground/60",
              )}
              strokeDasharray={c}
              strokeDashoffset={c - dash}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-[15px] font-semibold", !has && "text-muted-foreground")}>
            {has ? `${Math.round(value)}%` : "—"}
          </span>
          {label && (
            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </span>
          )}
        </div>
      </div>
      {caption && <span className="text-[11px] text-muted-foreground">{caption}</span>}
    </div>
  );
}

export function MiniBar({ value, className }: { value: number | null; className?: string }) {
  const has = value !== null && Number.isFinite(value);
  const w = has ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-border/60", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-all duration-500", !has && "opacity-0")}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

export function StatRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-foreground">
        {value}
        {hint && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </span>
    </div>
  );
}

export function ScoreBadge({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const has = value !== null && Number.isFinite(value);
  const tone = !has
    ? "text-muted-foreground border-border"
    : value >= 75
      ? "text-primary border-primary/40 bg-primary/[0.06]"
      : value >= 50
        ? "text-foreground/80 border-border"
        : "text-foreground border-foreground/25";
  return (
    <div className={cn("flex items-center justify-between rounded-lg border px-3 py-2.5", tone)}>
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <span className="text-[15px] font-semibold">
        {has ? `${Math.round(value)}` : "N/A"}
      </span>
    </div>
  );
}

export function DataHint({ children }: { children?: React.ReactNode }) {
  return (
    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
      {children ?? "Not enough data yet — add real records to unlock this score."}
    </p>
  );
}
