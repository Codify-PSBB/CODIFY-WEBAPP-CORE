import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface LeaderboardUserRow {
  xp: number;
  clerk_user_id: string | null;
  name: string;
  email: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  student_id: string;
  xp: number;
}

function deriveFallbackName(email: string): string {
  const localPart = email.split("@")[0] ?? "student";
  const spaced = localPart.replace(/[._-]+/g, " ").trim();
  if (!spaced) return "Student";
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** Returns the raw school roll number (e.g. "s220162") from an email */
function deriveStudentId(email: string): string {
  return (email.split("@")[0] ?? email).toLowerCase();
}

/** True if the stored name is just the email-derived placeholder */
function isPlaceholderName(name: string, email: string): boolean {
  return name.toLowerCase() === deriveStudentId(email);
}

export const leaderboardHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    const rows = await db.all<LeaderboardUserRow>(
      "SELECT xp, clerk_user_id, name, email FROM users ORDER BY xp DESC, email ASC"
    );

    // Single batch Clerk lookup — 1 API call total regardless of user count.
    // Only queries Clerk for users whose DB name is still a placeholder.
    const clerkNameByEmail = new Map<string, string>();
    const secretKey = ctx.env.CLERK_SECRET_KEY;

    if (secretKey && rows.length > 0) {
      const emailsNeedingLookup = rows
        .filter((r) => isPlaceholderName(r.name, r.email))
        .map((r) => r.email);

      if (emailsNeedingLookup.length > 0) {
        try {
          const { createClerkClient } = await import("@clerk/backend");
          const clerk = createClerkClient({ secretKey });
          const { data: clerkUsers } = await clerk.users.getUserList({ emailAddress: emailsNeedingLookup });

          for (const u of clerkUsers) {
            const fullName =
              (u.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(" ").trim()) || null;
            if (fullName) {
              for (const addr of u.emailAddresses) {
                clerkNameByEmail.set(addr.emailAddress.toLowerCase(), fullName);
              }
            }
          }
        } catch {
          // Clerk unavailable — fall back to DB names gracefully
        }
      }
    }

    const leaderboard: LeaderboardEntry[] = rows.map((row, index) => {
      const email = row.email.toLowerCase();
      const resolvedName =
        clerkNameByEmail.get(email) ??
        (isPlaceholderName(row.name, row.email) ? deriveFallbackName(row.email) : row.name);

      return {
        rank: index + 1,
        name: resolvedName,
        student_id: deriveStudentId(row.email),
        xp: row.xp
      };
    });

    return Response.json({
      status: "success",
      data: {
        leaderboard
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        status: "error",
        message: `Failed to fetch leaderboard: ${errorMessage}`
      },
      { status: 500 }
    );
  }
};
