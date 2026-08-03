# Database

D1 migration files live in `database/migrations/`.

Current migrations:
- `0001_initial_schema.sql`: creates `users`, `problems`, and `submissions` tables.
- `0002_problem_content_and_toggle_votes.sql`: adds problem content fields (`sample_input`, `sample_output`, `testcases`) and creates `app_toggle_off_votes` for 2-admin OFF voting.
- `0003` through `0007`: evolve public tests, local authentication, grades, and the multi-problem competition lifecycle.
- `0008_competition_integrity.sql`: makes D1 competition state authoritative, adds idempotent XP awards, and enforces submission/live-problem integrity at commit time.

Production migrations must be applied before the corresponding Worker. Follow
[`docs/PRODUCTION_DEPLOYMENT.md`](../docs/PRODUCTION_DEPLOYMENT.md).
