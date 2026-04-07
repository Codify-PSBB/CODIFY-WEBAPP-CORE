# Frontend

React + Vite frontend for student and admin interfaces.

## Environment

Create `.env.local` (or `.env`) in `frontend/` with:

`VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key`

`VITE_API_BASE_URL=https://<your-worker-domain>.workers.dev`

If `VITE_API_BASE_URL` is not set, the frontend will call `/api` on the same origin.

- In local dev, Vite now proxies `/api` to `http://127.0.0.1:8787` by default.
- Run the worker locally (`npm --prefix worker run dev`) so proxied API requests succeed.
- In deployed frontend builds (Cloudflare Pages), configure `VITE_API_BASE_URL` in build environment variables.

## Notes

- API requests automatically attach Clerk session token as `Authorization: Bearer <token>`.
- Routes are shown only after sign-in.
