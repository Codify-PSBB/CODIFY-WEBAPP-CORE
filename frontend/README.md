# Frontend

React + Vite frontend for student and admin interfaces.

## Environment

Create `.env` in `frontend/` with:

`VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key`

## Notes

- API requests automatically attach Clerk session token as `Authorization: Bearer <token>`.
- Routes are shown only after sign-in.
