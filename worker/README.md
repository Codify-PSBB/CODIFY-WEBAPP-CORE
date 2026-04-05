# Worker

Cloudflare Worker backend for `/api/*` routes.

## Authentication

- Clerk session tokens are verified in `src/middleware/auth.ts`.
- Allowed email domain: `@psbbschools.edu.in`.
- Admin emails are defined in a hardcoded list in `src/middleware/auth.ts`.
- Set Clerk secret before running:
  - `wrangler secret put CLERK_SECRET_KEY`
