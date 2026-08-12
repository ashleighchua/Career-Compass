import type { SupabaseClient } from "@supabase/supabase-js";

import {
  jobParserJsonSchema,
  jobParserSchema,
  type JobParserResult,
  evidenceMapperJsonSchema,
  evidenceMapperSchema,
  type EvidenceMapperResult,
  gapAnalyzerJsonSchema,
  gapAnalyzerSchema,
  type GapAnalyzerResult,
  actionGeneratorJsonSchema,
  actionGeneratorSchema,
  type ActionGeneratorResult,
  interviewPrepJsonSchema,
  interviewPrepSchema,
  type InterviewPrepResult,
  answerCritiqueJsonSchema,
  answerCritiqueSchema,
  type AnswerCritiqueResult,
  applicationKitJsonSchema,
  applicationKitSchema,
  type ApplicationKitResult,
} from "./schemas";
import { fingerprint, runAIService, truncateInput, type AIRunResult } from "./provider.server";
import {
  mockJobParse,
  mockEvidenceMap,
  mockGapAnalysis,
  mockActions,
  mockInterviewPrep,
  mockAnswerCritique,
  mockApplicationKit,
  type EvidenceDigest,
  type RequirementDigest,
} from "./mock.server";

export type { EvidenceDigest, RequirementDigest };

type Ctx = { supabase: SupabaseClient; userId: string };

// ---------------------------------------------------------------------------
// JobParser — job description -> structured requirements
// ---------------------------------------------------------------------------

export function parseJobDescription(
  ctx: Ctx,
  input: { title: string; jobDescription: string },
): Promise<AIRunResult<JobParserResult>> {
  const jd = truncateInput(input.jobDescription);
  return runAIService({
    service: "job_parser",
    schemaName: "job_requirements",
    system: `Extract the structured requirements of a job from its description.
Separate responsibilities, required skills, preferred skills, experience requirements,
domain knowledge and seniority signals using requirement_type.
Do not extract keywords: each requirement must be a capability a person could evidence.
Set importance to "critical" only when the requirement is explicitly required or central
to the role; "important" when strongly relevant; "useful" when preferred or secondary.
Produce between 8 and 20 requirements. Merge near-duplicates into one canonical skill.`,
    input: `TARGET ROLE TITLE: ${input.title}\n\nJOB DESCRIPTION:\n${jd}`,
    jsonSchema: jobParserJsonSchema,
    schema: jobParserSchema,
    mock: () => mockJobParse(input.title),
    cache: { ...ctx, fingerprint: fingerprint("job", input.title, jd) },
  });
}

// ---------------------------------------------------------------------------
// EvidenceMapper — evidence item -> normalised skills with relationship + reasoning
// ---------------------------------------------------------------------------

export function mapEvidenceToSkills(
  ctx: Ctx,
  evidence: EvidenceDigest,
): Promise<AIRunResult<EvidenceMapperResult>> {
  const body = truncateInput(evidenceToText(evidence));
  return runAIService({
    service: "evidence_mapper",
    schemaName: "evidence_skills",
    system: `Identify which capabilities one piece of career evidence actually demonstrates.
For each skill set relationship_type:
 - "direct": the evidence shows the skill being applied in the same context.
 - "transferable": a different context demonstrates a related capability. Say in the
   reasoning what does NOT transfer.
 - "indirect": the skill was adjacent to, but not owned by, the person.
 - "inferred": you are inferring it; label the inference in the reasoning.
strength (0-1) must reflect specificity, the person's own actions, outcome, validation,
quantification and scope — not how impressive the words sound. A self-declared skill or a
course certificate must not score above 0.35.
Return 2-8 skills. Also list concretely missing details and short follow-up questions the
person could answer to strengthen the evidence. Never invent an answer to those questions.`,
    input: body,
    jsonSchema: evidenceMapperJsonSchema,
    schema: evidenceMapperSchema,
    mock: () => mockEvidenceMap(evidence),
    cache: { ...ctx, fingerprint: fingerprint("evidence", body) },
  });
}

