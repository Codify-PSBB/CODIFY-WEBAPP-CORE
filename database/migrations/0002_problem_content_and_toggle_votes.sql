-- 0002_problem_content_and_toggle_votes.sql
-- Adds richer problem content fields and OFF vote tracking for app toggle.

PRAGMA foreign_keys = ON;

ALTER TABLE problems ADD COLUMN sample_input TEXT;
ALTER TABLE problems ADD COLUMN sample_output TEXT;
ALTER TABLE problems ADD COLUMN testcases TEXT;

CREATE TABLE IF NOT EXISTS app_toggle_off_votes (
  admin_email TEXT PRIMARY KEY,
  voted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_toggle_off_votes_voted_at ON app_toggle_off_votes(voted_at DESC);
