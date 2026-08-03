import { createDbClient } from "../lib/db";
import { hashPassword } from "../lib/hash";
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

export const adminCreateUserHandler: RouteHandler = async (ctx) => {
  try {
    const body = (await ctx.request.json()) as any;
    const { name, usn } = body;

    if (!name || !usn || typeof name !== "string" || typeof usn !== "string") {
      return Response.json({ status: "error", message: "Missing or invalid required fields (name, usn)." }, { status: 400 });
    }

    if (!ctx.env.CODIFY_SALT) {
      return Response.json({ status: "error", message: "Server salt configuration is missing" }, { status: 500 });
    }

    const uppercaseUsn = usn.trim().toUpperCase();
    const email = `${uppercaseUsn.toLowerCase()}@psbbschools.edu.in`;
    
    // Capitalized USN as the password
    const passwordHash = await hashPassword(uppercaseUsn, ctx.env.CODIFY_SALT);

    const db = createDbClient(ctx.env.DB);
    
    try {
      await db.run(
        "INSERT INTO users (name, email, role, xp, password_hash) VALUES (?, ?, 'member', 0, ?)",
        [name.trim(), email, passwordHash]
      );
    } catch (e: any) {
      if (e.message && e.message.includes("UNIQUE constraint failed")) {
        return Response.json({ status: "error", message: "A user with this USN/Email already exists." }, { status: 409 });
      }
      throw e;
    }

    return Response.json({
      status: "success",
      message: "User created successfully."
    });
  } catch (error: unknown) {
    console.error("adminCreateUserHandler error", error);
    return Response.json(
      {
        status: "error",
        message: "Failed to create user."
      },
      { status: 500 }
    );
  }
};