// ---------------------------------------------------------------------------
// GapAnalyzer — requirements + evidence -> Proven / Developing / Evidence gap / Skill gap
// ---------------------------------------------------------------------------

export function analyseGaps(
  ctx: Ctx,
  input: {
    roleTitle: string;
    seniority: string | null;
    requirements: RequirementDigest[];
    evidence: EvidenceDigest[];
  },
): Promise<AIRunResult<GapAnalyzerResult>> {
  const payload = truncateInput(
    `TARGET ROLE: ${input.roleTitle}${input.seniority ? ` (${input.seniority})` : ""}

REQUIREMENTS:
${input.requirements
  .map(
    (r) =>
      `- ref=${r.ref} | ${r.canonicalSkill} | importance=${r.importance} | type=${r.requirementType}` +
      `${r.seniorityLevel ? ` | level=${r.seniorityLevel}` : ""}${r.originalWording ? `\n  wording: ${r.originalWording}` : ""}`,
  )
  .join("\n")}

EVIDENCE (today is ${new Date().toISOString().slice(0, 10)}):
${input.evidence.map((e) => `- ref=${e.ref}\n${indent(evidenceToText(e))}`).join("\n")}`,
  );

  return runAIService({
    service: "gap_analyzer",
    schemaName: "gap_analysis",
    system: `Assess, for every requirement, how strongly this person's evidence supports it.
Choose exactly one status:
 - "proven": strong, relevant, specific evidence at a comparable level of scope.
 - "developing": some evidence exists but it is partial, indirect, dated or below the
   required level of scope.
 - "evidence_gap": the person plausibly HAS the capability, but the current evidence does
   not demonstrate it convincingly (missing outcome, scope, ownership or detail).
 - "skill_gap": there is little or no credible evidence of the underlying capability.
The difference between evidence_gap and skill_gap is the most important judgement you make.
Rules:
 - Cite the evidence refs you relied on in supporting_evidence_refs. Never cite evidence
   you did not use. An empty list is correct for a skill gap.
 - Multiple evidence items describing the SAME project count as one demonstration.
 - Keyword presence is never sufficient. Judge the four seniority dimensions explicitly and
   record each in its own field, writing "not stated in the evidence" when unknown:
     scope_note: blast radius — budget, revenue, users, systems, org breadth.
     autonomy_note: did they decide, or execute someone else's decision? Who did they
       influence, and with what authority?
     experience_note: depth and repetition — how many times, over how long, and does the
       length of exposure match the level the role asks for?
     seniority_note: the overall level the evidence demonstrates versus the level required.
   Evidence one level below the requirement caps the status at "developing", however
   articulate the wording is. Team size and ownership language ("I led" vs "I supported")
   materially change the judgement.
 - Recency reduces persuasiveness but does not erase a major achievement; mention it in
   recency_note only when it materially changed your assessment.
 - confidence reflects how sure YOU are given the evidence quality — "low" when you are
   inferring from thin or ambiguous material, even if the status is confident.
 - Report any factual contradiction between evidence items in "contradictions" rather than
   silently resolving it: conflicting dates, incompatible team sizes or scope claims,
   the same outcome attributed to different people, or metrics that cannot both be true.
   Cite the evidence refs involved and never pick a winner yourself.
Return exactly one assessment per requirement ref.`,

    input: payload,
    jsonSchema: gapAnalyzerJsonSchema,
    schema: gapAnalyzerSchema,
    mock: () => mockGapAnalysis(input.requirements, input.evidence),
    cache: {
      ...ctx,
      fingerprint: fingerprint("gaps", input.roleTitle, input.requirements, input.evidence),
    },
  });
}

// ---------------------------------------------------------------------------
// ActionGenerator — highest-leverage things to build next
// ---------------------------------------------------------------------------

