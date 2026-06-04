import { createDbClient } from "../lib/db";
import { hashPassword } from "../lib/hash";
import { signJwt } from "../lib/jwt";
import type { RequestContext } from "../types";
import { normalizeEmail } from "../lib/schoolRules";

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

    const username = eduId.toUpperCase().trim();
    const emailWithDomain = normalizeEmail(`${username}@psbbschools.edu.in`);
    const emailRaw = username.toLowerCase();
    const client = createDbClient(ctx.env.DB);

    const userRow = await client.first<{ id: number, role: string, name: string, password_hash: string }>(
      "SELECT id, role, name, password_hash FROM users WHERE email = ? OR email = ?",
      [emailRaw, emailWithDomain]
    );

    if (!userRow || !userRow.password_hash) {
      return jsonError("Invalid EDU ID or password.", 401);
    }

    const hashedPassword = await hashPassword(password);
    if (hashedPassword !== userRow.password_hash) {
      return jsonError("Invalid EDU ID or password.", 401);
    }

    // Keep the full email domain in the payload to pass isAllowedSchoolEmail checks
    const emailForToken = emailWithDomain;

    const payload = {
      sub: userRow.id.toString(),
      email: emailForToken,
      role: userRow.role,
      exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
    };

    if (!ctx.env.JWT_SECRET) {
      return jsonError("JWT configuration is missing on server", 500);
    }
    
    const token = await signJwt(payload, ctx.env.JWT_SECRET);
    
    return jsonResponse({
      status: "success",
      data: {
        token,
        user: { id: userRow.id.toString(), email: emailForToken, role: userRow.role, name: userRow.name }
      }
    });
  } catch (e: any) {
    return jsonError(e.message || "Login failed", 500);
  }
}
