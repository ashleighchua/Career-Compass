import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateApplicationMaterial,
  getApplicationKit,
  getRoleDetail,
} from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/apply/$roleId")({
  head: () => ({
    meta: [
      { title: "Application prep — Career Compass" },
      {
        name: "description",
        content:
          "Positioning, resume bullets and a cover letter built only from evidence you can back up.",
      },
      { property: "og:title", content: "Application prep — Career Compass" },
      {
        property: "og:description",
        content: "Every line traced back to a real piece of your evidence.",
      },
    ],
  }),
  component: ApplyPage,
});

type Bullet = { bullet: string; evidence_refs: string[]; requirement_refs: string[] };
type Point = { point: string; evidence_refs: string[] };
type Risk = { risk: string; how_to_handle: string };

function ApplyPage() {
  const { roleId } = Route.useParams();
  const qc = useQueryClient();
  const fetchKit = useServerFn(getApplicationKit);
  const fetchRole = useServerFn(getRoleDetail);
  const generate = useServerFn(generateApplicationMaterial);

  const { data: role } = useQuery({
    queryKey: ["role", roleId],
    queryFn: () => fetchRole({ data: { id: roleId } }),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["kit", roleId],
    queryFn: () => fetchKit({ data: { id: roleId } }),
  });

  const generateMutation = useMutation({
    mutationFn: () => generate({ data: { id: roleId } }),
    onSuccess: () => {
      toast.success("Application material ready.");
      void qc.invalidateQueries({ queryKey: ["kit", roleId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidenceIndex = new Map(
    ((role?.evidenceIndex ?? []) as Array<{ id: string; title: string }>).map((e) => [
      e.id,
      e.title,
    ]),
  );

  const kit = data as
    | {
        positioning_summary: string;
        resume_bullets: Bullet[];
        cover_letter: string | null;
        talking_points: Point[];
        risks: Risk[];
      }
    | null
    | undefined;

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/roles/$roleId" params={{ roleId }}>
          <ArrowLeft className="size-4" /> Back to assessment
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Application prep</h1>
          <p className="text-muted-foreground text-sm">
            Built only from evidence on file — every line traces back to something you actually did.
          </p>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          <Sparkles className="size-4" />
          {generateMutation.isPending ? "Writing…" : kit ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !kit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nothing generated yet</CardTitle>
            <CardDescription>
              Assess this role first, then generate positioning grounded in your evidence.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Positioning</CardTitle>
              <CardDescription>How to frame yourself for this specific role.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{kit.positioning_summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resume bullets</CardTitle>
              <CardDescription>Each one cites the evidence it came from.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(kit.resume_bullets ?? []).map((b) => (
                <div key={b.bullet} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{b.bullet}</p>
                    <Button size="sm" variant="ghost" onClick={() => copy(b.bullet)}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.evidence_refs.map((id) => (
                      <span key={id} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                        {evidenceIndex.get(id) ?? "Evidence"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {kit.cover_letter ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Cover letter draft</CardTitle>
                    <CardDescription>Edit it into your own voice before sending.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(kit.cover_letter ?? "")}>
                    <Copy className="size-4" /> Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{kit.cover_letter}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Talking points</CardTitle>
              <CardDescription>What to lead with in a first conversation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(kit.talking_points ?? []).map((p) => (
                <div key={p.point} className="rounded-lg border p-3">
                  <p className="text-sm">{p.point}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.evidence_refs.map((id) => (
                      <span key={id} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                        {evidenceIndex.get(id) ?? "Evidence"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Where you're exposed</CardTitle>
              <CardDescription>
                Handle these honestly rather than hoping nobody asks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(kit.risks ?? []).map((r) => (
                <div key={r.risk} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{r.risk}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{r.how_to_handle}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
