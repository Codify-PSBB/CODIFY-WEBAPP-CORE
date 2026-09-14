# Scripts

## sync-frontend-dist.mjs

Copies `frontend/dist/` → root `dist/` so the Cloudflare Worker can serve the built frontend assets.

```bash
node scripts/sync-frontend-dist.mjs
```

## verify-admin-security.js

Verifies that the admin email list in `worker/src/lib/schoolRules.ts` matches the expected 4 admin accounts.

```bash
node scripts/verify-admin-security.js
```

## User Account Creation

User accounts are created through the **admin panel** (`/api/admin/users/create`).

- Required fields: `name`, `usn`, `grade` (`9` or `10`).
- Existing users with missing grade can be fixed via (`/api/admin/users/set-grade`).
- Password is set to the student's uppercase USN (e.g. `S150008`).
- Passwords are hashed with PBKDF2 (100k iterations, SHA-256) in the Worker.
- There is no bulk-import script — add users one-by-one via the admin UI.
