-- JobPilot Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- USER PROFILES TABLE
-- =====================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  available_from DATE,
  salary_expectation INTEGER,
  work_authorization TEXT,
  languages JSONB DEFAULT '{"en": "fluent"}'::jsonb,
  quick_answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- BASE RESUMES TABLE
-- =====================
CREATE TABLE base_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_text TEXT,
  content_html TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- JOBS TABLE
-- =====================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description_text TEXT,
  description_html TEXT,
  url TEXT UNIQUE NOT NULL,
  url_hash TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  detected_language TEXT DEFAULT 'en',
  salary_range TEXT,
  skills_required TEXT[],
  remote BOOLEAN,
  job_type TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on jobs for faster searches
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_detected_language ON jobs(detected_language);
CREATE INDEX idx_jobs_remote ON jobs(remote);
CREATE INDEX idx_jobs_job_type ON jobs(job_type);

-- =====================
-- APPLICATIONS TABLE
-- =====================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',
  kanban_column TEXT DEFAULT 'saved' CHECK (kanban_column IN ('saved', 'applying', 'applied', 'interview', 'offer', 'rejected', 'ghosted')),
  ats_score JSONB,
  resume_html TEXT,
  resume_docx_path TEXT,
  cover_letter_html TEXT,
  cover_letter_docx_path TEXT,
  template_used TEXT,
  auto_apply_result JSONB,
  notes TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on applications
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_kanban_column ON applications(kanban_column);

-- =====================
-- APPLICATION EVENTS TABLE
-- =====================
CREATE TABLE application_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on application events
CREATE INDEX idx_application_events_application_id ON application_events(application_id);

-- =====================
-- ROW LEVEL SECURITY POLICIES
-- =====================

-- User profiles RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Base resumes RLS
ALTER TABLE base_resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own resumes" ON base_resumes
  FOR ALL USING (auth.uid() = user_id);

-- Jobs RLS - jobs are viewable by all authenticated users
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view jobs" ON jobs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can insert jobs" ON jobs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can update jobs" ON jobs
  FOR UPDATE USING (auth.role() = 'service_role');

-- Applications RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own applications" ON applications
  FOR ALL USING (auth.uid() = user_id);

-- Application events RLS
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own application events" ON application_events
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM applications 
      WHERE applications.id = application_events.application_id
    )
  );

-- =====================
-- TRIGGER FOR AUTO-CREATING USER PROFILES
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- STORAGE BUCKET FOR RESUMES
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for user resumes
CREATE POLICY "Users can upload own resumes" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid() = bucket_id::uuid OR auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- Realtime subscriptions
-- =====================
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE applications;