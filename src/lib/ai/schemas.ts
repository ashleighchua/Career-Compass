import { z } from "zod";

/**
 * Shared vocabulary for the whole product. These strings are persisted, so
 * changing them is a data migration, not a rename.
 */
export const IMPORTANCE = ["critical", "important", "useful"] as const;
export const CONFIDENCE = ["high", "medium", "low"] as const;
export const RELATIONSHIP = ["direct", "transferable", "indirect", "inferred"] as const;
export const ASSESSMENT_STATUS = ["proven", "developing", "evidence_gap", "skill_gap"] as const;
export const REQUIREMENT_TYPE = [
  "responsibility",
  "required_skill",
  "preferred_skill",
  "experience",
  "domain_knowledge",
  "seniority_signal",
] as const;

export type Importance = (typeof IMPORTANCE)[number];
export type Confidence = (typeof CONFIDENCE)[number];
export type RelationshipType = (typeof RELATIONSHIP)[number];
export type AssessmentStatus = (typeof ASSESSMENT_STATUS)[number];
export type RequirementType = (typeof REQUIREMENT_TYPE)[number];

export const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  critical: 3,
  important: 2,
  useful: 1,
};

/** Fraction of a requirement's weight each status counts as covered. */
export const STATUS_COVERAGE: Record<AssessmentStatus, number> = {
  proven: 1,
  developing: 0.5,
  evidence_gap: 0.25,
  skill_gap: 0,
};

export const STATUS_LABEL: Record<AssessmentStatus, string> = {
  proven: "Proven",
  developing: "Developing",
  evidence_gap: "Evidence gap",
  skill_gap: "Skill gap",
};

// ---------------------------------------------------------------------------
// JobParser
// ---------------------------------------------------------------------------

export const jobParserSchema = z.object({
  title: z.string().nullable(),
  seniority: z.string().nullable(),
  requirements: z.array(
    z.object({
      canonical_skill: z.string(),
      original_wording: z.string().nullable(),
      importance: z.enum(IMPORTANCE),
      requirement_type: z.enum(REQUIREMENT_TYPE),
      seniority_level: z.string().nullable(),
      reasoning: z.string(),
    }),
  ),
});
export type JobParserResult = z.infer<typeof jobParserSchema>;

export const jobParserJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "seniority", "requirements"],
  properties: {
    title: { type: ["string", "null"] },
    seniority: { type: ["string", "null"] },
    requirements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "canonical_skill",
          "original_wording",
          "importance",
          "requirement_type",
          "seniority_level",
          "reasoning",
        ],
        properties: {
          canonical_skill: { type: "string" },
          original_wording: { type: ["string", "null"] },
          importance: { type: "string", enum: [...IMPORTANCE] },
          requirement_type: { type: "string", enum: [...REQUIREMENT_TYPE] },
          seniority_level: { type: ["string", "null"] },
          reasoning: { type: "string" },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// EvidenceMapper
// ---------------------------------------------------------------------------

export const evidenceMapperSchema = z.object({
  skills: z.array(
    z.object({
      canonical_skill: z.string(),
      category: z.string().nullable(),
      relationship_type: z.enum(RELATIONSHIP),
      strength: z.number().min(0).max(1),
      confidence: z.enum(CONFIDENCE),
      reasoning: z.string(),
    }),
  ),
  missing_details: z.array(z.string()),
  follow_up_questions: z.array(z.string()),
});
export type EvidenceMapperResult = z.infer<typeof evidenceMapperSchema>;

export const evidenceMapperJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["skills", "missing_details", "follow_up_questions"],
  properties: {
    skills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "canonical_skill",
          "category",
          "relationship_type",
          "strength",
          "confidence",
          "reasoning",
        ],
        properties: {
          canonical_skill: { type: "string" },
          category: { type: ["string", "null"] },
          relationship_type: { type: "string", enum: [...RELATIONSHIP] },
          strength: { type: "number" },
          confidence: { type: "string", enum: [...CONFIDENCE] },
          reasoning: { type: "string" },
        },
      },
    },
    missing_details: { type: "array", items: { type: "string" } },
    follow_up_questions: { type: "array", items: { type: "string" } },
  },
} as const;