export function generateActions(
  ctx: Ctx,
  input: {
    roleTitle: string;
    gaps: Array<{
      ref: string;
      canonicalSkill: string;
      importance: string;
      status: string;
      reasoning: string;
      missingEvidence: string | null;
    }>;
  },
): Promise<AIRunResult<ActionGeneratorResult>> {
  const payload = truncateInput(
    `TARGET ROLE: ${input.roleTitle}\n\nUNMET OR PARTIAL REQUIREMENTS:\n${input.gaps
      .map(
        (g) =>
          `- ref=${g.ref} | ${g.canonicalSkill} | importance=${g.importance} | status=${g.status}\n  why: ${g.reasoning}\n  missing: ${g.missingEvidence ?? "unspecified"}`,
      )
      .join("\n")}`,
  );

  return runAIService({
    service: "action_generator",
    schemaName: "recommended_actions",
    system: `Recommend the 3-5 highest-leverage things this person should do next to create
credible evidence. Rank by importance to the role, weakness of current evidence, how much
career impact the evidence would carry, how realistically it can be produced, and how well
it transfers to other roles.
Each action must map to specific requirement refs — no generic advice. Recommend "take a
course" only when it is genuinely the highest-value option for that gap.
deliverable must describe an artefact that would become evidence (a case study, a shipped
prototype, a documented experiment). effort is a realistic range such as "1-2 weeks".
An action for an evidence_gap should surface or document capability the person already has;
an action for a skill_gap must actually build the capability first.`,
    input: payload,
    jsonSchema: actionGeneratorJsonSchema,
    schema: actionGeneratorSchema,
    mock: () => mockActions(input.gaps),
    cache: { ...ctx, fingerprint: fingerprint("actions", input.roleTitle, input.gaps) },
  });
}

// ---------------------------------------------------------------------------
// InterviewPrep — questions this specific panel would ask this specific person
// ---------------------------------------------------------------------------

export function generateInterviewPrep(
  ctx: Ctx,
  input: {
    roleTitle: string;
    seniority: string | null;
    requirements: RequirementDigest[];
    evidence: EvidenceDigest[];
    assessments: Array<{ ref: string; canonicalSkill: string; status: string; reasoning: string }>;
  },
): Promise<AIRunResult<InterviewPrepResult>> {
  const payload = truncateInput(
    `TARGET ROLE: ${input.roleTitle}${input.seniority ? ` (${input.seniority})` : ""}

REQUIREMENTS:
${input.requirements.map((r) => `- ref=${r.ref} | ${r.canonicalSkill} | importance=${r.importance}`).join("\n")}

CURRENT ASSESSMENT:
${input.assessments.map((a) => `- ref=${a.ref} | ${a.canonicalSkill} | ${a.status}\n  why: ${a.reasoning}`).join("\n")}

EVIDENCE:
${input.evidence.map((e) => `- ref=${e.ref}\n${indent(evidenceToText(e))}`).join("\n")}`,
  );

  return runAIService({
    service: "interview_prep",
    schemaName: "interview_questions",
    system: `Write the 6-10 questions a sharp interview panel would actually ask THIS person
for THIS role, given what their evidence does and does not show.
 - Prioritise the requirements where the assessment is weakest or the scope is unclear:
   a gap_probe should make the person account for something the evidence doesn't prove.
 - A scope_probe tests level: budget, team size, autonomy, blast radius.
 - For each question, cite the evidence refs the person should draw on. Cite nothing when
   they genuinely have no evidence — that is the point of the question.
 - suggested_structure is how to shape the answer, not a scripted answer. Never write the
   answer for them and never invent achievements.
 - risk_note names the trap in the question: what a weak answer would reveal.`,
    input: payload,
    jsonSchema: interviewPrepJsonSchema,
    schema: interviewPrepSchema,
    mock: () => mockInterviewPrep(input.requirements, input.evidence),
    cache: {
      ...ctx,
      fingerprint: fingerprint("interview", input.roleTitle, input.requirements, input.assessments),
    },
  });
}

