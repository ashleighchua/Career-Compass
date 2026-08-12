import type { SupabaseClient } from "@supabase/supabase-js";

import {
  analyseGaps,
  critiqueInterviewAnswer,
  generateActions,
  generateApplicationKit,
  generateInterviewPrep,
  mapEvidenceToSkills,
  parseJobDescription,
  type EvidenceDigest,
  type RequirementDigest,
} from "./ai/services.server";
import { AIServiceError } from "./ai/provider.server";
import { aliasesFor, canonicalSkillName, skillSlug } from "./ai/skill-normalizer";
import {
  IMPORTANCE_WEIGHT,
  STATUS_COVERAGE,
  type AnswerCritiqueResult,
  type AssessmentStatus,
  type Importance,
} from "./ai/schemas";
import { DEMO_EVIDENCE, DEMO_EXPERIENCES, DEMO_ROLE } from "./demo-data";

type DB = SupabaseClient;

export type EvidenceInput = {
  title: string;
  description?: string | null | undefined;
  context?: string | null | undefined;
  user_role?: string | null | undefined;
  actions?: string | null | undefined;
  outcome?: string | null | undefined;
  metrics?: string | null | undefined;
  occurred_on?: string | null | undefined;
  organisation?: string | null | undefined;
  source?: string | null | undefined;
  source_type?: string | undefined;
  verification_type?: string | undefined;
  claimed_skills?: string[] | undefined;
  experience_id?: string | null | undefined;
};

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function digest(row: Record<string, unknown>): EvidenceDigest {
  return {
    ref: String(row["id"]),
    title: String(row["title"] ?? ""),
    description: (row["description"] as string) ?? null,
    context: (row["context"] as string) ?? null,
    userRole: (row["user_role"] as string) ?? null,
    actions: (row["actions"] as string) ?? null,
    outcome: (row["outcome"] as string) ?? null,
    metrics: (row["metrics"] as string) ?? null,
    occurredOn: (row["occurred_on"] as string) ?? null,
    organisation: (row["organisation"] as string) ?? null,
    sourceType: String(row["source_type"] ?? "other"),
    verificationType: String(row["verification_type"] ?? "self-reported"),
    claimedSkills: (row["claimed_skills"] as string[]) ?? [],
  };
}

