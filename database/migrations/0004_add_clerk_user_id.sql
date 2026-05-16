-- 0004_add_clerk_user_id.sql
-- Adds clerk_user_id to users so we can display Clerk full names (not derived placeholders)

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN clerk_user_id TEXT;
