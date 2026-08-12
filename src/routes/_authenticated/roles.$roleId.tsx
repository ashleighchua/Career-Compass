import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, FileSearch, MessagesSquare, PenLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ConfidenceBadge,
  CoverageRing,
  OverriddenTag,
  SeverityBadge,
  STATUS_META,
  StatusBadge,
  importanceLabel,
  type Status,
} from "@/components/status";
import {
  analyseRole,
  assessRole,
  getRoleDetail,
  overrideAssessment,
  updateContradiction,
} from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/roles/$roleId")({
  head: () => ({
    meta: [
      { title: "Role assessment — Career Compass" },
      {
        name: "description",
        content: "Requirement-by-requirement assessment of your evidence against this role.",
      },
      { property: "og:title", content: "Role assessment — Career Compass" },
      {
        property: "og:description",
        content:
          "Skill gap or evidence gap, requirement by requirement — with the reasoning shown.",
      },
    ],
  }),
  component: RoleDetail,
});

type Requirement = {
  id: string;
  canonical_skill: string;
  original_wording: string | null;
  importance: string;
  requirement_type: string;
  seniority_level: string | null;
  reasoning: string | null;
};

type Assessment = {
  id: string;
  requirement_id: string;
  status: string;
  user_status: string | null;
  confidence: string;
  strength: number;
  reasoning: string | null;
  missing_evidence: string | null;
  next_step: string | null;
  seniority_note: string | null;
  recency_note: string | null;
  scope_note: string | null;
  autonomy_note: string | null;
  experience_note: string | null;
  user_note: string | null;
  user_reasoning: string | null;
  overridden_at: string | null;
  supporting_evidence_ids: string[] | null;
};

type Contradiction = {
  id: string;
  summary: string;
  detail: string | null;
  severity: string;
  status: string;
  evidence_ids: string[] | null;
};

type EvidenceRef = {
  id: string;
  title: string;
  occurred_on: string | null;
  organisation: string | null;
};

type Breakdown = {
  requirementId: string;
  label: string;
  importance: string;
  status: Status;
  overridden: boolean;
  weight: number;
  contribution: number;
};

const ORDER: Status[] = ["skill_gap", "evidence_gap", "developing", "proven"];