export function critiqueInterviewAnswer(
  ctx: Ctx,
  input: {
    question: string;
    answer: string;
    evidence: EvidenceDigest[];
  },
): Promise<AIRunResult<AnswerCritiqueResult>> {
  const payload = truncateInput(
    `QUESTION: ${input.question}

THEIR ANSWER:
${input.answer}

EVIDENCE ON FILE:
${input.evidence.map((e) => `- ref=${e.ref}\n${indent(evidenceToText(e))}`).join("\n")}`,
  );

  return runAIService({
    service: "answer_critique",
    schemaName: "answer_critique",
    system: `Critique this interview answer the way an experienced hiring manager would.
Be specific and honest; vague encouragement is useless.
 - unsupported_claims: statements in the answer that the evidence on file does not support.
   This matters more than style.
 - missing_evidence: what the answer needed and did not have (scope, ownership, numbers).
 - improved_outline: a better shape for the answer using only things they actually did.
Never invent achievements or numbers on their behalf.`,
    input: payload,
    jsonSchema: answerCritiqueJsonSchema,
    schema: answerCritiqueSchema,
    mock: () => mockAnswerCritique(input.answer),
    cache: { ...ctx, fingerprint: fingerprint("critique", input.question, input.answer) },
  });
}

// ---------------------------------------------------------------------------
// ApplicationKit — positioning built only from real evidence
// ---------------------------------------------------------------------------

export function generateApplicationKit(
  ctx: Ctx,
  input: {
    roleTitle: string;
    company: string | null;
    seniority: string | null;
    requirements: RequirementDigest[];
    evidence: EvidenceDigest[];
    assessments: Array<{ ref: string; canonicalSkill: string; status: string; reasoning: string }>;
  },
): Promise<AIRunResult<ApplicationKitResult>> {
  const payload = truncateInput(
    `TARGET ROLE: ${input.roleTitle}${input.company ? ` at ${input.company}` : ""}${input.seniority ? ` (${input.seniority})` : ""}

REQUIREMENTS:
${input.requirements.map((r) => `- ref=${r.ref} | ${r.canonicalSkill} | importance=${r.importance}`).join("\n")}

CURRENT ASSESSMENT:
${input.assessments.map((a) => `- ref=${a.ref} | ${a.canonicalSkill} | ${a.status}`).join("\n")}

EVIDENCE:
${input.evidence.map((e) => `- ref=${e.ref}\n${indent(evidenceToText(e))}`).join("\n")}`,
  );

  return runAIService({
    service: "application_kit",
    schemaName: "application_kit",
    system: `Produce application material for this role using ONLY what the evidence supports.
 - Every resume bullet and talking point must cite the evidence refs it came from, and the
   requirement refs it answers. A claim with no evidence ref is a fabrication — omit it.
 - Bullets state what the person did and what changed, with real numbers only when the
   evidence contains them. Never round up, embellish or invent a metric.
 - The cover letter is short (under 250 words), plain, specific, and free of cliché.
 - risks: the requirements this application is weakest on, and how to handle each honestly
   in conversation. Do not suggest hiding or overstating anything.`,
    input: payload,
    jsonSchema: applicationKitJsonSchema,
    schema: applicationKitSchema,
    mock: () => mockApplicationKit(input.roleTitle, input.evidence),
    cache: {
      ...ctx,
      fingerprint: fingerprint("kit", input.roleTitle, input.assessments, input.evidence),
    },
  });
}

// ---------------------------------------------------------------------------

function evidenceToText(e: EvidenceDigest): string {
  const lines = [
    `Title: ${e.title}`,
    e.organisation ? `Organisation: ${e.organisation}` : null,
    e.occurredOn ? `Date: ${e.occurredOn}` : "Date: unknown",
    `Source type: ${e.sourceType}`,
    `Verification: ${e.verificationType}`,
    e.description ? `What happened: ${e.description}` : null,
    e.context ? `Problem/context: ${e.context}` : null,
    e.userRole ? `Their role: ${e.userRole}` : null,
    e.actions ? `What they personally did: ${e.actions}` : null,
    e.outcome ? `Outcome: ${e.outcome}` : "Outcome: not stated",
    e.metrics ? `Metrics: ${e.metrics}` : "Metrics: not stated",
    e.claimedSkills.length ? `Skills they claim this shows: ${e.claimedSkills.join(", ")}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n");
}
