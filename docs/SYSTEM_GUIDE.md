# Codify System Guide: Architecture, Flows, and Audit Manual

This guide serves as the definitive reference for the **Codify Webapp** platform, detailing its architecture, application flows, data models, security implementation, and critical audit considerations.

---

## 1. System Overview & Technology Stack

Codify is an internal, school-lab-based programming competition platform designed for grades 8 and 9. It is designed around the principles of **simplicity**, **manual review**, and **browser-sandbox execution**.

```
+-------------------------------------------------------------------------+
|                              FRONTEND                                   |
|   Vite + React SPA  <--->  Pyodide (Local browser-side Python sandbox) |
|                     <--->  TailwindCSS (Premium UI Styling)             |
+-------------------------------------------------------------------------+
                                    |
                       HTTPS Requests with JWT Bearer
                                    v
+-------------------------------------------------------------------------+
|                               BACKEND                                   |
|   Cloudflare Workers (TypeScript api gateway & router)                  |
|                     <--->  Cloudflare KV (Competition State)            |
|                     <--->  Cloudflare D1 (SQLite database)              |
+-------------------------------------------------------------------------+
```

### Technology Stack Details
1. **Frontend**: React (Single Page Application) built with Vite and styled using vanilla TailwindCSS.
2. **Backend**: Cloudflare Workers. It exposes a JSON REST API and acts as a stateless middleware gateway.
3. **Database (Cloudflare D1)**: Serverless SQLite database storing persistent assets (users, problems, submissions, history).
4. **Key-Value Store (Cloudflare KV)**: Acts as the high-availability orchestrator for the global active competition state.
5. **Python Execution Sandbox (Pyodide)**: WebAssembly (Wasm) Python interpreter running completely client-side in the student's browser. **The backend never executes student code.**

---

## 2. Database Schema & State Machine

### 2.1 Cloudflare D1 SQLite Tables

#### `users`
Tracks students and administrators. No registration is allowed; accounts are pre-created.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `name` (TEXT NOT NULL)
* `email` (TEXT NOT NULL UNIQUE): Always normalized school email (e.g. `s220162@psbbschools.edu.in`).
* `role` (TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'admin')))
* `xp` (INTEGER NOT NULL DEFAULT 0 CHECK(xp >= 0))
* `password_hash` (TEXT): Hex-encoded SHA-256 hash of `password + salt`.
* `grade` (INTEGER): Grades 8 or 9, used for grade-specific leaderboards.
* `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)
* *Index*: `idx_users_xp` ON `users(xp DESC)`

#### `problems`
Master table for the admin-managed question bank.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `title` (TEXT NOT NULL)
* `description` (TEXT NOT NULL)
* `xp_reward` (INTEGER NOT NULL CHECK(xp_reward >= 0))
* `active` (INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)))
* `public_testcase_1_input` / `public_testcase_1_output` (TEXT)
* `public_testcase_2_input` / `public_testcase_2_output` (TEXT)
* `public_testcase_3_input` / `public_testcase_3_output` (TEXT)
* `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)
* *Index*: `idx_problems_active` ON `problems(active)`

#### `competitions`
Tracks instances of competitions run over time.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `status` (TEXT NOT NULL DEFAULT 'setup' CHECK(status IN ('setup', 'live', 'ended')))
* `created_by` (TEXT NOT NULL)
* `started_at` (TEXT)
* `ended_at` (TEXT)
* `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)
* *Index*: `idx_competitions_status` ON `competitions(status)`

#### `competition_problems`
Associative table linking problems to a competition. Configured by admins during the competition setup phase.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `competition_id` (INTEGER REFERENCES competitions(id))
* `problem_id` (INTEGER REFERENCES problems(id))
* `display_order` (INTEGER NOT NULL DEFAULT 0)
* *Index*: `idx_competition_problems_competition_id` ON `competition_problems(competition_id)`
* *Constraint*: `UNIQUE(competition_id, problem_id)`

#### `submission_groups`
Represents a student's bulk submission event. A student submits all their answers together exactly once.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `user_id` (INTEGER REFERENCES users(id))
* `competition_id` (INTEGER REFERENCES competitions(id))
* `elapsed_seconds` (INTEGER NOT NULL DEFAULT 0): The student's recorded competition time.
* `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)
* *Index*: `idx_submission_groups_competition_id` ON `submission_groups(competition_id)`
* *Index*: `idx_submission_groups_user_id` ON `submission_groups(user_id)`
* *Constraint*: `UNIQUE(user_id, competition_id)`

