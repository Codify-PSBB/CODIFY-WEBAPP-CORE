# Production deployment runbook

> Migration `0008_competition_integrity.sql` was amended before its first production application. If `0008` has already been applied anywhere, stop and create a new forward-only migration instead of reapplying it.

Deploy in this order. Do not deploy the Worker before the database migration.

## 1. Backup and preflight

1. Confirm a clean release commit and record its SHA.
2. Export/back up the production D1 database using the current Cloudflare-supported D1 export procedure.
3. Run locally from the repository root:

   ```sh
   npm ci
   npm run production-gate
   ```

4. Confirm production has at most one legacy competition in `setup` or `live`. Resolve ambiguity manually; migration `0008` deliberately aborts rather than guessing.
5. Confirm `database/migrations/0008_competition_integrity.sql` has **not** already been recorded as applied.

## 2. Production configuration

- `JWT_SECRET` and `CODIFY_SALT` must exist as Worker secrets; never put values in Git.
- `ALLOWED_ORIGINS` must contain only exact HTTPS production frontend origins, comma-separated.
- `ALLOW_LOCALHOST_ORIGINS` must be `false` in production.
- Verify the D1 `DB` binding targets `coding-club-db` and the frontend API URL targets the intended Worker.

## 3. Database first

Apply all pending D1 migrations through `0008` before deploying Worker code. Then inspect the production schema:

- `competitions.reset_at` exists.
- `xp_awards` exists.
- triggers `validate_competition_submission`, `protect_competition_submission_identity`, `protect_live_competition_problem_update`, and `protect_live_competition_problem_delete` exist.
- index `idx_competitions_one_current` exists.
- `PRAGMA integrity_check` returns `ok`.

If migration or validation fails, stop. Restore/fix the database; do not deploy the Worker.

## 4. Worker, smoke tests, then frontend

1. Deploy the Worker from the recorded release SHA.
2. Before frontend deployment, smoke-test against the production API:
   - disallowed browser Origin receives 403;
   - allowed production Origin receives the expected CORS header;
   - login accepts a valid account, rejects malformed credentials generically, and rejects an oversized body with 413;
   - authenticated competition status and leaderboard load;
   - admin competition dashboard loads;
   - do not mutate a live event during smoke testing.
3. Deploy the frontend only after Worker smoke tests pass.
4. Verify browser login, competition status, admin dashboard, security headers, and one supervised non-live workflow.
5. Monitor Worker errors and D1 failures. Roll back frontend/Worker code if needed; do not reverse a successful schema migration by deleting columns or tables.
