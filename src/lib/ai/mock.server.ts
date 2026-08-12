import type {
  ActionGeneratorResult,
  AnswerCritiqueResult,
  ApplicationKitResult,
  EvidenceMapperResult,
  GapAnalyzerResult,
  InterviewPrepResult,
  JobParserResult,
} from "./schemas";

import { canonicalSkillName } from "./skill-normalizer";

/**
 * MockAIProvider output. Used only when no AI key is configured. Results are
 * heuristic and always surfaced in the UI as demo output — never as live AI.
 */

export type EvidenceDigest = {
  ref: string;
  title: string;
  description: string | null;
  context: string | null;
  userRole: string | null;
  actions: string | null;
  outcome: string | null;
  metrics: string | null;
  occurredOn: string | null;
  organisation: string | null;
  sourceType: string;
  verificationType: string;
  claimedSkills: string[];
};

export type RequirementDigest = {
  ref: string;
  canonicalSkill: string;
  originalWording: string | null;
  importance: string;
  requirementType: string;
  seniorityLevel: string | null;
};

const DEMO_NOTE = "Demo analysis (no AI provider configured).";

export function mockJobParse(title: string): JobParserResult {
  const base = [
    ["Product Strategy", "critical", "required_skill"],
    ["Stakeholder Management", "critical", "responsibility"],
    ["Product Analytics", "critical", "required_skill"],
    ["Product Experimentation", "important", "responsibility"],
    ["User Research", "important", "required_skill"],
    ["AI Product Development", "critical", "domain_knowledge"],
    ["SQL", "important", "required_skill"],
    ["Prioritisation", "important", "responsibility"],
    ["Business Case Development", "useful", "preferred_skill"],
    ["Communication", "useful", "required_skill"],
  ] as const;
  return {
    title,
    seniority: null,
    requirements: base.map(([skill, importance, type]) => ({
      canonical_skill: skill,
      original_wording: null,
      importance,
      requirement_type: type,
      seniority_level: null,
      reasoning: DEMO_NOTE,
    })),
  };
}

export function mockEvidenceMap(evidence: EvidenceDigest): EvidenceMapperResult {
  const text =
    `${evidence.title} ${evidence.description ?? ""} ${evidence.actions ?? ""} ${evidence.outcome ?? ""}`.toLowerCase();
  const keywords: Array<[string, string]> = [
    ["stakeholder", "Stakeholder Management"],
    ["client", "Stakeholder Management"],
    ["analysis", "Business Analysis"],
    ["requirement", "Business Analysis"],
    ["led", "Project Leadership"],
    ["project", "Project Leadership"],
    ["experiment", "Product Experimentation"],
    ["a/b", "Product Experimentation"],
    ["sql", "SQL"],
    ["data", "Product Analytics"],
    ["ai", "AI Product Development"],
    ["prototype", "AI Product Development"],
    ["roadmap", "Product Strategy"],
    ["user", "User Research"],
    ["interview", "User Research"],
  ];
  const found = new Set<string>();
  for (const [needle, skill] of keywords) if (text.includes(needle)) found.add(skill);
  for (const claimed of evidence.claimedSkills) found.add(canonicalSkillName(claimed));
  if (found.size === 0) found.add("Communication");

  const quantified = Boolean(evidence.metrics);
  const hasOutcome = Boolean(evidence.outcome);

  return {
    skills: [...found].slice(0, 8).map((skill) => ({
      canonical_skill: skill,
      category: null,
      relationship_type: evidence.claimedSkills.includes(skill) ? "direct" : "inferred",
      strength: Math.min(0.8, 0.25 + (hasOutcome ? 0.2 : 0) + (quantified ? 0.2 : 0)),
      confidence: quantified ? "medium" : "low",
      reasoning: `${DEMO_NOTE} Keyword-based match, not a semantic judgement.`,
    })),
    missing_details: [
      hasOutcome ? null : "What changed as a result of this work?",
      quantified ? null : "Can the result be quantified?",
      evidence.userRole ? null : "What did you personally decide or own?",
    ].filter((x): x is string => Boolean(x)),
    follow_up_questions: hasOutcome ? [] : ["What measurable result came from this work?"],
  };
}

