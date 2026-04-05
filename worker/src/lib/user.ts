import { createDbClient } from "../lib/db";
import type { AuthenticatedUser } from "../types";

interface UserRow {
  id: number;
}

function deriveNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "student";
  const spaced = localPart.replace(/[._-]+/g, " ").trim();
  if (!spaced) {
    return "Student";
  }

  return spaced
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function ensureUserId(db: D1Database, user: AuthenticatedUser): Promise<number> {
  const client = createDbClient(db);

  const existing = await client.first<UserRow>("SELECT id FROM users WHERE email = ?", [user.email]);
  if (existing) {
    // Keep DB role aligned with auth role resolution.
    await client.run("UPDATE users SET role = ? WHERE id = ?", [user.role, existing.id]);
    return existing.id;
  }

  const name = deriveNameFromEmail(user.email);
  await client.run("INSERT INTO users (name, email, role, xp) VALUES (?, ?, ?, 0)", [
    name,
    user.email,
    user.role
  ]);

  const created = await client.first<UserRow>("SELECT id FROM users WHERE email = ?", [user.email]);
  if (!created) {
    throw new Error("Failed to create user record.");
  }

  return created.id;
}
