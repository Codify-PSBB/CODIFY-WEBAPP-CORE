import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface ProblemRow {
  id: number;
  title: string;
  description: string;
  xp_reward: number;
  active: number;
  created_at: string;
}

export const problemsHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    const problems = await db.all<ProblemRow>(
      "SELECT id, title, description, xp_reward, active, created_at FROM problems WHERE active = 1 ORDER BY created_at DESC"
    );

    return Response.json({
      status: "success",
      data: {
        problems
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to fetch problems."
      },
      { status: 500 }
    );
  }
};
