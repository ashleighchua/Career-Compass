import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { completeActionAsEvidence, listActions, updateActionStatus } from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/actions")({
  head: () => ({
    meta: [
      { title: "Actions — Career Compass" },
      {
        name: "description",
        content: "The highest-leverage work to close your gaps — and a way to log it as evidence.",
      },
      { property: "og:title", content: "Actions — Career Compass" },
      { property: "og:description", content: "Build the proof, then capture it." },
    ],
  }),
  component: ActionsPage,
});

type ActionRow = {
  id: string;
  title: string;
  description: string | null;
  action_type: string | null;
  effort: string | null;
  status: string;
  rationale: string | null;
  evidence_it_creates: string | null;
  target_roles: { id: string; title: string } | null;
};

function ActionsPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listActions);
  const setStatus = useServerFn(updateActionStatus);
  const complete = useServerFn(completeActionAsEvidence);

  const [active, setActive] = useState<ActionRow | null>(null);
  const [form, setForm] = useState({ title: "", actions: "", outcome: "", metrics: "" });

  const { data, isLoading } = useQuery({ queryKey: ["actions"], queryFn: () => fetchAll() });
  const invalidate = () => void qc.invalidateQueries();
  const fail = (e: Error) => toast.error(e.message);

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: "in_progress" | "dismissed" | "recommended" }) =>
      setStatus({ data: input }),
    onSuccess: invalidate,
    onError: fail,
  });

  const completeMutation = useMutation({
    mutationFn: (action: ActionRow) =>
      complete({
        data: {
          actionId: action.id,
          evidence: {
            title: form.title.trim() || action.title,
            actions: form.actions.trim() || null,
            outcome: form.outcome.trim() || null,
            metrics: form.metrics.trim() || null,
            source_type: "project",
          },
        },
      }),
    onSuccess: () => {
      toast.success("Captured as evidence. Reassess the role to see coverage move.");
      setActive(null);
      setForm({ title: "", actions: "", outcome: "", metrics: "" });
      invalidate();
    },
    onError: fail,
  });

  const rows = (data ?? []) as unknown as ActionRow[];
  const open = rows.filter((r) => r.status !== "completed" && r.status !== "dismissed");
  const done = rows.filter((r) => r.status === "completed");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="font-display text-2xl font-semibold">Actions</h1>
        <p className="text-muted-foreground text-sm">
          Do the work, then log what it produced. That's how coverage moves.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No actions yet</CardTitle>
            <CardDescription>
              Assess a target role and we'll recommend the few things worth doing next.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {open.map((action) => (
            <Card key={action.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription>
                      {[action.action_type, action.effort, action.target_roles?.title]
                        .filter(Boolean)
                        .join(" · ")}
                    </CardDescription>
                  </div>
                  {action.status === "in_progress" ? (
                    <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs">
                      In progress
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {action.description ? <p className="text-sm">{action.description}</p> : null}
                {action.rationale ? (
                  <p className="text-muted-foreground text-sm">{action.rationale}</p>
                ) : null}
                {action.evidence_it_creates ? (
                  <p className="border-primary/40 border-s-2 ps-3 text-sm">
                    <span className="font-medium">Evidence it creates: </span>
                    {action.evidence_it_creates}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {action.status !== "in_progress" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        statusMutation.mutate({ id: action.id, status: "in_progress" })
                      }
                    >
                      Start
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={() => {
                      setActive(action);
                      setForm({ title: action.title, actions: "", outcome: "", metrics: "" });
                    }}
                  >
                    Log as evidence
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => statusMutation.mutate({ id: action.id, status: "dismissed" })}
                  >
                    Not for me
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {done.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completed</CardTitle>
                <CardDescription>{done.length} action(s) turned into evidence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {done.map((a) => (
                  <p key={a.id} className="text-muted-foreground text-sm">
                    {a.title}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Capture what you did</DialogTitle>
            <DialogDescription>
              This becomes a new piece of evidence and marks your roles for reassessment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                maxLength={200}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>What you actually did</Label>
              <Textarea
                rows={3}
                maxLength={4000}
                value={form.actions}
                onChange={(e) => setForm({ ...form, actions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Textarea
                rows={3}
                maxLength={4000}
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Numbers (optional)</Label>
              <Input
                value={form.metrics}
                maxLength={2000}
                onChange={(e) => setForm({ ...form, metrics: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={completeMutation.isPending || !active}
              onClick={() => active && completeMutation.mutate(active)}
            >
              {completeMutation.isPending ? "Saving…" : "Save as evidence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