#### `submissions`
Detailed code submitted for each specific problem within a bulk submission group.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `user_id` (INTEGER REFERENCES users(id))
* `problem_id` (INTEGER REFERENCES problems(id))
* `code` (TEXT NOT NULL)
* `status` (TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')))
* `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)
* `reviewed_by` (INTEGER REFERENCES users(id)): The admin who reviewed it.
* `competition_id` (INTEGER REFERENCES competitions(id))
* `submission_group_id` (INTEGER REFERENCES submission_groups(id))
* *Indexes*: `idx_submissions_user_id`, `idx_submissions_status`, `idx_submissions_competition_id`, `idx_submissions_submission_group_id`

---

### 2.2 Competition Lifecycle State Machine
Managed globally via Cloudflare KV (`APP_STATE` key) to protect database resources.

```
       +-----------------------+
       |         IDLE          |  <----+
       +-----------------------+       |
                   |                   |
          (Admin Creates Comp)         |  (Admin Reset Comp)
                   v                   |
       +-----------------------+       |
       |        SETUP          |  -----+
       +-----------------------+
                   |
          (Admin Goes Live)
                   v
       +-----------------------+
       |         LIVE          |
       +-----------------------+
                   |
          (Admin Ends Comp)
                   v
       +-----------------------+
       |        ENDED          |
       +-----------------------+
```

* **`idle`**: No competition is active. Members can only see the Leaderboard.
* **`setup`**: Admin has created a new competition. Admins can add/remove problems from the question bank. Students are still locked out.
* **`live`**: Competition is running. Students can log in, run the stopwatch, test code, and submit their solutions in bulk.
* **`ended`**: Submissions are locked. Admins review all pending submissions. Students can see the leaderboard and their own historical submissions.

---

## 3. Operational Flows

### 3.1 Authentication Flow (Custom JWT)
We have removed Clerk in favor of simple, performant, and secure school ID credentials.

```
[Student/Admin UI]                         [API /api/auth/login]                  [Cloudflare D1 DB]
       |                                             |                                     |
       |---- POST { eduId, password } -------------->|                                     |
       |                                             |---- Lookup by email/EDU ID -------->|
       |                                             |<--- Return user + password_hash ----|
       |                                             |                                     |
       |                                             |-- Hash(password + Salt) ------------|
       |                                             |-- Compare with DB hash -------------|
       |                                             |                                     |
       |                                             |-- Determine Admin (hardcoded list)--|
       |                                             |-- Sign Custom JWT (HS256) ----------|
       |<--- Return JWT + User Details --------------|                                     |
```

* **Password Hashing**: SHA-256 hash using a static salt (`CODIFY_SALT_2026!`).
* **JWT Properties**: Exposes `sub` (DB user ID), `email`, `role`, `name`, and an expiration time of 24 hours (`exp`).
* **JWT Validation**: Synchronous validation on both the client and server using a shared `JWT_SECRET`.

---

### 3.2 Competition Run Flow
1. **Creation**: Admin creates a new competition row (`status = 'setup'`). The KV state transitions to `{ phase: 'staging', competition_id }`.
2. **Asset Setup**: Admin adds exactly 10 problems from the problem bank.
3. **Launch**: Admin toggles the competition "Live". The KV state transitions to `{ phase: 'live', competition_id }`.
4. **Student Participation**:
   - Students load the page. A frontend timer starts tracking their session.
   - Students write Python code, testing it in the browser console (Pyodide).
   - Once all 10 problems are answered, the student clicks **Submit**.
   - The frontend packages all 10 answers into a single `POST /api/submissions` request.
5. **Close & Evaluation**: Admin marks the competition "Ended". No new submissions are accepted. Admins go through the submissions on their dashboard, marking them **Approved** (student gets the XP reward) or **Rejected**.

---

## 4. Security Architecture & Audit Checkpoints

If auditing this application for security compliance, focus on these five core pillars:

### 4.1 Token Security & Verification
All endpoints under `/api/admin/*` and private member routes require a valid custom JWT token in the `Authorization: Bearer <token>` header.
* **Algorithm Restriction**: The custom JWT library imports the signature key with `{ name: "HMAC", hash: "SHA-256" }` explicitly. It does not parse the `alg` header parameter from the user, neutralizing JWT `"alg": "none"` attacks.
* **Signature Guard**: If a token has an invalid signature, the middleware throws a `401 Unauthorized` response immediately.
* **Token Expiry**: The `exp` claim is checked on every server-side request verification. Expired tokens are rejected.

### 4.2 Privilege Escalation Protections
* **Server-side Source of Truth**: User roles in the database are secondary. The `requireAdmin` middleware checks if `ctx.user.role === 'admin'` **AND** confirms that the user's email is explicitly declared in the hardcoded `ADMIN_EMAIL_LIST` array inside `worker/src/lib/schoolRules.ts`.
* **Zero-trust Endpoint Mapping**: Every administrative endpoint is mapped explicitly using the `adminOnly` middleware chain. A standard student login token will return a `403 Forbidden` if sent to `/api/admin/*` endpoints.

### 4.3 Database Protections (SQL Injection & Limits)
* **Parameterized Queries**: All queries to Cloudflare D1 utilize prepared statements (e.g. `client.first("SELECT ... WHERE email = ?", [email])`). String concatenation is never used to build SQL statements.
* **No Client SQL Access**: SQL queries are entirely constructed on the backend. No raw SQL or query structures are accepted in client requests.

### 4.4 Client Sandbox Security (No Server Code Execution)
* **Zero Server-side Code Execution**: User code is executed entirely inside a client-side WebAssembly interpreter (Pyodide). The backend only stores the submissions as text strings in the database.
* **Isolation**: If a student writes malicious code (e.g., an infinite loop or sandbox escape), it can only affect their own browser instance. Re-loading the tab resets the Pyodide environment.

---

## 5. Potential Failure Points & Troubleshooting

During live competition events, administrators should monitor the following areas:

### 5.1 Cloudflare KV Event Consistency (Propagation Delays)
* **Risk**: Cloudflare KV is eventually consistent. When an admin transitions a competition state to `live`, it can take up to a minute to propagate globally to all edge locations.
* **Mitigation**: Admin should trigger the "Go Live" transition 2 minutes before the students are instructed to reload and begin.

### 5.2 Browser Memory Leakage (Pyodide & Monaco Editor)
* **Risk**: Pyodide runs Python inside browser WebAssembly. With 10 code editors loaded concurrently on a single page, older computer lab systems (with < 4GB RAM) may run low on memory or experience UI stuttering.
* **Mitigation**: Students should close unneeded tabs and refresh the browser if Pyodide runs out of memory. The local draft code is persisted in the browser's `localStorage` so refreshing does not cause work loss.

### 5.3 Client Stopwatch Manipulation
* **Risk**: The elapsed time for a submission (`elapsed_seconds`) is tracked via a frontend javascript stopwatch. A student could theoretically modify their client state using dev tools to report `elapsed_seconds = 10`.
* **Mitigation**: Since this is a supervised, physical classroom setting (4 admins watching ~30 students), screen-snapping or devtools inspections can be easily caught. For future automated audits, the backend can compare the client's `elapsed_seconds` against the difference between the submission timestamp and the competition's `started_at` time.

### 5.4 Database Concurrency Limits
* **Risk**: If all 30 students submit their bulk answers at the exact same second, Cloudflare D1 may queue queries, leading to minor latency spikes.
* **Mitigation**: The system splits submissions into a two-tiered structure: a quick insert into `submission_groups` (with a `UNIQUE` constraint preventing duplicate submissions), followed by individual row insertions for each code block. 

---

## 6. Security Audit Checklist

Use this checklist during code reviews or deployments:

- [ ] **Secrets Check**: Ensure no raw `JWT_SECRET` values are committed to GitHub.
- [ ] **Allowed Domain Check**: Ensure `ALLOWED_SCHOOL_EMAIL_DOMAIN` in `worker/src/lib/schoolRules.ts` is strictly set to `@psbbschools.edu.in`.
- [ ] **Admin Synchronicity**: Verify that the hardcoded admin email list in `worker/src/lib/schoolRules.ts` matches the expected supervisor emails exactly.
- [ ] **Registration Verification**: Verify that `/api/auth/register` rejects requests with a 403 error.
- [ ] **CORS Origins**: Ensure wildcard CORS is restricted where possible, or managed solely through headers that do not allow credential passing. (Since Custom JWTs are passed via the standard `Authorization` header rather than Cookies, CSRF threat is neutralized).
- [ ] **D1 Database Binding**: Confirm that the `wrangler.toml` D1 bindings point to the correct production database ID.
