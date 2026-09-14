-- 0008_users_grade_index.sql
-- Index grade for grade-wise leaderboards (grades 9 and 10).
-- Grade values are enforced at the API layer (9 or 10 only).

PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_users_grade ON users(grade);
