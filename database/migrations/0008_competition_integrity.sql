-- 0008_competition_integrity.sql
-- Keeps competition lifecycle authoritative in D1 and makes XP awards idempotent.

PRAGMA foreign_keys = ON;

-- A reset retires the ended competition without deleting its history.
ALTER TABLE competitions ADD COLUMN reset_at TEXT;

-- This migration is intentionally edited in place before its first production
-- application. Abort rather than guessing if legacy data has multiple active rows.
CREATE TABLE _migration_0008_active_guard (
  active_count INTEGER NOT NULL CHECK (active_count <= 1)
);
INSERT INTO _migration_0008_active_guard (active_count)
SELECT COUNT(*) FROM competitions WHERE status IN ('setup', 'live');
DROP TABLE _migration_0008_active_guard;

-- Retire all history first. Retain the sole setup/live row when one exists.
-- Ended-only databases intentionally have no current competition.
UPDATE competitions
SET reset_at = COALESCE(ended_at, created_at)
WHERE reset_at IS NULL;

UPDATE competitions
SET reset_at = NULL
WHERE status IN ('setup', 'live')
  AND (SELECT COUNT(*) FROM competitions WHERE status IN ('setup', 'live')) = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_competitions_one_current
  ON competitions((1))
  WHERE reset_at IS NULL;

-- One award per student/problem. This is the idempotency record used while reviewing.
CREATE TABLE IF NOT EXISTS xp_awards (
  user_id INTEGER NOT NULL,
  problem_id INTEGER NOT NULL,
  submission_id INTEGER NOT NULL UNIQUE,
  xp_awarded INTEGER NOT NULL CHECK (xp_awarded >= 0),
  awarded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, problem_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id),
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

CREATE INDEX IF NOT EXISTS idx_competitions_current
  ON competitions(reset_at, id DESC);
-- Preserve the old "first approved solution earns XP" rule for existing data.
-- This records historical awards but deliberately does not change current XP.
INSERT OR IGNORE INTO xp_awards (user_id, problem_id, submission_id, xp_awarded, awarded_at)
SELECT s.user_id, s.problem_id, MIN(s.id), p.xp_reward, MIN(s.created_at)
FROM submissions s
JOIN problems p ON p.id = s.problem_id
WHERE s.status = 'approved'
GROUP BY s.user_id, s.problem_id;

CREATE INDEX IF NOT EXISTS idx_xp_awards_submission_id
  ON xp_awards(submission_id);

-- A competition answer must belong to the group created in the same D1 batch.
-- If the competition ends between validation and commit, this aborts and rolls
-- back the whole batch rather than leaving orphaned answers.
CREATE TRIGGER IF NOT EXISTS validate_competition_submission
BEFORE INSERT ON submissions
WHEN NEW.competition_id IS NOT NULL OR NEW.submission_group_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NEW.competition_id IS NULL OR NEW.submission_group_id IS NULL
    THEN RAISE(ABORT, 'competition submission metadata required') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM submission_groups sg
    WHERE sg.id = NEW.submission_group_id
      AND sg.user_id = NEW.user_id
      AND sg.competition_id = NEW.competition_id
  ) THEN RAISE(ABORT, 'competition submission group mismatch') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM competition_problems cp
    WHERE cp.competition_id = NEW.competition_id AND cp.problem_id = NEW.problem_id
  ) THEN RAISE(ABORT, 'problem does not belong to competition') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM competitions c
    WHERE c.id = NEW.competition_id AND c.status = 'live' AND c.reset_at IS NULL
  ) THEN RAISE(ABORT, 'competition is not live') END;
END;

CREATE TRIGGER IF NOT EXISTS protect_competition_submission_identity
BEFORE UPDATE OF user_id, problem_id, competition_id, submission_group_id ON submissions
WHEN OLD.competition_id IS NOT NULL OR OLD.submission_group_id IS NOT NULL
  OR NEW.competition_id IS NOT NULL OR NEW.submission_group_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'competition submission identity is immutable');
END;

-- Commit-time protection for every route or future tool that mutates problems.
CREATE TRIGGER IF NOT EXISTS protect_live_competition_problem_update
BEFORE UPDATE ON problems
WHEN EXISTS (
  SELECT 1 FROM competition_problems cp
  JOIN competitions c ON c.id = cp.competition_id
  WHERE cp.problem_id = OLD.id AND c.status = 'live' AND c.reset_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'cannot modify a live competition problem');
END;

CREATE TRIGGER IF NOT EXISTS protect_live_competition_problem_delete
BEFORE DELETE ON problems
WHEN EXISTS (
  SELECT 1 FROM competition_problems cp
  JOIN competitions c ON c.id = cp.competition_id
  WHERE cp.problem_id = OLD.id AND c.status = 'live' AND c.reset_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'cannot delete a live competition problem');
END;