function RoleDetail() {
  const { roleId } = Route.useParams();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getRoleDetail);
  const parse = useServerFn(analyseRole);
  const assess = useServerFn(assessRole);
  const override = useServerFn(overrideAssessment);
  const resolveConflict = useServerFn(updateContradiction);

  const [inspecting, setInspecting] = useState<string | null>(null);
  const [showMath, setShowMath] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [draftReasoning, setDraftReasoning] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["role", roleId],
    queryFn: () => fetchDetail({ data: { id: roleId } }),
  });

  const invalidate = () => void qc.invalidateQueries();
  const fail = (e: Error) => toast.error(e.message);

  const reassess = useMutation({
    mutationFn: async () => {
      await parse({ data: { id: roleId } });
      return assess({ data: { id: roleId } });
    },
    onSuccess: () => {
      toast.success("Reassessed. Your overrides were kept.");
      invalidate();
    },
    onError: fail,
  });

  const overrideMutation = useMutation({
    mutationFn: (input: {
      id: string;
      user_status: Status | null;
      user_reasoning?: string | null;
    }) => override({ data: input }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
    onError: fail,
  });

  const conflictMutation = useMutation({
    mutationFn: (input: { id: string; status: "acknowledged" | "resolved" | "dismissed" }) =>
      resolveConflict({ data: input }),
    onSuccess: invalidate,
    onError: fail,
  });

  if (isLoading) return <Skeleton className="m-6 h-96 md:m-10" />;
  if (!data) return <p className="p-10 text-sm">This role no longer exists.</p>;

  const role = data.role as {
    title: string;
    company: string | null;
    job_description: string | null;
  };
  const requirements = data.requirements as unknown as Requirement[];
  const assessments = data.assessments as unknown as Assessment[];
  const contradictions = (data.contradictions ?? []) as unknown as Contradiction[];
  const breakdown = (data.coverageBreakdown ?? []) as unknown as Breakdown[];
  const byReq = new Map(assessments.map((a) => [a.requirement_id, a]));
  const reqById = new Map(requirements.map((r) => [r.id, r]));
  const evidenceIndex = new Map(
    (data.evidenceIndex as unknown as EvidenceRef[]).map((e) => [e.id, e]),
  );

  const grouped = ORDER.map((status) => ({
    status,
    items: requirements.filter((req) => {
      const a = byReq.get(req.id);
      return (((a?.user_status ?? a?.status) as Status) ?? "skill_gap") === status;
    }),
  }));

  const openConflicts = contradictions.filter((c) => c.status === "open");
  const inspected = inspecting ? byReq.get(inspecting) : null;
  const inspectedReq = inspecting ? reqById.get(inspecting) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/roles">
          <ArrowLeft className="size-4" /> All roles
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{role.title}</h1>
          <p className="text-muted-foreground text-sm">{role.company ?? "No company"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/interview/$roleId" params={{ roleId }}>
              <MessagesSquare className="size-4" /> Interview mode
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/apply/$roleId" params={{ roleId }}>
              <PenLine className="size-4" /> Application prep
            </Link>
          </Button>
          <Button onClick={() => reassess.mutate()} disabled={reassess.isPending}>
            {reassess.isPending ? "Reassessing…" : "Reassess"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-8 pt-6">
          <CoverageRing percent={data.coverage.percent} size={120} />
          <div className="min-w-48 flex-1 space-y-2">
            <p className="text-sm font-medium">
              {data.coverage.percent === null
                ? "Not assessed yet"
                : `You can currently evidence ${data.coverage.percent}% of what this role asks for.`}
            </p>
            <p className="text-muted-foreground text-sm">
              Weighted by importance — critical requirements count for three times a useful one.
            </p>
            {breakdown.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setShowMath(true)}>
                <FileSearch className="size-4" /> Show how this number is built
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {openConflicts.length > 0 ? (
        <Card className="border-skill-gap/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="text-skill-gap size-4" />
              Conflicting evidence ({openConflicts.length})
            </CardTitle>
            <CardDescription>
              These are flagged, not resolved. An interviewer could spot the same thing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {openConflicts.map((c) => (
              <div key={c.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{c.summary}</p>
                  <SeverityBadge severity={c.severity} />
                </div>
                {c.detail ? <p className="text-muted-foreground mt-1 text-sm">{c.detail}</p> : null}
                {(c.evidence_ids ?? []).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(c.evidence_ids ?? []).map((id) => (
                      <span key={id} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                        {evidenceIndex.get(id)?.title ?? "Evidence"}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => conflictMutation.mutate({ id: c.id, status: "acknowledged" })}
                  >
                    I'll deal with it
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => conflictMutation.mutate({ id: c.id, status: "dismissed" })}
                  >
                    Not a conflict
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {requirements.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No requirements extracted yet</CardTitle>
            <CardDescription>
              {role.job_description
                ? "Hit Reassess to parse the job description."
                : "Add the job description to this role to extract requirements."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        grouped.map((group) =>
          group.items.length === 0 ? null : (
            <section key={group.status} className="space-y-3">
              <div className="flex items-baseline gap-3">
                <StatusBadge status={group.status} />
                <p className="text-muted-foreground text-sm">
                  {STATUS_META[group.status].description}
                </p>
              </div>
              {group.items.map((req) => {
                const a = byReq.get(req.id);
                const current = ((a?.user_status ?? a?.status) as Status) ?? "skill_gap";
                const support = a?.supporting_evidence_ids ?? [];
                return (
                  <Card key={req.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{req.canonical_skill}</CardTitle>
                          <CardDescription>
                            {importanceLabel(req.importance)}
                            {req.seniority_level ? ` · ${req.seniority_level}` : ""}
                            {req.original_wording ? ` · “${req.original_wording}”` : ""}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {a?.user_status ? <OverriddenTag /> : null}
                          {a ? <ConfidenceBadge confidence={a.confidence} /> : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {a?.user_reasoning ? (
                        <p className="border-primary/40 border-s-2 ps-3 text-sm">
                          <span className="font-medium">Your correction: </span>
                          {a.user_reasoning}
                        </p>
                      ) : null}
                      {a?.reasoning ? (
                        <p className="text-sm">{a.reasoning}</p>
                      ) : (
                        <p className="text-muted-foreground text-sm">Not assessed yet.</p>
                      )}
                      {support.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground text-xs">Based on:</span>
                          {support.map((id) => (
                            <span key={id} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                              {evidenceIndex.get(id)?.title ?? "Evidence"}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {a?.missing_evidence ? (
                        <p className="border-primary/40 border-s-2 ps-3 text-sm">
                          <span className="font-medium">What would close it: </span>
                          {a.missing_evidence}
                        </p>
                      ) : null}
                      {a ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button size="sm" variant="outline" onClick={() => setInspecting(req.id)}>
                            <FileSearch className="size-4" /> Inspect reasoning
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(a);
                              setDraftReasoning(a.user_reasoning ?? "");
                            }}
                          >
                            <PenLine className="size-4" /> Disagree
                          </Button>
                          {a.user_status ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                overrideMutation.mutate({
                                  id: a.id,
                                  user_status: null,
                                  user_reasoning: null,
                                })
                              }
                            >
                              Reset to AI view ({STATUS_META[a.status as Status]?.label})
                            </Button>
                          ) : null}
                          <span className="text-muted-foreground ms-auto text-xs">
                            Currently: {STATUS_META[current].label}
                          </span>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          ),
        )
      )}

      {/* Provenance ------------------------------------------------------- */}
      <Dialog open={inspecting !== null} onOpenChange={(o) => !o && setInspecting(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {inspectedReq?.canonical_skill ?? "Assessment"}
            </DialogTitle>
            <DialogDescription>
              Everything behind this conclusion — the evidence used, the reasoning, and how
              confident the analysis is.
            </DialogDescription>
          </DialogHeader>
          {inspected ? (
            <div className="space-y-5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={(inspected.user_status ?? inspected.status) as Status} />
                <ConfidenceBadge confidence={inspected.confidence} />
                <span className="text-muted-foreground text-xs">
                  Evidence strength {Math.round(Number(inspected.strength ?? 0) * 100)}%
                </span>
                {inspected.overridden_at ? <OverriddenTag>Overridden by you</OverriddenTag> : null}
              </div>

              <section>
                <p className="mb-1 font-medium">Reasoning</p>
                <p className="text-muted-foreground">{inspected.reasoning ?? "—"}</p>
              </section>

              <section>
                <p className="mb-2 font-medium">Evidence cited</p>
                {(inspected.supporting_evidence_ids ?? []).length === 0 ? (
                  <p className="text-muted-foreground">
                    None. Nothing on file was judged to support this requirement.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(inspected.supporting_evidence_ids ?? []).map((id) => {
                      const e = evidenceIndex.get(id);
                      return (
                        <li key={id} className="rounded-md border p-3">
                          <p className="font-medium">{e?.title ?? "Evidence"}</p>
                          <p className="text-muted-foreground text-xs">
                            {[e?.organisation, e?.occurred_on].filter(Boolean).join(" · ") ||
                              "Undated"}
                          </p>
                          <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                            id {id}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Scope", inspected.scope_note],
                  ["Autonomy", inspected.autonomy_note],
                  ["Depth of experience", inspected.experience_note],
                  ["Seniority match", inspected.seniority_note],
                  ["Recency", inspected.recency_note],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-md border p-3">
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {(value as string | null) ?? "Not stated in the evidence."}
                    </p>
                  </div>
                ))}
              </section>

              {inspected.missing_evidence || inspected.next_step ? (
                <section className="space-y-1">
                  {inspected.missing_evidence ? (
                    <p>
                      <span className="font-medium">Missing: </span>
                      {inspected.missing_evidence}
                    </p>
                  ) : null}
                  {inspected.next_step ? (
                    <p>
                      <span className="font-medium">Next step: </span>
                      {inspected.next_step}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {inspected.user_reasoning || inspected.user_note ? (
                <section className="border-primary/40 border-s-2 ps-3">
                  <p className="font-medium">Your correction</p>
                  <p className="text-muted-foreground">
                    {inspected.user_reasoning ?? inspected.user_note}
                  </p>
                </section>
              ) : null}

              {inspectedReq?.reasoning ? (
                <section>
                  <p className="mb-1 font-medium">Why this requirement was extracted</p>
                  <p className="text-muted-foreground">{inspectedReq.reasoning}</p>
                </section>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Override --------------------------------------------------------- */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Correct this assessment</DialogTitle>
            <DialogDescription>
              Your call wins, and survives every future reassessment until you reset it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Set the status to</Label>
              <div className="flex flex-wrap gap-2">
                {ORDER.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={
                      (editing?.user_status ?? editing?.status) === status ? "default" : "outline"
                    }
                    onClick={() =>
                      editing &&
                      overrideMutation.mutate({
                        id: editing.id,
                        user_status: status,
                        user_reasoning: draftReasoning.trim() || null,
                      })
                    }
                  >
                    {STATUS_META[status].label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Why the AI got it wrong (optional)</Label>
              <Textarea
                rows={4}
                maxLength={2000}
                value={draftReasoning}
                placeholder="I owned the budget on this, it wasn't a support role."
                onChange={(e) => setDraftReasoning(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={!editing}
              onClick={() =>
                editing &&
                overrideMutation.mutate({
                  id: editing.id,
                  user_status: (editing.user_status as Status) ?? null,
                  user_reasoning: draftReasoning.trim() || null,
                })
              }
            >
              Save note only
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coverage maths ---------------------------------------------------- */}
      <Dialog open={showMath} onOpenChange={setShowMath}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">How coverage is calculated</DialogTitle>
            <DialogDescription>
              Each requirement carries a weight by importance (critical 3, important 2, useful 1).
              Proven counts fully, developing counts half, an evidence gap counts a quarter, and a
              skill gap counts nothing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            {breakdown.map((row) => (
              <div
                key={row.requirementId}
                className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0"
              >
                <span className="min-w-40 flex-1 font-medium">{row.label}</span>
                <StatusBadge status={row.status} />
                {row.overridden ? <OverriddenTag /> : null}
                <span className="text-muted-foreground tabular-nums">
                  {row.contribution} / {row.weight}
                </span>
              </div>
            ))}
            <p className="pt-3 font-medium tabular-nums">
              Total {data.coverage.coveredWeight} / {data.coverage.totalWeight} ={" "}
              {data.coverage.percent ?? 0}%
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
