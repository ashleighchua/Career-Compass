import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idInput = z.object({ id: z.string().uuid() });

const evidenceInput = z.object({
  title: z.string().trim().min(1, "Give this evidence a title").max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  context: z.string().trim().max(4000).nullable().optional(),
  user_role: z.string().trim().max(2000).nullable().optional(),
  actions: z.string().trim().max(4000).nullable().optional(),
  outcome: z.string().trim().max(4000).nullable().optional(),
  metrics: z.string().trim().max(2000).nullable().optional(),
  occurred_on: z.string().trim().max(20).nullable().optional(),
  organisation: z.string().trim().max(200).nullable().optional(),
  source: z.string().trim().max(500).nullable().optional(),
  source_type: z.string().trim().max(50).optional(),
  verification_type: z.string().trim().max(50).optional(),
  claimed_skills: z.array(z.string().trim().max(80)).max(20).optional(),
  experience_id: z.string().uuid().nullable().optional(),
});

const roleInput = z.object({
  title: z.string().trim().min(1, "Give the role a title").max(200),
  company: z.string().trim().max(200).nullable().optional(),
  source_url: z.string().trim().max(1000).nullable().optional(),
  job_description: z.string().trim().max(40000).nullable().optional(),
});

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.getOverview(context.supabase, context.userId);
  });

export const listEvidence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.listEvidence(context.supabase, context.userId);
  });

export const getEvidence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.getEvidence(context.supabase, context.userId, data.id);
  });

export const createEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => evidenceInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.createEvidence(context.supabase, context.userId, data);
  });

export const updateEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.merge(evidenceInput).parse(input))
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const m = await import("./career.server");
    return m.updateEvidence(context.supabase, context.userId, id, rest);
  });

export const deleteEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.deleteEvidence(context.supabase, context.userId, data.id);
  });

export const analyseEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.analyseEvidence(context.supabase, context.userId, data.id);
  });

export const overrideEvidenceSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["confirmed", "rejected"]),
        relationship_type: z.enum(["direct", "transferable", "indirect", "inferred"]).optional(),
        note: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.overrideEvidenceSkill(context.supabase, context.userId, data);
  });

export const listExperiences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.listExperiences(context.supabase, context.userId);
  });

export const listRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.listRoles(context.supabase, context.userId);
  });

export const getRoleDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.getRoleDetail(context.supabase, context.userId, data.id);
  });

export const createRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => roleInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.createRole(context.supabase, context.userId, data);
  });

export const updateRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.merge(roleInput.partial()).parse(input))
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const m = await import("./career.server");
    return m.updateRole(context.supabase, context.userId, id, rest);
  });

export const deleteRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.deleteRole(context.supabase, context.userId, data.id);
  });

export const setActiveRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.setActiveRole(context.supabase, context.userId, data.id);
  });

export const analyseRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.analyseRole(context.supabase, context.userId, data.id);
  });

export const assessRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.assessRole(context.supabase, context.userId, data.id);
  });

export const overrideAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        user_status: z.enum(["proven", "developing", "evidence_gap", "skill_gap"]).nullable(),
        user_note: z.string().trim().max(1000).nullable().optional(),
        user_reasoning: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.overrideAssessment(context.supabase, context.userId, data);
  });

export const listContradictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.listContradictions(context.supabase, context.userId);
  });

export const updateContradiction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "acknowledged", "resolved", "dismissed"]),
        user_note: z.string().trim().max(1000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.updateContradiction(context.supabase, context.userId, data);
  });

export const listInterviewQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.listInterviewQuestions(context.supabase, context.userId, data.id);
  });

export const generateInterviewSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.generateInterviewSet(context.supabase, context.userId, data.id);
  });

export const saveInterviewAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        answer: z.string().trim().max(6000),
        critique: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.saveInterviewAnswer(context.supabase, context.userId, data);
  });

export const getApplicationKit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.getApplicationKit(context.supabase, context.userId, data.id);
  });

export const generateApplicationMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.generateApplicationMaterial(context.supabase, context.userId, data.id);
  });

export const listActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.listActions(context.supabase, context.userId);
  });

export const updateActionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["recommended", "in_progress", "completed", "dismissed"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.updateActionStatus(context.supabase, context.userId, data);
  });

export const completeActionAsEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ actionId: z.string().uuid(), evidence: evidenceInput }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await import("./career.server");
    return m.completeActionAsEvidence(context.supabase, context.userId, data);
  });

export const listSkillProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.listSkillProfile(context.supabase, context.userId);
  });

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.seedDemoData(context.supabase, context.userId);
  });

export const deleteAllUserData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.deleteAllUserData(context.supabase, context.userId);
  });

export const exportUserData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./career.server");
    return m.exportUserData(context.supabase, context.userId);
  });
