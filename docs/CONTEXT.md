==============================

CODING CLUB PLATFORM - AI CONTEXT
==============================

PROJECT NAME
Coding Club Competition Platform

PURPOSE
This is a web application used by a school coding club to run Python programming competitions for students in grades 8 and 9.

Students solve coding problems and submit their solutions. Admins manually review the submissions and award XP.

Competitions are conducted inside the school computer lab with 4 admins supervising around 30 students.

This is NOT a public platform and should remain simple and minimal.


====================================================
CORE PRINCIPLES
====================================================

1. SIMPLICITY
The platform should remain extremely simple. Avoid unnecessary complexity.

2. MANUAL REVIEW
Submissions are reviewed by admins instead of automated judging.

3. INTERNAL TOOL
This is an internal school tool, not a production SaaS system.

4. SERVERLESS
All infrastructure runs on Cloudflare.


====================================================
USER ROLES
====================================================

ROLE: MEMBER

Members are students participating in the competition.

Permissions:
- View competition problems
- Submit code solutions
- Use Python interpreter
- View leaderboard

Restrictions:
- Cannot access admin pages
- Cannot review submissions
- Cannot toggle the competition state


ROLE: ADMIN

Admins are the coding club leaders supervising the competition.

Permissions:
- View all users
- Review submissions
- Approve or reject submissions
- Toggle the competition ON or OFF
- View leaderboard
- View submission history

Admins are identified by a hardcoded list of email addresses.


====================================================
APP TOGGLE SYSTEM
====================================================

The application has a global ON/OFF state.

When OFF:
Members can only view the leaderboard.

When ON:
Members can access the competition page and submit solutions.

Admins always bypass this restriction.

The toggle state is stored in Cloudflare KV.


====================================================
STUDENT INTERFACE
====================================================

Students only have access to TWO pages.


PAGE 1: COMPETITION PAGE

Displays:
- problem description
- code editor
- submit button
- submission history

Students write Python code and submit it.

Submissions are stored in the database with status "pending".

Admins review submissions and either approve or reject them.


PAGE 2: PYTHON INTERPRETER

This is a browser-based Python runtime using Pyodide.

Purpose:
- allow students to test code
- allow experimentation before submitting

Execution happens entirely in the browser.

The backend never executes student code.


====================================================
LEADERBOARD
====================================================

The leaderboard shows rankings sorted by XP.

Fields:
- rank
- student name
- XP

The leaderboard is visible even when the app is OFF.


====================================================
COMPETITION WORKFLOW
====================================================

1. Admin toggles the app ON
2. Students login
3. Students read the problem
4. Students submit code
5. Admins review submissions
6. Correct submissions receive XP
7. Leaderboard updates
8. Admin toggles the app OFF after the competition


====================================================
TECH STACK
====================================================

Frontend
React with Vite (or Next.js)

Hosting
Cloudflare Pages

Backend
Cloudflare Workers (TypeScript)

Database
Cloudflare D1 (SQLite)

Key Value Storage
Cloudflare KV

Authentication
Clerk

Python Execution
Pyodide running in the browser


====================================================
AUTHENTICATION RULES
====================================================

Authentication is handled by Clerk.

Requirements:
- Only allow emails ending with @psbbschools.edu.in
- External emails must be rejected
- Email verification should be disabled

Admins are identified using a predefined list of emails.


====================================================
DATABASE SCHEMA
====================================================

TABLE: USERS

Fields
id
name
email
role
xp
created_at

Roles:
member
admin


TABLE: PROBLEMS

Fields
id
title
description
xp_reward
active
created_at


TABLE: SUBMISSIONS

Fields
id
user_id
problem_id
code
status
created_at
reviewed_by

Status values:
pending
approved
rejected


====================================================
API ENDPOINTS
====================================================

GET /api/leaderboard

Returns sorted leaderboard data.

Accessible even when app is OFF.


GET /api/problems

Returns active problems.

Members can access only when app is ON.
Admins can always access.


POST /api/submissions

Creates a new submission.

Body fields:
problem_id
code

Status is set to "pending".


GET /api/admin/submissions

Returns pending submissions.

Admin only.


POST /api/admin/review

Body fields:
submission_id
action

Action values:
approve
reject

If approved:
User XP increases by the problem XP reward.


POST /api/admin/toggle

Body fields:
status

Values:
ON
OFF

Stores the status in Cloudflare KV.


GET /api/admin/users

Returns user list with:
name
email
role
xp


====================================================
PYTHON EXECUTION RULE
====================================================

Python code must run ONLY in the browser using Pyodide.

Do NOT execute Python on the backend.

Pyodide must be lazy-loaded only when the interpreter page is opened.


====================================================
AI DEVELOPMENT RULES
====================================================

This project must remain simple.

DO NOT implement the following:

- plagiarism detection
- AI detection
- webcam monitoring
- backend Python execution
- complex anti-cheat systems
- microservices
- container orchestration
- websocket real-time systems

Keep the architecture simple and readable.


====================================================
EXPECTED PROJECT STRUCTURE
====================================================

root folder

frontend
React application

worker
Cloudflare Worker backend

docs
documentation files

database
D1 migrations

shared
shared types or utilities


====================================================
END OF CONTEXT
====================================================