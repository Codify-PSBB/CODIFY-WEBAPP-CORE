-- Add password_hash for custom member authentication
ALTER TABLE users ADD COLUMN password_hash TEXT;