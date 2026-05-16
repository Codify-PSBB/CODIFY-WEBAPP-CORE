import { createClerkClient } from "@clerk/backend";
import { createDbClient } from "../lib/db";
import type { AuthenticatedUser } from "../types";

interface UserRow {
  id: number;
  name: string;
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

export async function ensureUserId(
  db: D1Database,
  user: AuthenticatedUser,
  clerkSecretKey?: string
): Promise<number> {
  const client = createDbClient(db);

  let realName: string | null = null;

  if (clerkSecretKey) {
    try {
      const clerkClient = createClerkClient({ secretKey: clerkSecretKey });
      const clerkUser = await clerkClient.users.getUser(user.userId);
      realName =
        (clerkUser.fullName ??
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim()) ||
        null;
    } catch {
      // ignore
    }
  }

  const existing = await client.first<UserRow>("SELECT id, name FROM users WHERE email = ?", [user.email]);
  if (existing) {
    const isPlaceholder = existing.name === deriveNameFromEmail(user.email);
    const newName = isPlaceholder && realName ? realName : existing.name;

    await client.run(
      "UPDATE users SET role = ?, clerk_user_id = COALESCE(clerk_user_id, ?), name = ? WHERE id = ?",
      [user.role, user.userId, newName, existing.id]
    );
    return existing.id;
  }

  const name = realName ?? deriveNameFromEmail(user.email);
  await client.run(
    "INSERT INTO users (name, email, role, xp, clerk_user_id) VALUES (?, ?, ?, 0, ?)",
    [name, user.email, user.role, user.userId]
  );

  const created = await client.first<UserRow>("SELECT id FROM users WHERE email = ?", [user.email]);
  if (!created) {
    throw new Error("Failed to create user record.");
  }

  return created.id;
}
