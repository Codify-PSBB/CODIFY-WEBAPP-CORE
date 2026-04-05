import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface LeaderboardUserRow {
  name: string;
  xp: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
}

export const leaderboardHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    const users = await db.all<LeaderboardUserRow>(
      "SELECT name, xp FROM users ORDER BY xp DESC, name ASC"
    );

    const leaderboard: LeaderboardEntry[] = users.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      xp: user.xp
    }));

    return Response.json({
      status: "success",
      data: {
        leaderboard
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to fetch leaderboard."
      },
      { status: 500 }
    );
  }
};
