-- Migration: Add application_package column
-- Date: 2026-05-04
-- Version: 005

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS application_package JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS package_generated_at TIMESTAMPTZ DEFAULT NULL;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_package_generated 
ON applications(package_generated_at) 
WHERE package_generated_at IS NOT NULL;

COMMENT ON COLUMN applications.application_package IS 'JSONB containing cover_letter, elevator_pitch, answers, keywords_to_mention, red_flags, application_tips';
COMMENT ON COLUMN applications.package_generated_at IS 'Timestamp when package was generated';