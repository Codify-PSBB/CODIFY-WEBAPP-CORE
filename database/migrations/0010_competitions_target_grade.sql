-- 0010_competitions_target_grade.sql
-- Audience segregation for grade 9 / grade 10 competitions.
--   target_grade = NULL → open to both grades
--   target_grade = 9    → Grade 9 students only
--   target_grade = 10   → Grade 10 students only
-- Values are enforced at the API layer (mirrors users.grade policy).

PRAGMA foreign_keys = ON;

ALTER TABLE competitions ADD COLUMN target_grade INTEGER;