# Worker

Cloudflare Worker backend for `/api/*` routes.

## Authentication and configuration

- Accounts are pre-created and login returns a locally signed JWT.
- Allowed email domain: `@psbbschools.edu.in`.
- Admin emails are defined in `src/lib/schoolRules.ts`.
- Set `JWT_SECRET` and `CODIFY_SALT` as Worker secrets.
- Production `ALLOWED_ORIGINS` must list exact HTTPS frontend origins and
  `ALLOW_LOCALHOST_ORIGINS` must remain `false`.
- For local development, copy `.dev.vars.example` to `.dev.vars` and use only
  development values.

Follow [`docs/PRODUCTION_DEPLOYMENT.md`](../docs/PRODUCTION_DEPLOYMENT.md) for
the mandatory database-first deployment order.
