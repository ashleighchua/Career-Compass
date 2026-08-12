# Career Evidence Engine — MVP build plan

## What we're building

A product that turns your career history into **evidence**, maps it against a **target role**, and tells you the difference between a _skill gap_ (you can't do it yet) and an _evidence gap_ (you probably can, but can't prove it) — then recommends the highest-leverage thing to build next.

Core loop: **Assess → Recommend → Build → Capture → Reassess**

## Scope for this build (the core loop, done well)

1. **Landing page** — hero, three feature blocks, CTAs.
2. **Accounts** — email/password + Google sign-in, each user's career data fully isolated.
3. **Evidence** — add/edit/delete evidence items (what happened, your role, outcome, metrics, date, source, verification type), grouped optionally under an Experience.
4. **Target roles** — paste a job description, save multiple roles, set one active.
5. **Job analysis** — AI extracts structured requirements: canonical skill, original wording, importance (Critical/Important/Useful), type, seniority, reasoning.
6. **Evidence mapping** — AI maps evidence → normalised skills with relationship type (direct / transferable / indirect / inferred), strength, confidence, reasoning.
7. **Gap analysis** — each requirement classified **Proven / Developing / Evidence Gap / Skill Gap** with confidence, supporting evidence IDs, reasoning, missing evidence.
8. **Evidence coverage %** — weighted by requirement importance, always labelled "evidence coverage", never "% qualified", always inspectable.
9. **Recommended actions** — ranked, each tied to a specific gap, with what it would prove, deliverable, effort, evidence value.
10. **Completion loop** — action: Recommended → In Progress → Completed → prompts a capture form → creates a new evidence item → re-run analysis and see coverage move.
11. **Provenance & overrides** — every AI conclusion shows its supporting evidence and reasoning in a drawer; user can confirm/reject/change any assessment, and overrides survive future re-analyses.
12. **Demo data** — one-click "Maya Chen" consulting→AI PM profile with realistic proven/developing/evidence-gap/skill-gap spread.

Pages: Dashboard, Evidence, Skills, Target Roles, Projects (actions). Each with real empty states.

## Deferred (secondary — after core loop is solid)

Interview mode, application prep, PDF/DOCX upload, CV paste import. I'll add Interview mode last if the core loop is verified working.

## Technical approach

- **Stack**: existing TanStack Start + React 19 + Tailwind v4 + shadcn. No framework changes.
- **Backend**: Lovable Cloud (Postgres + auth). Relational schema — `profiles`, `experiences`, `evidence_items`, `skills`, `evidence_skills`, `target_roles`, `job_requirements`, `skill_assessments`, `recommended_actions`, `ai_analyses`, `user_overrides`. RLS on every table scoped to `auth.uid()`, plus explicit grants. No giant JSON blob.
- **AI layer**: separate typed services — `JobParser`, `EvidenceExtractor`, `SkillNormalizer`, `EvidenceMapper`, `RequirementMatcher`, `GapAnalyzer`, `ActionGenerator` — each with a Zod-validated structured JSON schema, one retry, explicit error handling. Called only from server functions; keys never reach the browser.
- **Provider abstraction**: `AIProvider` interface with a live provider and a labelled `MockAIProvider` fallback so the app runs without a key — mock results are visibly badged as demo output.
- **Integrity rules baked into every prompt**: never invent employers, dates, metrics or outcomes; return null for unknowns; label inferences; prefer "insufficient evidence" over confident guesses.
- **Cost control**: analyses cached per role/evidence hash, marked stale on change, re-run only what changed — never on page refresh.
- **Design**: calm editorial system — restrained palette, strong type hierarchy, generous whitespace, dense but clear. No gradients, sparkles, or corporate blue. Reusable components: EvidenceCard, RequirementCard, GapCard, ActionCard, StatusBadge, ConfidenceBadge, EvidenceStrength, AIReasoningPanel, EmptyState/Loading/Error.
- **Verification**: typecheck, lint, production build, plus a browser pass through the full journey (sign up → evidence → target role → analyse → gaps → action → complete → new evidence → coverage changes) and a two-user isolation check.

## Notes

- Enabling Lovable Cloud gives the database, auth, and server-side AI in one step — no external accounts needed.
- I'll build in phases and verify the core loop end-to-end before adding secondary features.
