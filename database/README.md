# Database

D1 migration files live in `database/migrations/`.

Current migrations:
- `0001_initial_schema.sql`: creates `users`, `problems`, and `submissions` tables.
- `0002_problem_content_and_toggle_votes.sql`: adds problem content fields (`sample_input`, `sample_output`, `testcases`) and creates `app_toggle_off_votes` for 2-admin OFF voting.
