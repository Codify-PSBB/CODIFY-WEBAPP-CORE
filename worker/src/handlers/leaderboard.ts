import { createClerkClient } from "@clerk/backend";
import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface LeaderboardUserRow {
  xp: number;
  clerk_user_id: string | null;
  email: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
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

export const leaderboardHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    // Keep ranking by XP, but display Clerk full names.
    const rows = await db.all<LeaderboardUserRow>(
      "SELECT xp, clerk_user_id, email FROM users ORDER BY xp DESC, email ASC"
    );

    const clerkSecretKey = ctx.env.CLERK_SECRET_KEY;
    const clerkClient = clerkSecretKey ? createClerkClient({ secretKey: clerkSecretKey }) : null;

    const clerkUserIds = Array.from(
      new Set(rows.map((r) => (r.clerk_user_id ?? "").trim()).filter(Boolean))
    );

    const clerkNameById = new Map<string, string>();
    const clerkNameByEmail = new Map<string, string>();

    if (clerkClient) {
      if (clerkUserIds.length > 0) {
        await Promise.all(
          clerkUserIds.map(async (id) => {
            try {
              const user = await clerkClient.users.getUser(id);
              const resolvedFullName =
                (user.fullName ??
                  [user.firstName, user.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim()) ||
                deriveFallbackName(user.emailAddresses[0]?.emailAddress ?? "");

              if (resolvedFullName) clerkNameById.set(id, resolvedFullName);
            } catch {
              // ignore individual failures
            }
          })
        );
      }

      const missingEmails = Array.from(
        new Set(rows.filter((r) => !(r.clerk_user_id ?? "").trim()).map((r) => r.email))
      );

      if (missingEmails.length > 0) {
        try {
          const { data: users } = await clerkClient.users.getUserList({ emailAddress: missingEmails });
          for (const user of users) {
            const resolvedFullName =
              (user.fullName ??
                [user.firstName, user.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim()) ||
              deriveFallbackName(user.emailAddresses[0]?.emailAddress ?? "");

            if (resolvedFullName) {
              for (const email of user.emailAddresses) {
                clerkNameByEmail.set(email.emailAddress, resolvedFullName);
              }
            }
          }
        } catch {
          // ignore fallback
        }
      }
    }

    const leaderboard: LeaderboardEntry[] = rows.map((row, index) => {
      const clerkId = row.clerk_user_id ?? "";
      const resolvedName =
        (clerkId ? clerkNameById.get(clerkId) : null) ??
        clerkNameByEmail.get(row.email) ??
        deriveFallbackName(row.email);

      return {
        rank: index + 1,
        name: resolvedName,
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
