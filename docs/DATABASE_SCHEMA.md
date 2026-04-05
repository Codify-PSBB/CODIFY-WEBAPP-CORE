# Database Schema

Canonical schema for Cloudflare D1 (SQLite).

## users

- id: INTEGER PRIMARY KEY AUTOINCREMENT
- name: TEXT NOT NULL
- email: TEXT NOT NULL UNIQUE
- role: TEXT NOT NULL, one of `member`, `admin`
- xp: INTEGER NOT NULL DEFAULT 0
- created_at: TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

## problems

- id: INTEGER PRIMARY KEY AUTOINCREMENT
- title: TEXT NOT NULL
- description: TEXT NOT NULL
- xp_reward: INTEGER NOT NULL
- active: INTEGER NOT NULL (`1` or `0`)
- created_at: TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

## submissions

- id: INTEGER PRIMARY KEY AUTOINCREMENT
- user_id: INTEGER NOT NULL (FK -> users.id)
- problem_id: INTEGER NOT NULL (FK -> problems.id)
- code: TEXT NOT NULL
- status: TEXT NOT NULL, one of `pending`, `approved`, `rejected`
- created_at: TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
- reviewed_by: INTEGER NULL (FK -> users.id)
