import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Trash2, Wand2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  analyseEvidence,
  createEvidence,
  deleteEvidence,
  listEvidence,
  overrideEvidenceSkill,
} from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence — Career Evidence Engine" },
      {
        name: "description",
        content: "Everything you've done, captured as evidence and mapped to capabilities.",
      },
      { property: "og:title", content: "Evidence — Career Evidence Engine" },
      { property: "og:description", content: "Capture what you've done as usable proof." },
    ],
  }),
  component: EvidencePage,
});

const EMPTY = {
  title: "",
  context: "",
  actions: "",
  outcome: "",
  metrics: "",
  organisation: "",
  occurred_on: "",
};

type SkillLink = {
  id: string;
  strength: number | null;
  confidence: string | null;
  relationship_type: string | null;
  reasoning: string | null;
  user_decision: string | null;
  skills: { canonical_name: string } | null;
};

type EvidenceRow = {
  id: string;
  title: string;
  context: string | null;
  actions: string | null;
  outcome: string | null;
  metrics: string | null;
  organisation: string | null;
  occurred_on: string | null;
  analysis_status: string | null;
  evidence_skills: SkillLink[] | null;
};

function EvidencePage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listEvidence);
  const create = useServerFn(createEvidence);
  const analyse = useServerFn(analyseEvidence);
  const remove = useServerFn(deleteEvidence);
  const override = useServerFn(overrideEvidenceSkill);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data, isLoading } = useQuery({ queryKey: ["evidence"], queryFn: () => fetchAll() });

  const invalidate = () => void qc.invalidateQueries();
  const fail = (e: Error) => toast.error(e.message);

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await create({
        data: {
          title: form.title.trim(),
          context: form.context.trim() || null,
          actions: form.actions.trim() || null,
          outcome: form.outcome.trim() || null,
          metrics: form.metrics.trim() || null,
          organisation: form.organisation.trim() || null,
          occurred_on: form.occurred_on || null,
        },
      });
      await analyse({ data: { id: created.id } });
      return created;
    },
    onSuccess: () => {
      toast.success("Evidence captured and mapped to capabilities.");
      setForm({ ...EMPTY });
      setOpen(false);
      invalidate();
    },
    onError: fail,
  });

  const analyseMutation = useMutation({
    mutationFn: (id: string) => analyse({ data: { id } }),
    onSuccess: () => {
      toast.success("Capabilities remapped.");
      invalidate();
    },
    onError: fail,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
    onError: fail,
  });

  const overrideMutation = useMutation({
    mutationFn: (input: { id: string; decision: "confirmed" | "rejected" }) =>
      override({ data: input }),
    onSuccess: invalidate,
    onError: fail,
  });

  const rows = (data ?? []) as unknown as EvidenceRow[];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Evidence</h1>
          <p className="text-muted-foreground text-sm">
            Situation, what you did, what changed. Specifics are what make it provable.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add evidence</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Capture a piece of evidence</DialogTitle>
              <DialogDescription>
                It doesn't have to be from a job. Side projects, volunteering and internal pilots
                all count.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <FormField
                label="What happened?"
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
                placeholder="Led the operating-model workstream of a bank transformation"
              />
              <FormArea
                label="Context"
                value={form.context}
                onChange={(v) => setForm({ ...form, context: v })}
                placeholder="What was the situation or problem?"
              />
              <FormArea
                label="What you did"
                value={form.actions}
                onChange={(v) => setForm({ ...form, actions: v })}
                placeholder="Your specific actions and decisions"
              />
              <FormArea
                label="Outcome"
                value={form.outcome}
                onChange={(v) => setForm({ ...form, outcome: v })}
                placeholder="What changed as a result?"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Numbers (optional)"
                  value={form.metrics}
                  onChange={(v) => setForm({ ...form, metrics: v })}
                  placeholder="3 teams, 7 weeks"
                />
                <FormField
                  label="Organisation (optional)"
                  value={form.organisation}
                  onChange={(v) => setForm({ ...form, organisation: v })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occurred">When (optional)</Label>
                <Input
                  id="occurred"
                  type="date"
                  value={form.occurred_on}
                  onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!form.title.trim()) {
                    toast.error("Give this evidence a title");
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Mapping capabilities…" : "Save & map"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No evidence yet</CardTitle>
            <CardDescription>
              Add the first thing you've done that you'd want a hiring manager to know about.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{row.title}</CardTitle>
                  <CardDescription>
                    {[row.organisation, row.occurred_on].filter(Boolean).join(" · ") || "Undated"}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => analyseMutation.mutate(row.id)}
                    disabled={analyseMutation.isPending}
                  >
                    <Wand2 className="size-4" /> Remap
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(row.id)}
                    aria-label="Delete evidence"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {row.outcome ? <p className="text-sm">{row.outcome}</p> : null}
              {row.metrics ? (
                <p className="text-muted-foreground text-xs">Numbers: {row.metrics}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {(row.evidence_skills ?? []).length === 0 ? (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Sparkles className="size-3" /> Not mapped yet — hit Remap.
                  </p>
                ) : (
                  (row.evidence_skills ?? []).map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      title={link.reasoning ?? undefined}
                      onClick={() =>
                        overrideMutation.mutate({
                          id: link.id,
                          decision: link.user_decision === "rejected" ? "confirmed" : "rejected",
                        })
                      }
                      className={
                        link.user_decision === "rejected"
                          ? "text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs line-through"
                          : "bg-accent text-accent-foreground rounded-full border px-2.5 py-0.5 text-xs"
                      }
                    >
                      {link.skills?.canonical_name}
                      {link.relationship_type && link.relationship_type !== "direct"
                        ? ` · ${link.relationship_type}`
                        : ""}
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        maxLength={200}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FormArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        maxLength={4000}
        rows={3}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