// ---------------------------------------------------------------------------
// GapAnalyzer
// ---------------------------------------------------------------------------

export const SEVERITY = ["high", "medium", "low"] as const;
export type Severity = (typeof SEVERITY)[number];

export const gapAnalyzerSchema = z.object({
  assessments: z.array(
    z.object({
      requirement_ref: z.string(),
      status: z.enum(ASSESSMENT_STATUS),
      confidence: z.enum(CONFIDENCE),
      strength: z.number().min(0).max(1),
      supporting_evidence_refs: z.array(z.string()),
      reasoning: z.string(),
      missing_evidence: z.string().nullable(),
      next_step: z.string().nullable(),
      seniority_note: z.string().nullable(),
      recency_note: z.string().nullable(),
      scope_note: z.string().nullable(),
      autonomy_note: z.string().nullable(),
      experience_note: z.string().nullable(),
    }),
  ),
  contradictions: z.array(
    z.object({
      summary: z.string(),
      detail: z.string(),
      severity: z.enum(SEVERITY),
      evidence_refs: z.array(z.string()),
    }),
  ),
});
export type GapAnalyzerResult = z.infer<typeof gapAnalyzerSchema>;

export const gapAnalyzerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["assessments", "contradictions"],
  properties: {
    assessments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "requirement_ref",
          "status",
          "confidence",
          "strength",
          "supporting_evidence_refs",
          "reasoning",
          "missing_evidence",
          "next_step",
          "seniority_note",
          "recency_note",
          "scope_note",
          "autonomy_note",
          "experience_note",
        ],
        properties: {
          requirement_ref: { type: "string" },
          status: { type: "string", enum: [...ASSESSMENT_STATUS] },
          confidence: { type: "string", enum: [...CONFIDENCE] },
          strength: { type: "number" },
          supporting_evidence_refs: { type: "array", items: { type: "string" } },
          reasoning: { type: "string" },
          missing_evidence: { type: ["string", "null"] },
          next_step: { type: ["string", "null"] },
          seniority_note: { type: ["string", "null"] },
          recency_note: { type: ["string", "null"] },
          scope_note: { type: ["string", "null"] },
          autonomy_note: { type: ["string", "null"] },
          experience_note: { type: ["string", "null"] },
        },
      },
    },
    contradictions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "detail", "severity", "evidence_refs"],
        properties: {
          summary: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: [...SEVERITY] },
          evidence_refs: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// ActionGenerator
// ---------------------------------------------------------------------------

export const actionGeneratorSchema = z.object({
  actions: z.array(
    z.object({
      gap_label: z.string(),
      classification: z.enum(ASSESSMENT_STATUS),
      why_it_matters: z.string(),
      current_evidence: z.string(),
      action: z.string(),
      proves: z.array(z.string()),
      deliverable: z.string(),
      effort: z.string(),
      evidence_value: z.enum(["high", "medium", "low"]),
      requirement_refs: z.array(z.string()),
    }),
  ),
});
export type ActionGeneratorResult = z.infer<typeof actionGeneratorSchema>;