/** Finds or creates the canonical skill row for a raw skill name. */
async function upsertSkill(
  db: DB,
  rawName: string,
  category: string | null,
): Promise<{ id: string; canonical_name: string }> {
  const canonical = canonicalSkillName(rawName);
  const slug = skillSlug(rawName);
  const existing = await db
    .from("skills")
    .select("id, canonical_name")
    .eq("slug", slug)
    .maybeSingle();
  if (existing.data) return existing.data;
  const inserted = await db
    .from("skills")
    .insert({ canonical_name: canonical, slug, category, aliases: aliasesFor(canonical) })
    .select("id, canonical_name")
    .maybeSingle();
  if (inserted.data) return inserted.data;
  // Lost a race with another insert of the same slug.
  const retry = await db.from("skills").select("id, canonical_name").eq("slug", slug).maybeSingle();
  if (!retry.data) throw new Error("Could not resolve skill");
  return retry.data;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export async function listEvidence(db: DB, userId: string) {
  const { data, error } = await db
    .from("evidence_items")
    .select("*, experiences(id, title, organisation), evidence_skills(*, skills(*))")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  fail(error);
  return data ?? [];
}

export async function getEvidence(db: DB, userId: string, id: string) {
  const { data, error } = await db
    .from("evidence_items")
    .select("*, experiences(id, title, organisation), evidence_skills(*, skills(*))")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  fail(error);
  return data;
}

export async function createEvidence(db: DB, userId: string, input: EvidenceInput) {
  const { data, error } = await db
    .from("evidence_items")
    .insert({ ...input, user_id: userId })
    .select("id")
    .single();
  fail(error);
  await markRolesStale(db, userId);
  return { id: data!.id as string };
}

export async function updateEvidence(db: DB, userId: string, id: string, input: EvidenceInput) {
  const { error } = await db
    .from("evidence_items")
    .update({ ...input, analysis_status: "stale" })
    .eq("id", id)
    .eq("user_id", userId);
  fail(error);
  await markRolesStale(db, userId);
  return { id };
}

export async function deleteEvidence(db: DB, userId: string, id: string) {
  const { error } = await db.from("evidence_items").delete().eq("id", id).eq("user_id", userId);
  fail(error);
  await markRolesStale(db, userId);
  return { ok: true };
}

/** EvidenceMapper run for one evidence item; preserves user overrides. */
export async function analyseEvidence(db: DB, userId: string, id: string) {
  const row = await getEvidence(db, userId, id);
  if (!row) throw new Error("Evidence not found");

  const { data: result, meta } = await mapEvidenceToSkills(
    { supabase: db, userId },
    digest(row as Record<string, unknown>),
  );

  const existing =
    (row as { evidence_skills?: Array<Record<string, unknown>> }).evidence_skills ?? [];
  const locked = new Set(
    existing.filter((r) => r["user_decision"]).map((r) => String(r["skill_id"])),
  );

  for (const skill of result.skills) {
    const canonical = await upsertSkill(db, skill.canonical_skill, skill.category);
    if (locked.has(canonical.id)) continue;
    const { error } = await db.from("evidence_skills").upsert(
      {
        user_id: userId,
        evidence_id: id,
        skill_id: canonical.id,
        relationship_type: skill.relationship_type,
        strength: skill.strength,
        confidence: skill.confidence,
        reasoning: skill.reasoning,
        source: meta.isMock ? "mock" : "ai",
      },
      { onConflict: "evidence_id,skill_id" },
    );
    fail(error);
  }

  await db
    .from("evidence_items")
    .update({ analysis_status: meta.isMock ? "mock" : "analysed" })
    .eq("id", id)
    .eq("user_id", userId);
  await markRolesStale(db, userId);

  return {
    meta,
    missingDetails: result.missing_details,
    followUpQuestions: result.follow_up_questions,
  };
}

export async function overrideEvidenceSkill(
  db: DB,
  userId: string,
  input: {
    id: string;
    decision: "confirmed" | "rejected";
    relationship_type?: string | undefined;
    note?: string | undefined;
  },
) {
  const { error } = await db
    .from("evidence_skills")
    .update({
      user_decision: input.decision,
      ...(input.relationship_type ? { relationship_type: input.relationship_type } : {}),
      user_note: input.note ?? null,
      overridden_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", userId);
  fail(error);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Experiences
// ---------------------------------------------------------------------------

export async function listExperiences(db: DB, userId: string) {
  const { data, error } = await db
    .from("experiences")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false, nullsFirst: false });
  fail(error);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Target roles
// ---------------------------------------------------------------------------

export async function listRoles(db: DB, userId: string) {
  const { data, error } = await db
    .from("target_roles")
    .select("*, job_requirements(id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  fail(error);
  return data ?? [];
}

export async function createRole(
  db: DB,
  userId: string,
  input: {
    title: string;
    company?: string | null | undefined;
    source_url?: string | null | undefined;
    job_description?: string | null | undefined;
  },
) {
  const existing = await db.from("target_roles").select("id").eq("user_id", userId).limit(1);
  const { data, error } = await db
    .from("target_roles")
    .insert({ ...input, user_id: userId, is_active: (existing.data?.length ?? 0) === 0 })
    .select("id")
    .single();
  fail(error);
  return { id: data!.id as string };
}

export async function updateRole(
  db: DB,
  userId: string,
  id: string,
  input: {
    title?: string | undefined;
    company?: string | null | undefined;
    source_url?: string | null | undefined;
    job_description?: string | null | undefined;
  },
) {
  // The original job description is retained on the row; changing it only marks
  // downstream analysis stale rather than deleting historical assessments.
  const { error } = await db
    .from("target_roles")
    .update({ ...input, analysis_status: "stale", assessment_status: "stale" })
    .eq("id", id)
    .eq("user_id", userId);
  fail(error);
  return { id };
}

export async function deleteRole(db: DB, userId: string, id: string) {
  const { error } = await db.from("target_roles").delete().eq("id", id).eq("user_id", userId);
  fail(error);
  return { ok: true };
}

export async function setActiveRole(db: DB, userId: string, id: string) {
  fail((await db.from("target_roles").update({ is_active: false }).eq("user_id", userId)).error);
  fail(
    (await db.from("target_roles").update({ is_active: true }).eq("id", id).eq("user_id", userId))
      .error,
  );
  return { ok: true };
}

async function markRolesStale(db: DB, userId: string) {
  await db
    .from("target_roles")
    .update({ assessment_status: "stale" })
    .eq("user_id", userId)
    .eq("assessment_status", "complete");
}

export async function getRoleDetail(db: DB, userId: string, id: string) {
  const { data: role, error } = await db
    .from("target_roles")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  fail(error);
  if (!role) return null;

  const [requirements, assessments, actions, evidence, contradictions] = await Promise.all([
    db.from("job_requirements").select("*").eq("target_role_id", id).order("importance"),
    db.from("skill_assessments").select("*").eq("target_role_id", id),
    db
      .from("recommended_actions")
      .select("*")
      .eq("target_role_id", id)
      .order("priority", { ascending: true }),
    db
      .from("evidence_items")
      .select("id, title, occurred_on, organisation, source_type, verification_type")
      .eq("user_id", userId),
    db
      .from("evidence_contradictions")
      .select("*")
      .eq("user_id", userId)
      .eq("target_role_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    role,
    requirements: requirements.data ?? [],
    assessments: assessments.data ?? [],
    actions: actions.data ?? [],
    evidenceIndex: evidence.data ?? [],
    contradictions: contradictions.data ?? [],
    coverage: computeCoverage(requirements.data ?? [], assessments.data ?? []),
    coverageBreakdown: coverageBreakdown(
      (requirements.data ?? []) as Array<{
        id: string;
        canonical_skill: string;
        importance: string;
      }>,
      (assessments.data ?? []) as Array<{
        requirement_id: string;
        status: string;
        user_status: string | null;
      }>,
    ),
  };
}

export function computeCoverage(
  requirements: Array<{ id: string; importance: string }>,
  assessments: Array<{ requirement_id: string; status: string; user_status: string | null }>,
): { percent: number | null; totalWeight: number; coveredWeight: number } {
  const byReq = new Map(assessments.map((a) => [a.requirement_id, a]));
  let total = 0;
  let covered = 0;
  for (const req of requirements) {
    const weight = IMPORTANCE_WEIGHT[req.importance as Importance] ?? 1;
    total += weight;
    const assessment = byReq.get(req.id);
    if (!assessment) continue;
    const status = (assessment.user_status ?? assessment.status) as AssessmentStatus;
    covered += weight * (STATUS_COVERAGE[status] ?? 0);
  }
  return {
    percent: total ? Math.round((covered / total) * 100) : null,
    totalWeight: total,
    coveredWeight: Math.round(covered * 10) / 10,
  };
}

/**
 * Per-requirement contribution to the coverage number, so the percentage can be
 * opened up and audited line by line rather than taken on trust.
 */
export function coverageBreakdown(
  requirements: Array<{ id: string; canonical_skill: string; importance: string }>,
  assessments: Array<{ requirement_id: string; status: string; user_status: string | null }>,
) {
  const byReq = new Map(assessments.map((a) => [a.requirement_id, a]));
  return requirements
    .map((req) => {
      const weight = IMPORTANCE_WEIGHT[req.importance as Importance] ?? 1;
      const assessment = byReq.get(req.id);
      const status = (assessment?.user_status ??
        assessment?.status ??
        "skill_gap") as AssessmentStatus;
      const share = STATUS_COVERAGE[status] ?? 0;
      return {
        requirementId: req.id,
        label: req.canonical_skill,
        importance: req.importance,
        status,
        overridden: Boolean(assessment?.user_status),
        weight,
        contribution: Math.round(weight * share * 100) / 100,
      };
    })
    .sort((a, b) => b.weight - a.weight || b.contribution - a.contribution);
}

/**
 * Conflicting evidence is recorded, never silently resolved. Contradictions the
 * user has already acknowledged or dismissed survive re-analysis.
 */
async function recordContradictions(
  db: DB,
  userId: string,
  roleId: string,
  found: Array<{ summary: string; detail: string; severity: string; evidence_refs: string[] }>,
  validEvidenceIds: Set<string>,
) {
  const { data: existing } = await db
    .from("evidence_contradictions")
    .select("id, summary, status")
    .eq("user_id", userId)
    .eq("target_role_id", roleId);
  const handled = new Map(
    (existing ?? [])
      .filter((c) => c.status !== "open")
      .map((c) => [normaliseSummary(c.summary as string), c]),
  );

  await db
    .from("evidence_contradictions")
    .delete()
    .eq("user_id", userId)
    .eq("target_role_id", roleId)
    .eq("status", "open");

  for (const item of found) {
    if (handled.has(normaliseSummary(item.summary))) continue;
    await db.from("evidence_contradictions").insert({
      user_id: userId,
      target_role_id: roleId,
      summary: item.summary,
      detail: item.detail,
      severity: item.severity,
      evidence_ids: item.evidence_refs.filter((r) => validEvidenceIds.has(r)),
    });
  }
}

function normaliseSummary(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function updateContradiction(
  db: DB,
  userId: string,
  input: { id: string; status: string; user_note?: string | null | undefined },
) {
  const { error } = await db
    .from("evidence_contradictions")
    .update({ status: input.status, user_note: input.user_note ?? null })
    .eq("id", input.id)
    .eq("user_id", userId);
  fail(error);
  return { ok: true };
}

export async function listContradictions(db: DB, userId: string) {
  const { data, error } = await db
    .from("evidence_contradictions")
    .select("*, target_roles(id, title)")
    .eq("user_id", userId)
    .order("status")
    .order("created_at", { ascending: false });
  fail(error);
  return data ?? [];
}

/** JobParser run: job description -> requirements. */
export async function analyseRole(db: DB, userId: string, id: string) {
  const { data: role } = await db
    .from("target_roles")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!role) throw new Error("Target role not found");
  if (!role.job_description || role.job_description.trim().length < 40) {
    throw new AIServiceError(
      "job description too short",
      "Add a fuller job description (at least a few sentences) before analysing.",
    );
  }

  const { data: parsed, meta } = await parseJobDescription(
    { supabase: db, userId },
    { title: role.title as string, jobDescription: role.job_description as string },
  );

  // Re-analysis replaces requirements for this role; assessments cascade with them.
  fail((await db.from("job_requirements").delete().eq("target_role_id", id)).error);

  for (const req of parsed.requirements) {
    const skill = await upsertSkill(db, req.canonical_skill, null);
    fail(
      (
        await db.from("job_requirements").insert({
          user_id: userId,
          target_role_id: id,
          skill_id: skill.id,
          canonical_skill: skill.canonical_name,
          original_wording: req.original_wording,
          importance: req.importance,
          requirement_type: req.requirement_type,
          seniority_level: req.seniority_level,
          reasoning: req.reasoning,
        })
      ).error,
    );
  }

  fail(
    (
      await db
        .from("target_roles")
        .update({
          analysis_status: meta.isMock ? "mock" : "complete",
          assessment_status: "pending",
          seniority: parsed.seniority ?? role.seniority,
          analysed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
    ).error,
  );

  return { meta, requirementCount: parsed.requirements.length };
}

/** GapAnalyzer + ActionGenerator run for a role. Honours user overrides. */
export async function assessRole(db: DB, userId: string, id: string) {
  const { data: role } = await db
    .from("target_roles")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!role) throw new Error("Target role not found");

  const [{ data: requirements }, { data: evidenceRows }] = await Promise.all([
    db.from("job_requirements").select("*").eq("target_role_id", id),
    db.from("evidence_items").select("*").eq("user_id", userId),
  ]);

  if (!requirements?.length) {
    throw new AIServiceError("no requirements", "Analyse the job description first.");
  }
  if (!evidenceRows?.length) {
    throw new AIServiceError(
      "no evidence",
      "Add at least one piece of evidence before assessing this role.",
    );
  }

  const reqDigests: RequirementDigest[] = requirements.map((r) => ({
    ref: r.id as string,
    canonicalSkill: r.canonical_skill as string,
    originalWording: (r.original_wording as string) ?? null,
    importance: r.importance as string,
    requirementType: r.requirement_type as string,
    seniorityLevel: (r.seniority_level as string) ?? null,
  }));
  const evidenceDigests = evidenceRows.map((e) => digest(e as Record<string, unknown>));
  const evidenceIds = new Set(evidenceDigests.map((e) => e.ref));

  const { data: analysis, meta } = await analyseGaps(
    { supabase: db, userId },
    {
      roleTitle: role.title as string,
      seniority: (role.seniority as string) ?? null,
      requirements: reqDigests,
      evidence: evidenceDigests,
    },
  );

  const { data: existing } = await db
    .from("skill_assessments")
    .select("requirement_id, user_status, user_note, user_reasoning, overridden_at")
    .eq("target_role_id", id);
  const overrides = new Map((existing ?? []).map((a) => [a.requirement_id as string, a]));
  const validRequirementIds = new Set(reqDigests.map((r) => r.ref));

  for (const item of analysis.assessments) {
    if (!validRequirementIds.has(item.requirement_ref)) continue;
    const prior = overrides.get(item.requirement_ref);
    fail(
      (
        await db.from("skill_assessments").upsert(
          {
            user_id: userId,
            target_role_id: id,
            requirement_id: item.requirement_ref,
            status: item.status,
            confidence: item.confidence,
            strength: item.strength,
            // Only cite evidence that actually belongs to this user.
            supporting_evidence_ids: item.supporting_evidence_refs.filter((r) =>
              evidenceIds.has(r),
            ),
            reasoning: item.reasoning,
            missing_evidence: item.missing_evidence,
            next_step: item.next_step,
            seniority_note: item.seniority_note,
            recency_note: item.recency_note,
            scope_note: item.scope_note,
            autonomy_note: item.autonomy_note,
            experience_note: item.experience_note,
            // A user override survives every future re-analysis.
            user_status: prior?.user_status ?? null,
            user_note: prior?.user_note ?? null,
            user_reasoning: prior?.user_reasoning ?? null,
            overridden_at: prior?.overridden_at ?? null,
          },
          { onConflict: "requirement_id" },
        )
      ).error,
    );
  }

  // Recommendations from the gaps that remain after overrides.
  const { data: freshAssessments } = await db
    .from("skill_assessments")
    .select("*")
    .eq("target_role_id", id);
  const reqById = new Map(requirements.map((r) => [r.id as string, r]));
  const gaps = (freshAssessments ?? [])
    .filter((a) => (a.user_status ?? a.status) !== "proven")
    .map((a) => {
      const req = reqById.get(a.requirement_id as string);
      return {
        ref: a.requirement_id as string,
        canonicalSkill: (req?.canonical_skill as string) ?? "Unknown",
        importance: (req?.importance as string) ?? "important",
        status: (a.user_status ?? a.status) as string,
        reasoning: (a.reasoning as string) ?? "",
        missingEvidence: (a.missing_evidence as string) ?? null,
      };
    })
    .sort(
      (a, b) =>
        (IMPORTANCE_WEIGHT[b.importance as Importance] ?? 1) -
        (IMPORTANCE_WEIGHT[a.importance as Importance] ?? 1),
    )
    .slice(0, 12);

  if (gaps.length) {
    const { data: generated } = await generateActions(
      { supabase: db, userId },
      { roleTitle: role.title as string, gaps },
    );
    // Keep actions the user has already started or completed.
    fail(
      (
        await db
          .from("recommended_actions")
          .delete()
          .eq("target_role_id", id)
          .eq("status", "recommended")
      ).error,
    );
    let priority = 0;
    for (const action of generated.actions) {
      fail(
        (
          await db.from("recommended_actions").insert({
            user_id: userId,
            target_role_id: id,
            gap_label: action.gap_label,
            classification: action.classification,
            why_it_matters: action.why_it_matters,
            current_evidence: action.current_evidence,
            action: action.action,
            proves: action.proves,
            deliverable: action.deliverable,
            effort: action.effort,
            evidence_value: action.evidence_value,
            priority: priority++,
            requirement_ids: action.requirement_refs.filter((r) => validRequirementIds.has(r)),
          })
        ).error,
      );
    }
  }

  await recordContradictions(db, userId, id, analysis.contradictions, evidenceIds);

  const coverage = computeCoverage(
    requirements as Array<{ id: string; importance: string }>,
    (freshAssessments ?? []) as Array<{
      requirement_id: string;
      status: string;
      user_status: string | null;
    }>,
  );

  fail(
    (
      await db
        .from("target_roles")
        .update({
          assessment_status: meta.isMock ? "mock" : "complete",
          coverage: coverage.percent,
          analysed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
    ).error,
  );

  return { meta, coverage, contradictions: analysis.contradictions };
}

export async function overrideAssessment(
  db: DB,
  userId: string,
  input: {
    id: string;
    user_status: string | null;
    user_note?: string | null | undefined;
    user_reasoning?: string | null | undefined;
  },
) {
  const touched = Boolean(input.user_status || input.user_note || input.user_reasoning);
  const { data, error } = await db
    .from("skill_assessments")
    .update({
      user_status: input.user_status,
      user_note: input.user_note ?? null,
      user_reasoning: input.user_reasoning ?? null,
      overridden_at: touched ? new Date().toISOString() : null,
    })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("target_role_id")
    .maybeSingle();
  fail(error);
  if (data?.target_role_id) await refreshCoverage(db, userId, data.target_role_id as string);
  return { ok: true };
}

async function refreshCoverage(db: DB, userId: string, roleId: string) {
  const [{ data: requirements }, { data: assessments }] = await Promise.all([
    db.from("job_requirements").select("id, importance").eq("target_role_id", roleId),
    db
      .from("skill_assessments")
      .select("requirement_id, status, user_status")
      .eq("target_role_id", roleId),
  ]);
  const coverage = computeCoverage(
    (requirements ?? []) as Array<{ id: string; importance: string }>,
    (assessments ?? []) as Array<{
      requirement_id: string;
      status: string;
      user_status: string | null;
    }>,
  );
  await db
    .from("target_roles")
    .update({ coverage: coverage.percent })
    .eq("id", roleId)
    .eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Actions / completion loop
// ---------------------------------------------------------------------------

export async function listActions(db: DB, userId: string) {
  const { data, error } = await db
    .from("recommended_actions")
    .select("*, target_roles(id, title)")
    .eq("user_id", userId)
    .order("status")
    .order("priority");
  fail(error);
  return data ?? [];
}

export async function updateActionStatus(
  db: DB,
  userId: string,
  input: { id: string; status: string },
) {
  const { error } = await db
    .from("recommended_actions")
    .update({ status: input.status })
    .eq("id", input.id)
    .eq("user_id", userId);
  fail(error);
  return { ok: true };
}

/** Completed action -> new evidence item -> stale analysis, ready to reassess. */
export async function completeActionAsEvidence(
  db: DB,
  userId: string,
  input: { actionId: string; evidence: EvidenceInput },
) {
  const { data: action } = await db
    .from("recommended_actions")
    .select("*")
    .eq("id", input.actionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!action) throw new Error("Action not found");

  const created = await createEvidence(db, userId, {
    ...input.evidence,
    source_type: input.evidence.source_type ?? "personal project",
    claimed_skills: input.evidence.claimed_skills?.length
      ? input.evidence.claimed_skills
      : ((action.proves as string[]) ?? []),
  });

  fail(
    (
      await db
        .from("recommended_actions")
        .update({ status: "completed", completed_evidence_id: created.id })
        .eq("id", input.actionId)
        .eq("user_id", userId)
    ).error,
  );

  return { evidenceId: created.id, targetRoleId: action.target_role_id as string };
}

// ---------------------------------------------------------------------------
// Skills view
// ---------------------------------------------------------------------------

export async function listSkillProfile(db: DB, userId: string) {
  const [{ data: links }, { data: activeRole }] = await Promise.all([
    db
      .from("evidence_skills")
      .select("*, skills(*), evidence_items(id, title, occurred_on, outcome, metrics)")
      .eq("user_id", userId),
    db
      .from("target_roles")
      .select("id, title")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  let requirementSkills: string[] = [];
  if (activeRole) {
    const { data } = await db
      .from("job_requirements")
      .select("canonical_skill")
      .eq("target_role_id", activeRole.id);
    requirementSkills = (data ?? []).map((r) => r.canonical_skill as string);
  }

  const grouped = new Map<
    string,
    {
      skillId: string;
      name: string;
      category: string | null;
      relevantToTarget: boolean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      links: Array<Record<string, any>>;
    }
  >();
  for (const link of links ?? []) {
    if (link.user_decision === "rejected") continue;
    const skill = link.skills as { id: string; canonical_name: string; category: string | null };
    if (!skill) continue;
    const entry = grouped.get(skill.id) ?? {
      skillId: skill.id,
      name: skill.canonical_name,
      category: skill.category,
      relevantToTarget: requirementSkills.includes(skill.canonical_name),
      links: [],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entry.links.push(link as Record<string, any>);
    grouped.set(skill.id, entry);
  }

  return {
    activeRole: activeRole ?? null,
    skills: [...grouped.values()]
      .map((s) => {
        const strengths = s.links.map((l) => Number(l["strength"] ?? 0));
        return {
          ...s,
          evidenceCount: s.links.length,
          bestStrength: strengths.length ? Math.max(...strengths) : 0,
          bestConfidence:
            s.links.find((l) => l["confidence"] === "high")?.["confidence"] ??
            s.links.find((l) => l["confidence"] === "medium")?.["confidence"] ??
            "low",
        };
      })
      .sort((a, b) => b.bestStrength - a.bestStrength || b.evidenceCount - a.evidenceCount),
  };
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function getOverview(db: DB, userId: string) {
  const { data: activeRole } = await db
    .from("target_roles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  const [{ count: evidenceCount }, { count: roleCount }] = await Promise.all([
    db.from("evidence_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("target_roles").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  if (!activeRole) {
    return {
      activeRole: null,
      evidenceCount: evidenceCount ?? 0,
      roleCount: roleCount ?? 0,
      requirements: [],
      assessments: [],
      actions: [],
      coverage: { percent: null, totalWeight: 0, coveredWeight: 0 },
    };
  }

  const [{ data: requirements }, { data: assessments }, { data: actions }] = await Promise.all([
    db.from("job_requirements").select("*").eq("target_role_id", activeRole.id),
    db.from("skill_assessments").select("*").eq("target_role_id", activeRole.id),
    db
      .from("recommended_actions")
      .select("*")
      .eq("target_role_id", activeRole.id)
      .order("priority")
      .limit(5),
  ]);

  return {
    activeRole,
    evidenceCount: evidenceCount ?? 0,
    roleCount: roleCount ?? 0,
    requirements: requirements ?? [],
    assessments: assessments ?? [],
    actions: actions ?? [],
    coverage: computeCoverage(
      (requirements ?? []) as Array<{ id: string; importance: string }>,
      (assessments ?? []) as Array<{
        requirement_id: string;
        status: string;
        user_status: string | null;
      }>,
    ),
  };
}

// ---------------------------------------------------------------------------
// Demo data + data controls
// ---------------------------------------------------------------------------

export async function seedDemoData(db: DB, userId: string) {
  const experienceIds: Record<string, string> = {};
  for (const exp of DEMO_EXPERIENCES) {
    const { data, error } = await db
      .from("experiences")
      .insert({ ...exp.row, user_id: userId })
      .select("id")
      .single();
    fail(error);
    experienceIds[exp.key] = data!.id as string;
  }

  const evidenceIds: string[] = [];
  for (const item of DEMO_EVIDENCE) {
    const experienceId = item.experienceKey ? experienceIds[item.experienceKey] : null;
    const { data, error } = await db
      .from("evidence_items")
      .insert({
        ...item.row,
        experience_id: experienceId ?? null,
        user_id: userId,
      })
      .select("id")
      .single();
    fail(error);
    evidenceIds.push(data!.id as string);
  }

  await db.from("target_roles").update({ is_active: false }).eq("user_id", userId);
  const { data: role, error } = await db
    .from("target_roles")
    .insert({ ...DEMO_ROLE, user_id: userId, is_active: true })
    .select("id")
    .single();
  fail(error);
  const targetRoleId = role!.id as string;

  // Run the full loop so the demo profile lands on a real assessment rather than
  // an unassessed role (which reads as 100% skill gap / 0% coverage).
  for (const evidenceId of evidenceIds) {
    try {
      await analyseEvidence(db, userId, evidenceId);
    } catch {
      // Evidence mapping is best-effort during seeding.
    }
  }
  try {
    await analyseRole(db, userId, targetRoleId);
    await assessRole(db, userId, targetRoleId);
  } catch {
    // Leave the role pending; the user can run "Reassess" manually.
  }

  return { targetRoleId };
}

export async function deleteAllUserData(db: DB, userId: string) {
  for (const table of [
    "ai_analyses",
    "application_kits",
    "interview_questions",
    "evidence_contradictions",
    "recommended_actions",
    "skill_assessments",
    "job_requirements",
    "target_roles",
    "evidence_skills",
    "evidence_items",
    "experiences",
  ]) {
    fail((await db.from(table).delete().eq("user_id", userId)).error);
  }
  return { ok: true };
}

export async function exportUserData(db: DB, userId: string) {
  const [evidence, experiences, roles, requirements, assessments, actions, skills] =
    await Promise.all([
      db.from("evidence_items").select("*").eq("user_id", userId),
      db.from("experiences").select("*").eq("user_id", userId),
      db.from("target_roles").select("*").eq("user_id", userId),
      db.from("job_requirements").select("*").eq("user_id", userId),
      db.from("skill_assessments").select("*").eq("user_id", userId),
      db.from("recommended_actions").select("*").eq("user_id", userId),
      db.from("evidence_skills").select("*, skills(canonical_name)").eq("user_id", userId),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    evidence: evidence.data ?? [],
    experiences: experiences.data ?? [],
    targetRoles: roles.data ?? [],
    requirements: requirements.data ?? [],
    assessments: assessments.data ?? [],
    actions: actions.data ?? [],
    evidenceSkills: skills.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// Interview mode
// ---------------------------------------------------------------------------

async function roleContext(db: DB, userId: string, roleId: string) {
  const { data: role } = await db
    .from("target_roles")
    .select("*")
    .eq("id", roleId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!role) throw new Error("Target role not found");

  const [{ data: requirements }, { data: evidenceRows }, { data: assessments }] = await Promise.all(
    [
      db.from("job_requirements").select("*").eq("target_role_id", roleId),
      db.from("evidence_items").select("*").eq("user_id", userId),
      db.from("skill_assessments").select("*").eq("target_role_id", roleId),
    ],
  );

  if (!requirements?.length) {
    throw new AIServiceError("no requirements", "Analyse the job description for this role first.");
  }
  if (!evidenceRows?.length) {
    throw new AIServiceError("no evidence", "Add some evidence before preparing for interviews.");
  }

  const reqDigests: RequirementDigest[] = requirements.map((r) => ({
    ref: r.id as string,
    canonicalSkill: r.canonical_skill as string,
    originalWording: (r.original_wording as string) ?? null,
    importance: r.importance as string,
    requirementType: r.requirement_type as string,
    seniorityLevel: (r.seniority_level as string) ?? null,
  }));
  const reqById = new Map(requirements.map((r) => [r.id as string, r]));
  const assessmentDigests = (assessments ?? []).map((a) => ({
    ref: a.requirement_id as string,
    canonicalSkill:
      (reqById.get(a.requirement_id as string)?.canonical_skill as string) ?? "Unknown",
    status: (a.user_status ?? a.status) as string,
    reasoning: (a.user_reasoning as string) ?? (a.reasoning as string) ?? "",
  }));

  return {
    role,
    requirements,
    reqDigests,
    assessmentDigests,
    evidenceDigests: evidenceRows.map((e) => digest(e as Record<string, unknown>)),
    validRequirementIds: new Set(reqDigests.map((r) => r.ref)),
    evidenceIds: new Set(evidenceRows.map((e) => e.id as string)),
  };
}

export async function listInterviewQuestions(db: DB, userId: string, roleId: string) {
  const { data, error } = await db
    .from("interview_questions")
    .select("*")
    .eq("user_id", userId)
    .eq("target_role_id", roleId)
    .order("created_at");
  fail(error);
  return data ?? [];
}

/** InterviewPrep run. Questions the user has answered are kept. */
export async function generateInterviewSet(db: DB, userId: string, roleId: string) {
  const ctx = await roleContext(db, userId, roleId);

  const { data: result, meta } = await generateInterviewPrep(
    { supabase: db, userId },
    {
      roleTitle: ctx.role.title as string,
      seniority: (ctx.role.seniority as string) ?? null,
      requirements: ctx.reqDigests,
      evidence: ctx.evidenceDigests,
      assessments: ctx.assessmentDigests,
    },
  );

  fail(
    (
      await db
        .from("interview_questions")
        .delete()
        .eq("user_id", userId)
        .eq("target_role_id", roleId)
        .is("user_answer", null)
    ).error,
  );

  for (const q of result.questions) {
    fail(
      (
        await db.from("interview_questions").insert({
          user_id: userId,
          target_role_id: roleId,
          requirement_id:
            q.requirement_ref && ctx.validRequirementIds.has(q.requirement_ref)
              ? q.requirement_ref
              : null,
          question: q.question,
          question_type: q.question_type,
          difficulty: q.difficulty,
          why_asked: q.why_asked,
          evidence_ids: q.evidence_refs.filter((r) => ctx.evidenceIds.has(r)),
          suggested_structure: q.suggested_structure,
          risk_note: q.risk_note,
        })
      ).error,
    );
  }

  return { meta, count: result.questions.length };
}

export async function saveInterviewAnswer(
  db: DB,
  userId: string,
  input: { id: string; answer: string; critique: boolean },
) {
  const { data: question } = await db
    .from("interview_questions")
    .select("*")
    .eq("id", input.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!question) throw new Error("Question not found");

  let feedback: AnswerCritiqueResult | null = null;
  let isMock = false;
  if (input.critique && input.answer.trim().length > 20) {
    const ids = (question.evidence_ids as string[]) ?? [];
    const { data: evidenceRows } = await db
      .from("evidence_items")
      .select("*")
      .eq("user_id", userId)
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const { data: critique, meta } = await critiqueInterviewAnswer(
      { supabase: db, userId },
      {
        question: question.question as string,
        answer: input.answer,
        evidence: (evidenceRows ?? []).map((e) => digest(e as Record<string, unknown>)),
      },
    );
    feedback = critique;
    isMock = meta.isMock;
  }

  fail(
    (
      await db
        .from("interview_questions")
        .update({
          user_answer: input.answer,
          answered_at: new Date().toISOString(),
          ...(feedback ? { answer_feedback: { ...feedback, is_mock: isMock } } : {}),
        })
        .eq("id", input.id)
        .eq("user_id", userId)
    ).error,
  );

  return { feedback, isMock };
}

// ---------------------------------------------------------------------------
// Application prep
// ---------------------------------------------------------------------------

export async function getApplicationKit(db: DB, userId: string, roleId: string) {
  const { data, error } = await db
    .from("application_kits")
    .select("*")
    .eq("user_id", userId)
    .eq("target_role_id", roleId)
    .maybeSingle();
  fail(error);
  return data;
}

export async function generateApplicationMaterial(db: DB, userId: string, roleId: string) {
  const ctx = await roleContext(db, userId, roleId);

  const { data: result, meta } = await generateApplicationKit(
    { supabase: db, userId },
    {
      roleTitle: ctx.role.title as string,
      company: (ctx.role.company as string) ?? null,
      seniority: (ctx.role.seniority as string) ?? null,
      requirements: ctx.reqDigests,
      evidence: ctx.evidenceDigests,
      assessments: ctx.assessmentDigests,
    },
  );

  const clean = <T extends { evidence_refs: string[] }>(rows: T[]) =>
    rows.map((r) => ({
      ...r,
      evidence_refs: r.evidence_refs.filter((x) => ctx.evidenceIds.has(x)),
    }));

  const { error } = await db.from("application_kits").upsert(
    {
      user_id: userId,
      target_role_id: roleId,
      positioning_summary: result.positioning_summary,
      resume_bullets: clean(result.resume_bullets),
      cover_letter: result.cover_letter,
      talking_points: clean(result.talking_points),
      risks: result.risks,
      is_mock: meta.isMock,
    },
    { onConflict: "target_role_id" },
  );
  fail(error);

  return { meta };
}
