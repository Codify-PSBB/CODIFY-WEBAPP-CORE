# Database Migration - Competition Entry System & Multiple Test Cases

## Date: April 15, 2024

This migration adds support for:
1. Competition entry system with timer
2. Multiple test cases per problem
3. Time limits for competitions

## SQL Migration Script

```sql
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
```

## API Endpoints Added

### Competition Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/competition/status` | Check if user has active competition entry |
| POST | `/api/competition/enter` | Enter a competition (starts timer) |
| POST | `/api/competition/run` | Run code against test cases |
| POST | `/api/competition/submit` | Submit competition solution |

### Updated Admin Endpoints

| Method | Endpoint | Changes |
|--------|----------|---------|
| POST | `/api/admin/problems` | Now accepts `time_limit_minutes` and `test_cases` array |

## Request/Response Examples

### Enter Competition

**Request:**
```json
{
  "problem_id": 1,
  "time_limit_minutes": 10
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "entry": {
      "id": 1,
      "user_id": 123,
      "problem_id": 1,
      "start_time": "2024-04-15T10:00:00Z",
      "end_time": null,
      "time_limit_minutes": 10,
      "status": "active",
      "remaining_seconds": 600
    },
    "problem": {
      "id": 1,
      "title": "Palindrome Number",
      "description": "...",
      "test_cases": [
        {
          "id": 1,
          "input": "121",
          "output": "true",
          "is_sample": true
        },
        {
          "id": 2,
          "input": "123",
          "output": "false",
          "is_sample": false
        }
      ]
    }
  }
}
```

### Create Problem with Test Cases (Admin)

**Request:**
```json
{
  "title": "Two Sum",
  "description": "Given an array of integers...",
  "xp_reward": 50,
  "active": true,
  "time_limit_minutes": 15,
  "sample_input": "[2,7,11,15]\n9",
  "sample_output": "[0,1]",
  "test_cases": [
    {
      "input": "[2,7,11,15]\n9",
      "output": "[0,1]",
      "is_sample": true
    },
    {
      "input": "[3,2,4]\n6",
      "output": "[1,2]",
      "is_sample": true
    },
    {
      "input": "[3,3]\n6",
      "output": "[0,1]",
      "is_sample": false
    }
  ]
}
```

## Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/competition` | `CompetitionEntryPage` | Entry page showing active competitions |
| `/competition/arena` | `CompetitionArenaPage` | LeetCode-style coding arena with timer |

## Features Implemented

### 1. Competition Entry System
- Users must "enter" a competition to start the timer
- Timer counts down in real-time
- Once time expires, submissions are rejected
- Users can only have one active competition at a time

### 2. LeetCode-Style Competition Page
- Split-pane layout: Problem on left, code editor on right
- Visible countdown timer
- Test case tabs (sample vs hidden)
- "Run Code" button to test against sample cases
- "Submit" button for final submission
- Real-time test case results display

### 3. Admin Multiple Test Cases
- Add/remove test cases dynamically in admin panel
- Mark test cases as "sample" (visible to users) or "hidden"
- Set time limit per problem (1-180 minutes)
- All test cases validated on submission

## Deployment Notes

1. Run the SQL migration script on your database
2. Deploy the updated worker with new handlers
3. Deploy the updated frontend with new pages
4. Existing problems will have a default 10-minute time limit
5. Existing submissions continue to work normally

## Backwards Compatibility

- Old API endpoints remain functional
- Existing problems without time limits default to 10 minutes
- Old submissions without competition entries are preserved