export const actionGeneratorJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["actions"],
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "gap_label",
          "classification",
          "why_it_matters",
          "current_evidence",
          "action",
          "proves",
          "deliverable",
          "effort",
          "evidence_value",
          "requirement_refs",
        ],
        properties: {
          gap_label: { type: "string" },
          classification: { type: "string", enum: [...ASSESSMENT_STATUS] },
          why_it_matters: { type: "string" },
          current_evidence: { type: "string" },
          action: { type: "string" },
          proves: { type: "array", items: { type: "string" } },
          deliverable: { type: "string" },
          effort: { type: "string" },
          evidence_value: { type: "string", enum: ["high", "medium", "low"] },
          requirement_refs: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// InterviewPrep — questions a hiring panel would actually ask
// ---------------------------------------------------------------------------

export const QUESTION_TYPE = [
  "behavioural",
  "technical",
  "scope_probe",
  "gap_probe",
  "motivation",
] as const;
export type QuestionType = (typeof QUESTION_TYPE)[number];

export const interviewPrepSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      question_type: z.enum(QUESTION_TYPE),
      difficulty: z.enum(["hard", "medium", "easy"]),
      why_asked: z.string(),
      requirement_ref: z.string().nullable(),
      evidence_refs: z.array(z.string()),
      suggested_structure: z.string(),
      risk_note: z.string().nullable(),
    }),
  ),
});
export type InterviewPrepResult = z.infer<typeof interviewPrepSchema>;

export const interviewPrepJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "question",
          "question_type",
          "difficulty",
          "why_asked",
          "requirement_ref",
          "evidence_refs",
          "suggested_structure",
          "risk_note",
        ],
        properties: {
          question: { type: "string" },
          question_type: { type: "string", enum: [...QUESTION_TYPE] },
          difficulty: { type: "string", enum: ["hard", "medium", "easy"] },
          why_asked: { type: "string" },
          requirement_ref: { type: ["string", "null"] },
          evidence_refs: { type: "array", items: { type: "string" } },
          suggested_structure: { type: "string" },
          risk_note: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// AnswerCritique — feedback on a practised answer
// ---------------------------------------------------------------------------

export const answerCritiqueSchema = z.object({
  verdict: z.enum(["strong", "workable", "weak"]),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  unsupported_claims: z.array(z.string()),
  missing_evidence: z.array(z.string()),
  improved_outline: z.string(),
});
export type AnswerCritiqueResult = z.infer<typeof answerCritiqueSchema>;

export const answerCritiqueJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "verdict",
    "strengths",
    "weaknesses",
    "unsupported_claims",
    "missing_evidence",
    "improved_outline",
  ],
  properties: {
    verdict: { type: "string", enum: ["strong", "workable", "weak"] },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    unsupported_claims: { type: "array", items: { type: "string" } },
    missing_evidence: { type: "array", items: { type: "string" } },
    improved_outline: { type: "string" },
  },
} as const;

// ---------------------------------------------------------------------------
// ApplicationKit — positioning built only from real evidence
// ---------------------------------------------------------------------------

export const applicationKitSchema = z.object({
  positioning_summary: z.string(),
  resume_bullets: z.array(
    z.object({
      bullet: z.string(),
      evidence_refs: z.array(z.string()),
      requirement_refs: z.array(z.string()),
    }),
  ),
  cover_letter: z.string(),
  talking_points: z.array(
    z.object({
      point: z.string(),
      evidence_refs: z.array(z.string()),
    }),
  ),
  risks: z.array(
    z.object({
      risk: z.string(),
      how_to_handle: z.string(),
    }),
  ),
});
export type ApplicationKitResult = z.infer<typeof applicationKitSchema>;

export const applicationKitJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["positioning_summary", "resume_bullets", "cover_letter", "talking_points", "risks"],
  properties: {
    positioning_summary: { type: "string" },
    resume_bullets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["bullet", "evidence_refs", "requirement_refs"],
        properties: {
          bullet: { type: "string" },
          evidence_refs: { type: "array", items: { type: "string" } },
          requirement_refs: { type: "array", items: { type: "string" } },
        },
      },
    },
    cover_letter: { type: "string" },
    talking_points: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["point", "evidence_refs"],
        properties: {
          point: { type: "string" },
          evidence_refs: { type: "array", items: { type: "string" } },
        },
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["risk", "how_to_handle"],
        properties: {
          risk: { type: "string" },
          how_to_handle: { type: "string" },
        },
      },
    },
  },
} as const;
