CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  headline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- skills (shared library, no personal data)
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills readable" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "skills insertable" ON public.skills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "skills updatable" ON public.skills FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_skills_updated BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- experiences
CREATE TABLE public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organisation TEXT,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  description TEXT,
  industry TEXT,
  seniority TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_experiences_user ON public.experiences(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiences TO authenticated;
GRANT ALL ON public.experiences TO service_role;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own experiences" ON public.experiences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_experiences_updated BEFORE UPDATE ON public.experiences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- evidence items
CREATE TABLE public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  experience_id UUID REFERENCES public.experiences(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  context TEXT,
  user_role TEXT,
  actions TEXT,
  outcome TEXT,
  metrics TEXT,
  occurred_on DATE,
  organisation TEXT,
  source TEXT,
  source_type TEXT NOT NULL DEFAULT 'other',
  verification_type TEXT NOT NULL DEFAULT 'self-reported',
  claimed_skills TEXT[] NOT NULL DEFAULT '{}',
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evidence_user ON public.evidence_items(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_items TO authenticated;
GRANT ALL ON public.evidence_items TO service_role;
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own evidence" ON public.evidence_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_evidence_updated BEFORE UPDATE ON public.evidence_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- evidence -> skill mapping
CREATE TABLE public.evidence_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  evidence_id UUID NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'direct',
  strength NUMERIC NOT NULL DEFAULT 0,
  confidence TEXT NOT NULL DEFAULT 'medium',
  reasoning TEXT,
  source TEXT NOT NULL DEFAULT 'ai',
  user_decision TEXT,
  user_note TEXT,
  overridden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evidence_id, skill_id)
);
CREATE INDEX idx_evidence_skills_user ON public.evidence_skills(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_skills TO authenticated;
GRANT ALL ON public.evidence_skills TO service_role;
ALTER TABLE public.evidence_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own evidence skills" ON public.evidence_skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_evidence_skills_updated BEFORE UPDATE ON public.evidence_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- target roles
CREATE TABLE public.target_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  company TEXT,
  source_url TEXT,
  job_description TEXT,
  seniority TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  assessment_status TEXT NOT NULL DEFAULT 'pending',
  coverage NUMERIC,
  analysed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_target_roles_user ON public.target_roles(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.target_roles TO authenticated;
GRANT ALL ON public.target_roles TO service_role;
ALTER TABLE public.target_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own target roles" ON public.target_roles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_target_roles_updated BEFORE UPDATE ON public.target_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- job requirements
CREATE TABLE public.job_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_role_id UUID NOT NULL REFERENCES public.target_roles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  canonical_skill TEXT NOT NULL,
  original_wording TEXT,
  importance TEXT NOT NULL DEFAULT 'important',
  requirement_type TEXT NOT NULL DEFAULT 'required_skill',
  seniority_level TEXT,
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_requirements_role ON public.job_requirements(target_role_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_requirements TO authenticated;
GRANT ALL ON public.job_requirements TO service_role;
ALTER TABLE public.job_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requirements" ON public.job_requirements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_job_requirements_updated BEFORE UPDATE ON public.job_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- skill assessments
CREATE TABLE public.skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_role_id UUID NOT NULL REFERENCES public.target_roles(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.job_requirements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'skill_gap',
  confidence TEXT NOT NULL DEFAULT 'medium',
  strength NUMERIC NOT NULL DEFAULT 0,
  supporting_evidence_ids UUID[] NOT NULL DEFAULT '{}',
  reasoning TEXT,
  missing_evidence TEXT,
  next_step TEXT,
  seniority_note TEXT,
  recency_note TEXT,
  user_status TEXT,
  user_note TEXT,
  overridden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requirement_id)
);
CREATE INDEX idx_assessments_role ON public.skill_assessments(target_role_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_assessments TO authenticated;
GRANT ALL ON public.skill_assessments TO service_role;
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assessments" ON public.skill_assessments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_assessments_updated BEFORE UPDATE ON public.skill_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- recommended actions
CREATE TABLE public.recommended_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_role_id UUID NOT NULL REFERENCES public.target_roles(id) ON DELETE CASCADE,
  gap_label TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'evidence_gap',
  why_it_matters TEXT,
  current_evidence TEXT,
  action TEXT NOT NULL,
  proves TEXT[] NOT NULL DEFAULT '{}',
  deliverable TEXT,
  effort TEXT,
  evidence_value TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  requirement_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'recommended',
  completed_evidence_id UUID REFERENCES public.evidence_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_actions_role ON public.recommended_actions(target_role_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommended_actions TO authenticated;
GRANT ALL ON public.recommended_actions TO service_role;
ALTER TABLE public.recommended_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own actions" ON public.recommended_actions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_actions_updated BEFORE UPDATE ON public.recommended_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai analysis cache / observability
CREATE TABLE public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'lovable-ai',
  is_mock BOOLEAN NOT NULL DEFAULT false,
  latency_ms INTEGER,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, service, fingerprint)
);
CREATE INDEX idx_ai_analyses_user ON public.ai_analyses(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analyses TO authenticated;
GRANT ALL ON public.ai_analyses TO service_role;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analyses" ON public.ai_analyses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);