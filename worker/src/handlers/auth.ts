import { createDbClient } from "../lib/db";
import { hashPassword } from "../lib/hash";
import { signJwt } from "../lib/jwt";
import { readJsonBody, RequestBodyTooLargeError } from "../lib/request";
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
  const MAX_LOGIN_BODY_BYTES = 4 * 1024;
  const MAX_EDU_ID_CHARS = 128;
  const MAX_PASSWORD_CHARS = 256;

  try {
    const body = await readJsonBody<unknown>(ctx.request, MAX_LOGIN_BODY_BYTES);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return jsonError("Invalid EDU ID or password.");
    }
    const { eduId, password } = body as Record<string, unknown>;

    if (
      typeof eduId !== "string" || typeof password !== "string" ||
      eduId.trim().length === 0 || password.length === 0 ||
      eduId.length > MAX_EDU_ID_CHARS || password.length > MAX_PASSWORD_CHARS
    ) {
      return jsonError("Invalid EDU ID or password.");
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

    // Determine role: use the normalized full-domain email for admin detection
    // (DB may store short-form like "s220162", but the admin list has full "@psbbschools.edu.in" form)
    const role = isAdminEmail(emailWithDomain) ? "admin" : "member";

    const payload = {
      sub: userRow.id.toString(),
      email: emailWithDomain,
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
          email: emailWithDomain,
          role,
          name: userRow.name,
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonError("Login request is too large.", 413);
    }
    if (error instanceof SyntaxError) {
      return jsonError("Invalid EDU ID or password.");
    }
    console.error("handleLogin error", error);
    return jsonError("Login failed.", 500);
  }
}
