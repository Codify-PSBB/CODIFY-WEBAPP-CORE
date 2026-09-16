import { createDbClient } from "../lib/db";
import type { AuthenticatedUser } from "../types";

/**
 * Looks up a user's DB id by their email.
 * All users are pre-created by admins — if no row is found, throws so the
 * caller returns a 401 rather than silently creating a ghost account.
 */
export async function getUserId(
  db: D1Database,
  user: AuthenticatedUser
): Promise<number> {
  const client = createDbClient(db);

  const row = await client.first<{ id: number }>(
    "SELECT id FROM users WHERE email = ?",
    [user.email]
  );

  if (!row) {
    throw new Error(`No account found for ${user.email}. Contact an admin.`);
  }

  return row.id;
}

/**
 * Looks up a user's grade (9, 10, or NULL when unset).
 * Used by requireAuth so grade-based competition gating always reflects the
 * latest DB value rather than a possibly stale JWT claim.
 */
export async function getUserGrade(
  db: D1Database,
  userId: string
): Promise<number | null> {
  const client = createDbClient(db);

  const row = await client.first<{ grade: number | null }>(
    "SELECT grade FROM users WHERE id = ?",
    [userId]
  );

  return row?.grade ?? null;
}
