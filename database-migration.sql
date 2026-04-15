-- Database Migration - Competition Entry System & Multiple Test Cases
-- Date: April 15, 2024

-- Add time_limit_minutes column to problems table
ALTER TABLE problems ADD COLUMN time_limit_minutes INTEGER DEFAULT 10;

-- Create test_cases table for multiple test cases per problem
CREATE TABLE IF NOT EXISTS test_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_id INTEGER NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  is_sample INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_cases_problem_id ON test_cases(problem_id);

-- Create competition_entries table for tracking timed competition sessions
CREATE TABLE IF NOT EXISTS competition_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  problem_id INTEGER NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  time_limit_minutes INTEGER NOT NULL DEFAULT 10,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'expired'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

-- Create indexes for competition entries
CREATE INDEX IF NOT EXISTS idx_competition_entries_user_id ON competition_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_problem_id ON competition_entries(problem_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_status ON competition_entries(status);

-- Update existing problems to have a default time limit
UPDATE problems SET time_limit_minutes = 10 WHERE time_limit_minutes IS NULL;
