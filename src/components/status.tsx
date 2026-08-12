import { cn } from "@/lib/utils";

export type Status = "proven" | "developing" | "evidence_gap" | "skill_gap";

export const STATUS_META: Record<
  Status,
  { label: string; short: string; className: string; dot: string; description: string }
> = {
  proven: {
    label: "Proven",
    short: "Proven",
    className: "bg-proven-soft text-proven-foreground border-proven/30",
    dot: "bg-proven",
    description: "You have concrete evidence a hiring manager would accept.",
  },
  developing: {
    label: "Developing",
    short: "Developing",
    className: "bg-developing-soft text-developing-foreground border-developing/30",
    dot: "bg-developing",
    description: "Partial evidence — real but thin, indirect, or dated.",
  },
  evidence_gap: {
    label: "Evidence gap",
    short: "Evidence gap",
    className: "bg-evidence-gap-soft text-evidence-gap-foreground border-evidence-gap/30",
    dot: "bg-evidence-gap",
    description: "You can likely do this — you just can't prove it yet.",
  },
  skill_gap: {
    label: "Skill gap",
    short: "Skill gap",
    className: "bg-skill-gap-soft text-skill-gap-foreground border-skill-gap/30",
    dot: "bg-skill-gap",
    description: "The capability itself isn't there yet. Build it, then prove it.",
  },
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.skill_gap;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function CoverageRing({
  percent,
  size = 140,
  label = "Evidence coverage",
}: {
  percent: number | null;
  size?: number;
  label?: string;
}) {
  const value = percent ?? 0;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`}
          className="stroke-primary transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="-mt-[calc(50%+0.5rem)] mb-[calc(50%-1.5rem)] text-center">
        <div className="font-display text-3xl font-semibold tabular-nums">
          {percent === null ? "—" : `${percent}%`}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function importanceLabel(importance: string) {
  switch (importance) {
    case "critical":
      return "Critical";
    case "important":
      return "Important";
    case "useful":
      return "Useful";
    default:
      return importance;
  }
}

export const CONFIDENCE_META: Record<string, { label: string; className: string; help: string }> = {
  high: {
    label: "High confidence",
    className: "border-proven/40 text-proven-foreground bg-proven-soft",
    help: "The evidence is specific enough that this conclusion is hard to argue with.",
  },
  medium: {
    label: "Medium confidence",
    className: "border-developing/40 text-developing-foreground bg-developing-soft",
    help: "Reasonable read of the evidence, but detail is missing that could change it.",
  },
  low: {
    label: "Low confidence",
    className: "border-evidence-gap/40 text-evidence-gap-foreground bg-evidence-gap-soft",
    help: "Largely inferred. Treat this as a prompt to check, not a finding.",
  },
};

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: string | null | undefined;
  className?: string;
}) {
  const meta = CONFIDENCE_META[confidence ?? "low"] ?? CONFIDENCE_META["low"]!;
  return (
    <span
      title={meta.help}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "high"
      ? "border-skill-gap/40 bg-skill-gap-soft text-skill-gap-foreground"
      : severity === "medium"
        ? "border-developing/40 bg-developing-soft text-developing-foreground"
        : "border-border bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", cls)}>
      {severity} severity
    </span>
  );
}

export const RELATIONSHIP_HELP: Record<string, string> = {
  direct: "The evidence shows this skill applied in the same kind of context.",
  transferable: "A different context demonstrates a related capability.",
  indirect: "The skill was adjacent to the work, not owned by you.",
  inferred: "Inferred from the material rather than shown outright.",
};

export function OverriddenTag({ children = "Your call" }: { children?: string }) {
  return (
    <span className="border-primary/40 bg-primary/10 text-primary rounded-full border px-2 py-0.5 text-[11px] font-medium">
      {children}
    </span>
  );
}
