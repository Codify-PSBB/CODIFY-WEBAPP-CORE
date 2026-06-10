-- 0007_competition_overhaul.sql
-- Adds multi-problem competition state machine.
-- Replaces the binary ON/OFF KV toggle with a richer competition lifecycle.

PRAGMA foreign_keys = ON;

-- Competitions table: tracks each competition run
CREATE TABLE IF NOT EXISTS competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'live', 'ended')),
  created_by TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Links problems to a competition (admins add problems during 'setup' phase)
CREATE TABLE IF NOT EXISTS competition_problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  problem_id INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (competition_id) REFERENCES competitions(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id),
  UNIQUE(competition_id, problem_id)
);

-- Bulk submission group: one row per student per competition submission event
CREATE TABLE IF NOT EXISTS submission_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  competition_id INTEGER NOT NULL,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (competition_id) REFERENCES competitions(id),
  UNIQUE(user_id, competition_id)
);

-- Add competition_id and submission_group_id to individual submissions
ALTER TABLE submissions ADD COLUMN competition_id INTEGER REFERENCES competitions(id);
ALTER TABLE submissions ADD COLUMN submission_group_id INTEGER REFERENCES submission_groups(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_competition_problems_competition_id ON competition_problems(competition_id);
CREATE INDEX IF NOT EXISTS idx_submission_groups_competition_id ON submission_groups(competition_id);
CREATE INDEX IF NOT EXISTS idx_submission_groups_user_id ON submission_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_competition_id ON submissions(competition_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submission_group_id ON submissions(submission_group_id);
