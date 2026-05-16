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

export const leaderboardHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    // Keep ranking by XP, but display Clerk full names.
    const rows = await db.all<LeaderboardUserRow>(
      "SELECT xp, clerk_user_id, name, email FROM users ORDER BY xp DESC, email ASC"
    );

    const leaderboard: LeaderboardEntry[] = rows.map((row, index) => {
      return {
        rank: index + 1,
        name: row.name,
        student_id: deriveFallbackName(row.email).toUpperCase(),
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
