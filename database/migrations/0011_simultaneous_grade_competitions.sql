-- 0011_simultaneous_grade_competitions.sql
-- Allow simultaneous active competitions for Grade 9 and Grade 10.
-- Replaces single global active competition constraint with a per-grade active constraint.

PRAGMA foreign_keys = ON;

-- Drop the old single active competition unique index
DROP INDEX IF EXISTS idx_competitions_one_current;

-- Create unique index that permits at most ONE active (reset_at IS NULL) competition per target grade slot.
-- COALESCE(target_grade, 0):
--   0 = All grades (combined)
--   9 = Grade 9
--  10 = Grade 10
-- This permits Grade 9 and Grade 10 competitions to be active simultaneously!
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitions_active_by_grade
  ON competitions(COALESCE(target_grade, 0))
  WHERE reset_at IS NULL;
