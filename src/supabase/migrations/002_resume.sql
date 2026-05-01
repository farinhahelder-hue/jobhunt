-- Resume JSON and Scrape Configs Schema
-- Run this in your Supabase SQL Editor

-- =====================
-- ADD RESUME_JSON TO USER_PROFILES
-- =====================
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS resume_json JSONB DEFAULT '{}'::jsonb;

-- =====================
-- SCRAPE CONFIGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS scrape_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL,
  location TEXT DEFAULT '',
  sources TEXT[] DEFAULT ARRAY['indeed', 'linkedin', 'france-travail']::text[],
  frequency TEXT DEFAULT 'daily',
  active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scrape_configs_user_id ON scrape_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_scrape_configs_active ON scrape_configs(active);

-- Enable RLS
ALTER TABLE scrape_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scrape_configs
CREATE POLICY "Users can CRUD own scrape configs" ON scrape_configs
  FOR ALL USING (auth.uid() = user_id);

-- =====================
-- UPDATE TRIGGER FOR SCRAPE CONFIGS
-- =====================
CREATE OR REPLACE FUNCTION public.update_scrape_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_scrape_configs_timestamp
  BEFORE UPDATE ON scrape_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_scrape_configs_timestamp();

-- =====================
-- ADDITIONAL COLUMNS FOR USER_PROFILES (OPTIONAL)
-- =====================
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS preferred_job_types TEXT[] DEFAULT ARRAY['full-time']::text[],
ADD COLUMN IF NOT EXISTS remote_preference TEXT DEFAULT 'hybrid';