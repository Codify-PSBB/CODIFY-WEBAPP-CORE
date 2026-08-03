-- 0008_competition_integrity.sql
-- Keeps competition lifecycle authoritative in D1 and makes XP awards idempotent.

PRAGMA foreign_keys = ON;

-- A reset retires the ended competition without deleting its history.
ALTER TABLE competitions ADD COLUMN reset_at TEXT;

-- Older releases kept reset state in KV. Retire every historical row except the
-- newest so exactly one D1 row can represent the current lifecycle.
UPDATE competitions
SET reset_at = COALESCE(ended_at, created_at)
WHERE id <> (SELECT MAX(id) FROM competitions);

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
CREATE TRIGGER IF NOT EXISTS require_competition_submission_group
BEFORE INSERT ON submissions
WHEN NEW.competition_id IS NOT NULL AND NEW.submission_group_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'competition submission group required');
END;
