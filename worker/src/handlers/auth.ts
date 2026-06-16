import { createDbClient } from "../lib/db";
import { hashPassword } from "../lib/hash";
import { signJwt } from "../lib/jwt";
import { isAdminEmail, normalizeEmail } from "../lib/schoolRules";
import type { RequestContext } from "../types";

function jsonResponse(data: any, status = 200) {
  return Response.json(data, { status });
}

function jsonError(message: string, status = 400) {
  return Response.json({ status: "error", message }, { status });
}

export async function handleRegister(ctx: RequestContext) {
  return jsonError("Registration is disabled. Accounts are pre-created by the admin.", 403);
}

export async function handleLogin(ctx: RequestContext) {
  try {
    const body = (await ctx.request.json()) as any;
    const { eduId, password } = body;

    if (!eduId || !password) {
      return jsonError("Missing required fields (eduId, password).");
    }

    // Accept either "s150008" or "s150008@psbbschools.edu.in"
    const rawId = eduId.trim().toLowerCase();
    const emailWithDomain = rawId.includes("@")
      ? normalizeEmail(rawId)
      : normalizeEmail(`${rawId}@psbbschools.edu.in`);
    const emailShort = emailWithDomain.split("@")[0] ?? rawId;

    const client = createDbClient(ctx.env.DB);

    // Look up by full email OR short-form (legacy rows)
    const userRow = await client.first<{
      id: number;
      role: string;
      name: string;
      email: string;
      password_hash: string | null;
    }>(
      "SELECT id, role, name, email, password_hash FROM users WHERE email = ? OR email = ?",
      [emailWithDomain, emailShort]
    );

    if (!userRow || !userRow.password_hash) {
      return jsonError("Invalid EDU ID or password.", 401);
    }

    if (!ctx.env.CODIFY_SALT) {
      return jsonError("Server salt configuration is missing", 500);
    }
    const hashedPassword = await hashPassword(password, ctx.env.CODIFY_SALT);
    if (hashedPassword !== userRow.password_hash) {
      return jsonError("Invalid EDU ID or password.", 401);
    }

    // Determine role: use admin list as the source of truth
    const role = isAdminEmail(userRow.email) ? "admin" : "member";

    const payload = {
      sub: userRow.id.toString(),
      email: userRow.email,
      role,
      name: userRow.name,
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    };

    if (!ctx.env.JWT_SECRET) {
      return jsonError("JWT configuration is missing on server", 500);
    }

    const token = await signJwt(payload, ctx.env.JWT_SECRET);

    return jsonResponse({
      status: "success",
      data: {
        token,
        user: {
          id: userRow.id.toString(),
          email: userRow.email,
          role,
          name: userRow.name,
        },
      },
    });
  } catch (e: any) {
    return jsonError(e.message || "Login failed", 500);
  }
}
