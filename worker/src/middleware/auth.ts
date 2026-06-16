import { verifyCustomJwt } from "../lib/jwt";
import { isAdminEmail, isAllowedSchoolEmail, normalizeEmail } from "../lib/schoolRules";
import type { AuthenticatedUser, Middleware } from "../types";

function jsonError(message: string, status = 401): Response {
  return Response.json({ status: "error", message }, { status });
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export const requireAuth: Middleware = async (ctx) => {
  const token = getBearerToken(ctx.request);
  if (!token) {
    return jsonError("Authentication required.", 401);
  }

  if (!ctx.env.JWT_SECRET) {
    return jsonError("JWT configuration is missing on server.", 500);
  }

  const payload = await verifyCustomJwt(token, ctx.env.JWT_SECRET);
  if (!payload || !payload.email || !payload.sub) {
    return jsonError("Invalid or expired token.", 401);
  }

  const email = normalizeEmail(payload.email as string);

  if (!isAllowedSchoolEmail(email)) {
    return jsonError("Access restricted to @psbbschools.edu.in accounts.", 403);
  }

  const user: AuthenticatedUser = {
    userId: payload.sub as string,
    email,
    role: isAdminEmail(email) ? "admin" : "member",
  };

  return { ...ctx, user };
};