export function mockGapAnalysis(
  requirements: RequirementDigest[],
  evidence: EvidenceDigest[],
): GapAnalyzerResult {
  return {
    assessments: requirements.map((req) => {
      const matches = evidence.filter((e) =>
        `${e.title} ${e.description ?? ""} ${e.claimedSkills.join(" ")}`
          .toLowerCase()
          .includes(req.canonicalSkill.split(" ")[0]!.toLowerCase()),
      );
      const strong = matches.filter((m) => m.metrics && m.outcome);
      const status = strong.length
        ? "proven"
        : matches.length > 1
          ? "developing"
          : matches.length === 1
            ? "evidence_gap"
            : "skill_gap";
      return {
        requirement_ref: req.ref,
        status,
        confidence: "low" as const,
        strength: strong.length ? 0.8 : matches.length ? 0.4 : 0,
        supporting_evidence_refs: matches.map((m) => m.ref),
        reasoning: `${DEMO_NOTE} Based on a simple keyword overlap between this requirement and your evidence.`,
        missing_evidence: matches.length ? "More specific outcome and scope detail." : null,
        next_step: null,
        seniority_note: null,
        recency_note: null,
        scope_note: null,
        autonomy_note: null,
        experience_note: null,
      };
    }),
    contradictions: [],
  };
}

export function mockInterviewPrep(
  requirements: RequirementDigest[],
  evidence: EvidenceDigest[],
): InterviewPrepResult {
  return {
    questions: requirements.slice(0, 6).map((req, i) => ({
      question: `Tell me about a time you were responsible for ${req.canonicalSkill.toLowerCase()}. What was the scope, and what did you personally decide?`,
      question_type: (i % 3 === 0 ? "scope_probe" : i % 3 === 1 ? "behavioural" : "gap_probe") as
        "scope_probe" | "behavioural" | "gap_probe",
      difficulty: (req.importance === "critical" ? "hard" : "medium") as "hard" | "medium",
      why_asked: `${DEMO_NOTE} This requirement is marked ${req.importance} for the role.`,
      requirement_ref: req.ref,
      evidence_refs: evidence.slice(0, 1).map((e) => e.ref),
      suggested_structure:
        "Context and scale → the decision you owned → what you did → measurable outcome → what you'd change.",
      risk_note: null,
    })),
  };
}

export function mockAnswerCritique(answer: string): AnswerCritiqueResult {
  const hasNumbers = /\d/.test(answer);
  return {
    verdict: hasNumbers ? "workable" : "weak",
    strengths: hasNumbers ? ["Includes at least one concrete number."] : [],
    weaknesses: [`${DEMO_NOTE} No semantic judgement was made about this answer.`],
    unsupported_claims: [],
    missing_evidence: hasNumbers ? [] : ["A measurable outcome."],
    improved_outline:
      "Open with the scale of the problem, name the decision you owned, then close on the measured result.",
  };
}

export function mockApplicationKit(
  roleTitle: string,
  evidence: EvidenceDigest[],
): ApplicationKitResult {
  return {
    positioning_summary: `${DEMO_NOTE} Positioning for ${roleTitle} drawn from ${evidence.length} evidence item(s).`,
    resume_bullets: evidence.slice(0, 4).map((e) => ({
      bullet: `${e.title}${e.metrics ? ` — ${e.metrics}` : ""}`,
      evidence_refs: [e.ref],
      requirement_refs: [],
    })),
    cover_letter: `${DEMO_NOTE} Connect a live AI provider to generate a tailored letter from your evidence.`,
    talking_points: evidence.slice(0, 3).map((e) => ({
      point: e.outcome ?? e.title,
      evidence_refs: [e.ref],
    })),
    risks: [
      {
        risk: "Some claims are not yet backed by documented outcomes.",
        how_to_handle:
          "Lead with the evidence you can show, and be direct about what's in progress.",
      },
    ],
  };
}

export function mockActions(
  gaps: Array<{ ref: string; canonicalSkill: string; importance: string; status: string }>,
): ActionGeneratorResult {
  return {
    actions: gaps.slice(0, 3).map((gap) => ({
      gap_label: gap.canonicalSkill,
      classification: (gap.status === "skill_gap" ? "skill_gap" : "evidence_gap") as
        "skill_gap" | "evidence_gap",
      why_it_matters: `${DEMO_NOTE} This requirement is marked ${gap.importance} for the role.`,
      current_evidence: "Limited.",
      action: `Produce one documented piece of work that demonstrates ${gap.canonicalSkill}.`,
      proves: [gap.canonicalSkill],
      deliverable: "A short case study covering context, your decisions, the result and metrics.",
      effort: "1-2 weeks",
      evidence_value: "high" as const,
      requirement_refs: [gap.ref],
    })),
  };
}
