ALTER TABLE public.skill_assessments
  ADD COLUMN IF NOT EXISTS scope_note text,
  ADD COLUMN IF NOT EXISTS autonomy_note text,
  ADD COLUMN IF NOT EXISTS experience_note text,
  ADD COLUMN IF NOT EXISTS user_reasoning text;

CREATE TABLE public.evidence_contradictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_role_id uuid REFERENCES public.target_roles(id) ON DELETE CASCADE,
  summary text NOT NULL,
  detail text,
  severity text NOT NULL DEFAULT 'medium',
  evidence_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  status text NOT NULL DEFAULT 'open',
  user_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_contradictions TO authenticated;
GRANT ALL ON public.evidence_contradictions TO service_role;
ALTER TABLE public.evidence_contradictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contradictions" ON public.evidence_contradictions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_contradictions_updated BEFORE UPDATE ON public.evidence_contradictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_role_id uuid NOT NULL REFERENCES public.target_roles(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.job_requirements(id) ON DELETE SET NULL,
  question text NOT NULL,
  question_type text NOT NULL DEFAULT 'behavioural',
  why_asked text,
  evidence_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  suggested_structure text,
  risk_note text,
  difficulty text NOT NULL DEFAULT 'medium',
  user_answer text,
  answer_feedback jsonb,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_questions TO authenticated;
GRANT ALL ON public.interview_questions TO service_role;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interview questions" ON public.interview_questions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_interview_questions_updated BEFORE UPDATE ON public.interview_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.application_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_role_id uuid NOT NULL REFERENCES public.target_roles(id) ON DELETE CASCADE,
  positioning_summary text NOT NULL,
  resume_bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_letter text,
  talking_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_mock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_kits TO authenticated;
GRANT ALL ON public.application_kits TO service_role;
ALTER TABLE public.application_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own application kits" ON public.application_kits FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_application_kits_updated BEFORE UPDATE ON public.application_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX application_kits_role_idx ON public.application_kits (target_role_id);