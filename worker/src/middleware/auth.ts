import { verifyToken } from "@clerk/backend";
import type { AuthenticatedUser, Middleware } from "../types";

const ALLOWED_EMAIL_DOMAIN = "@psbbschools.edu.in";

// Update this list with real admin emails used by the coding club.
const ADMIN_EMAILS = new Set<string>([
  "admin1@psbbschools.edu.in",
  "admin2@psbbschools.edu.in"
]);

type TokenClaims = Record<string, unknown> & {
  sub?: unknown;
  sid?: unknown;
  email?: unknown;
  email_address?: unknown;
};

function jsonError(message: string, status = 401): Response {
  return Response.json({ status: "error", message }, { status });
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function extractEmail(claims: TokenClaims): string | null {
  const direct =
    readString(claims.email) ??
    readString(claims.email_address) ??
    readString(claims["https://clerk.dev/email"]);

  if (direct) {
    return direct;
  }

  const nestedClaims = claims["https://clerk.dev/claims"];
  if (typeof nestedClaims === "object" && nestedClaims !== null) {
    const nested = nestedClaims as Record<string, unknown>;
    return readString(nested.email) ?? readString(nested.email_address);
  }

  return null;
}

function resolveRole(email: string): "member" | "admin" {
  return ADMIN_EMAILS.has(email) ? "admin" : "member";
}

export const requireAuth: Middleware = async (ctx) => {
  const token = getBearerToken(ctx.request);
  if (!token) {
    return jsonError("Authentication required.", 401);
  }

  const secretKey = ctx.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return jsonError("Missing Clerk secret key configuration.", 500);
  }

  let claims: TokenClaims;
  try {
    claims = (await verifyToken(token, { secretKey })) as TokenClaims;
  } catch {
    return jsonError("Invalid or expired Clerk session token.", 401);
  }

  const userId = readString(claims.sub);
  const email = extractEmail(claims)?.toLowerCase();

  if (!userId || !email) {
    return jsonError("Unable to resolve user identity from Clerk session.", 401);
  }

  if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    return jsonError("Access restricted to @psbbschools.edu.in accounts.", 403);
  }

  const user: AuthenticatedUser = {
    userId,
    email,
    role: resolveRole(email),
    sessionId: readString(claims.sid) ?? undefined
  };

  return {
    ...ctx,
    user
  };
};
