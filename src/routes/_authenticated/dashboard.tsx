import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CoverageRing,
  StatusBadge,
  importanceLabel,
  STATUS_META,
  type Status,
} from "@/components/status";
import { getOverview, seedDemoData, assessRole } from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Career Evidence Engine" },
      {
        name: "description",
        content: "Your evidence coverage against your active target role, and what to do next.",
      },
      { property: "og:title", content: "Dashboard — Career Evidence Engine" },
      { property: "og:description", content: "Evidence coverage and next actions." },
    ],
  }),
  component: Dashboard,
});

type Assessment = {
  id: string;
  requirement_id: string;
  status: string;
  user_status: string | null;
  rationale: string | null;
};

function Dashboard() {
  const fetchOverview = useServerFn(getOverview);
  const seed = useServerFn(seedDemoData);
  const assess = useServerFn(assessRole);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
  });

  const seedMutation = useMutation({
    mutationFn: () => seed(),
    onSuccess: () => {
      toast.success("Demo profile loaded. Run the assessment to see the gaps.");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assessMutation = useMutation({
    mutationFn: (id: string) => assess({ data: { id } }),
    onSuccess: () => {
      toast.success("Assessment updated.");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6 md:p-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (data.evidenceCount === 0 && data.roleCount === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6 md:p-10">
        <h1 className="font-display text-2xl font-semibold">Start with what you've already done</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Add a few pieces of evidence and a target role, and we'll show you which requirements you
          can already prove — and which are a real skill gap.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/evidence">Add evidence</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/roles">Add a target role</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            <Sparkles className="size-4" />
            {seedMutation.isPending ? "Loading demo…" : "Load demo profile"}
          </Button>
        </div>
      </div>
    );
  }

  const assessments = (data.assessments ?? []) as Assessment[];
  const byRequirement = new Map(assessments.map((a) => [a.requirement_id, a]));
  const requirements = (data.requirements ?? []) as Array<{
    id: string;
    requirement: string;
    canonical_skill: string;
    importance: string;
  }>;

  const counts = { proven: 0, developing: 0, evidence_gap: 0, skill_gap: 0 } as Record<
    Status,
    number
  >;
  for (const req of requirements) {
    const a = byRequirement.get(req.id);
    const status = ((a?.user_status ?? a?.status) as Status) ?? "skill_gap";
    counts[status] = (counts[status] ?? 0) + 1;
  }

  const role = data.activeRole as { id: string; title: string; company: string | null } | null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Target role</p>
          <h1 className="font-display text-2xl font-semibold">
            {role ? role.title : "No active target role"}
          </h1>
          {role?.company ? <p className="text-muted-foreground text-sm">{role.company}</p> : null}
        </div>
        {role ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => assessMutation.mutate(role.id)}
              disabled={assessMutation.isPending}
            >
              {assessMutation.isPending ? "Reassessing…" : "Reassess"}
            </Button>
            <Button asChild>
              <Link to="/roles/$roleId" params={{ roleId: role.id }}>
                Open role <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <Button asChild>
            <Link to="/roles">Choose a target role</Link>
          </Button>
        )}
      </div>

      {role && requirements.length > 0 && assessments.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not assessed yet</CardTitle>
            <CardDescription>
              These requirements haven't been compared against your evidence, so everything reads as
              a skill gap and coverage shows 0%. Run the assessment to see the real picture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => assessMutation.mutate(role.id)}
              disabled={assessMutation.isPending}
            >
              {assessMutation.isPending ? "Assessing…" : "Run assessment"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {role ? (
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          <Card className="justify-center">
            <CardContent className="flex justify-center pt-2">
              <CoverageRing percent={data.coverage.percent} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Where you stand</CardTitle>
              <CardDescription>
                Weighted by how much each requirement matters to this role.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {(Object.keys(STATUS_META) as Status[]).map((status) => (
                <div key={status} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={status} />
                    <span className="font-display text-lg tabular-nums">{counts[status] ?? 0}</span>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {STATUS_META[status].description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {role && requirements.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requirements</CardTitle>
            <CardDescription>Ranked by importance to the role.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {requirements.slice(0, 8).map((req) => {
              const a = byRequirement.get(req.id);
              const status = ((a?.user_status ?? a?.status) as Status) ?? "skill_gap";
              return (
                <div key={req.id} className="flex flex-wrap items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{req.requirement}</p>
                    <p className="text-muted-foreground text-xs">
                      {req.canonical_skill} · {importanceLabel(req.importance)}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>
              );
            })}
            {requirements.length > 8 && role ? (
              <div className="pt-3">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/roles/$roleId" params={{ roleId: role.id }}>
                    See all {requirements.length} requirements
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {(data.actions ?? []).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Highest-leverage next actions</CardTitle>
            <CardDescription>
              Each one is chosen to move coverage, not to look busy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.actions as Array<Record<string, string>>).map((action) => (
              <div key={action["id"]} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{action["title"]}</p>
                  <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
                    {action["action_type"]}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{action["description"]}</p>
              </div>
            ))}
            <Button asChild variant="ghost" size="sm">
              <Link to="/actions">
                Work through actions <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
