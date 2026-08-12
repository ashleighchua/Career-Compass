import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getRoleDetail,
  generateInterviewSet,
  listInterviewQuestions,
  saveInterviewAnswer,
} from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/interview/$roleId")({
  head: () => ({
    meta: [
      { title: "Interview mode — Career Evidence Engine" },
      {
        name: "description",
        content:
          "Practise the questions this panel would actually ask you, grounded in your own evidence.",
      },
      { property: "og:title", content: "Interview mode — Career Evidence Engine" },
      {
        property: "og:description",
        content: "Questions built from your gaps, with honest feedback on your answers.",
      },
    ],
  }),
  component: InterviewMode,
});

type Critique = {
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  unsupported_claims: string[];
  missing_evidence: string[];
  improved_outline: string;
  is_mock?: boolean;
};

type Question = {
  id: string;
  question: string;
  question_type: string;
  difficulty: string;
  why_asked: string | null;
  suggested_structure: string | null;
  risk_note: string | null;
  evidence_ids: string[] | null;
  user_answer: string | null;
  answer_feedback: Critique | null;
};

const TYPE_LABEL: Record<string, string> = {
  behavioural: "Behavioural",
  technical: "Technical",
  scope_probe: "Scope probe",
  gap_probe: "Gap probe",
  motivation: "Motivation",
};

function InterviewMode() {
  const { roleId } = Route.useParams();
  const qc = useQueryClient();
  const fetchQuestions = useServerFn(listInterviewQuestions);
  const fetchRole = useServerFn(getRoleDetail);
  const generate = useServerFn(generateInterviewSet);
  const saveAnswer = useServerFn(saveInterviewAnswer);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: role } = useQuery({
    queryKey: ["role", roleId],
    queryFn: () => fetchRole({ data: { id: roleId } }),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["interview", roleId],
    queryFn: () => fetchQuestions({ data: { id: roleId } }),
  });

  const fail = (e: Error) => toast.error(e.message);

  const generateMutation = useMutation({
    mutationFn: () => generate({ data: { id: roleId } }),
    onSuccess: () => {
      toast.success("Question set ready.");
      void qc.invalidateQueries({ queryKey: ["interview", roleId] });
    },
    onError: fail,
  });

  const answerMutation = useMutation({
    mutationFn: (input: { id: string; answer: string }) =>
      saveAnswer({ data: { ...input, critique: true } }),
    onSuccess: () => {
      toast.success("Answer saved and critiqued.");
      void qc.invalidateQueries({ queryKey: ["interview", roleId] });
    },
    onError: fail,
  });

  const questions = (data ?? []) as unknown as Question[];
  const evidenceIndex = new Map(
    ((role?.evidenceIndex ?? []) as Array<{ id: string; title: string }>).map((e) => [
      e.id,
      e.title,
    ]),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/roles/$roleId" params={{ roleId }}>
          <ArrowLeft className="size-4" /> Back to assessment
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Interview mode</h1>
          <p className="text-muted-foreground text-sm">
            The questions a sharp panel would ask you about{" "}
            {(role?.role as { title?: string } | undefined)?.title ?? "this role"} — including the
            ones your evidence can't yet answer.
          </p>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          <Sparkles className="size-4" />
          {generateMutation.isPending
            ? "Preparing…"
            : questions.length
              ? "Regenerate set"
              : "Generate questions"}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : questions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No questions yet</CardTitle>
            <CardDescription>
              Assess this role first, then generate a set built from your actual gaps.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        questions.map((q) => {
          const draft = drafts[q.id] ?? q.user_answer ?? "";
          return (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-muted rounded-full px-2 py-0.5 text-[11px] font-medium">
                    {TYPE_LABEL[q.question_type] ?? q.question_type}
                  </span>
                  <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] capitalize">
                    {q.difficulty}
                  </span>
                </div>
                <CardTitle className="mt-2 text-base leading-snug">{q.question}</CardTitle>
                {q.why_asked ? <CardDescription>{q.why_asked}</CardDescription> : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {(q.evidence_ids ?? []).length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">Draw on:</span>
                    {(q.evidence_ids ?? []).map((id) => (
                      <span key={id} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                        {evidenceIndex.get(id) ?? "Evidence"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    You have no evidence on file for this one — that's why it's being asked.
                  </p>
                )}
                {q.suggested_structure ? (
                  <p className="border-primary/40 border-s-2 ps-3 text-sm">
                    <span className="font-medium">Shape: </span>
                    {q.suggested_structure}
                  </p>
                ) : null}
                {q.risk_note ? (
                  <p className="text-muted-foreground text-sm">Watch out: {q.risk_note}</p>
                ) : null}

                <Textarea
                  rows={5}
                  maxLength={6000}
                  value={draft}
                  placeholder="Answer out loud first, then write the version you'd actually say."
                  onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
                />
                <Button
                  size="sm"
                  disabled={answerMutation.isPending || draft.trim().length < 20}
                  onClick={() => answerMutation.mutate({ id: q.id, answer: draft })}
                >
                  {answerMutation.isPending ? "Reviewing…" : "Save & critique"}
                </Button>

                {q.answer_feedback ? (
                  <div className="bg-muted/40 space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium capitalize">Verdict: {q.answer_feedback.verdict}</p>
                    <FeedbackList label="Strengths" items={q.answer_feedback.strengths} />
                    <FeedbackList label="Weaknesses" items={q.answer_feedback.weaknesses} />
                    <FeedbackList
                      label="Claims your evidence doesn't support"
                      items={q.answer_feedback.unsupported_claims}
                    />
                    <FeedbackList
                      label="Missing evidence"
                      items={q.answer_feedback.missing_evidence}
                    />
                    {q.answer_feedback.improved_outline ? (
                      <p>
                        <span className="font-medium">Better shape: </span>
                        {q.answer_feedback.improved_outline}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function FeedbackList({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="font-medium">{label}</p>
      <ul className="text-muted-foreground list-disc ps-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
