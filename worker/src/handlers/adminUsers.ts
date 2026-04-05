import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface AdminUserRow {
  name: string;
  email: string;
  role: "member" | "admin";
  xp: number;
}

export const adminUsersHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    const users = await db.all<AdminUserRow>(
      "SELECT name, email, role, xp FROM users ORDER BY xp DESC, name ASC"
    );

    return Response.json({
      status: "success",
      data: {
        users
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to fetch users."
      },
      { status: 500 }
    );
  }
};
