-- JobPilot — Migration initiale
-- Copiez et exécutez dans : Supabase Dashboard → SQL Editor
-- Ou via CLI : supabase db push

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- TRIGGER updated_at (réutilisable)
-- =====================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- USER PROFILES
-- =====================
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  location        TEXT,
  linkedin_url    TEXT,
  portfolio_url   TEXT,
  available_from  DATE,
  salary_expectation INTEGER,
  work_authorization TEXT,
  languages       JSONB DEFAULT '{"en": "fluent"}'::jsonb,
  quick_answers   JSONB DEFAULT '{}'::jsonb,
  resume_json     JSONB DEFAULT '{}'::jsonb,
  skills          JSONB DEFAULT '[]'::jsonb,
  preferred_job_types TEXT[] DEFAULT ARRAY['full-time']::text[],
  remote_preference TEXT DEFAULT 'hybrid',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

-- =====================
-- BASE RESUMES
-- =====================
CREATE TABLE IF NOT EXISTS base_resumes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  content_text  TEXT,
  content_html  TEXT,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE base_resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own resumes" ON base_resumes
  FOR ALL USING (auth.uid() = user_id);

-- =====================
-- JOBS
-- =====================
CREATE TABLE IF NOT EXISTS jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  company           TEXT NOT NULL,
  location          TEXT,
  description_text  TEXT,
  description_html  TEXT,
  url               TEXT UNIQUE NOT NULL,
  url_hash          TEXT UNIQUE NOT NULL,
  source            TEXT NOT NULL,
  posted_at         TIMESTAMPTZ,
  detected_language TEXT DEFAULT 'en',
  salary_range      TEXT,
  skills_required   TEXT[],
  remote            BOOLEAN,
  job_type          TEXT,
  scraped_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_title    ON jobs(title);
CREATE INDEX IF NOT EXISTS idx_jobs_company  ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_source   ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_language ON jobs(detected_language);
CREATE INDEX IF NOT EXISTS idx_jobs_remote   ON jobs(remote);
CREATE INDEX IF NOT EXISTS idx_jobs_type     ON jobs(job_type);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view jobs" ON jobs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can insert jobs" ON jobs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can update jobs" ON jobs
  FOR UPDATE USING (auth.role() = 'service_role');

-- =====================
-- APPLICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS applications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id                UUID REFERENCES jobs(id) ON DELETE SET NULL,
  status                TEXT DEFAULT 'draft',
  kanban_column         TEXT DEFAULT 'saved'
    CHECK (kanban_column IN ('saved','applying','applied','interview','offer','rejected','ghosted')),
  ats_score             JSONB,
  resume_html           TEXT,
  resume_docx_path      TEXT,
  cover_letter_html     TEXT,
  cover_letter_docx_path TEXT,
  template_used         TEXT,
  auto_apply_result     JSONB,
  notes                 TEXT,
  applied_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_applications_user_id      ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id       ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_kanban       ON applications(kanban_column);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own applications" ON applications
  FOR ALL USING (auth.uid() = user_id);

-- =====================
-- APPLICATION EVENTS
-- =====================
CREATE TABLE IF NOT EXISTS application_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id   UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL,
  description      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_events_application_id ON application_events(application_id);

ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own application events" ON application_events
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM applications
      WHERE applications.id = application_events.application_id
    )
  );

-- =====================
-- SCRAPE CONFIGS
-- =====================
CREATE TABLE IF NOT EXISTS scrape_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords    TEXT[] NOT NULL,
  location    TEXT DEFAULT '',
  sources     TEXT[] DEFAULT ARRAY['indeed','linkedin','france-travail']::text[],
  frequency   TEXT DEFAULT 'daily',
  active      BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_scrape_configs_updated_at
  BEFORE UPDATE ON scrape_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_scrape_configs_user_id ON scrape_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_scrape_configs_active  ON scrape_configs(active);

ALTER TABLE scrape_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own scrape configs" ON scrape_configs
  FOR ALL USING (auth.uid() = user_id);

-- =====================
-- TRIGGER AUTO-CRÉATION PROFIL AU SIGNUP
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- STORAGE BUCKET RESUMES
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Users can upload own resumes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY IF NOT EXISTS "Users can read own resumes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================
-- REALTIME
-- =====================
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE applications;
