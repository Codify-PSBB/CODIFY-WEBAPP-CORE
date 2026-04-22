-- 0003_public_testcases.sql
-- Adds structured public testcases for problems and removes old sample fields

PRAGMA foreign_keys = ON;

-- Add structured public testcases
ALTER TABLE problems ADD COLUMN public_testcase_1_input TEXT;
ALTER TABLE problems ADD COLUMN public_testcase_1_output TEXT;
ALTER TABLE problems ADD COLUMN public_testcase_2_input TEXT;
ALTER TABLE problems ADD COLUMN public_testcase_2_output TEXT;
ALTER TABLE problems ADD COLUMN public_testcase_3_input TEXT;
ALTER TABLE problems ADD COLUMN public_testcase_3_output TEXT;

-- Remove old sample fields (will be done in a later migration after data migration)
-- ALTER TABLE problems DROP COLUMN sample_input;
-- ALTER TABLE problems DROP COLUMN sample_output;
