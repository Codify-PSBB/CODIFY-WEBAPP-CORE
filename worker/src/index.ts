import { handleApiRequest } from "./router";
import type { Env } from "./types";

const CORS_ALLOW_HEADERS = "Authorization, Content-Type";
const CORS_ALLOW_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

function configuredOrigins(env: Env): Set<string> {
  return new Set(
    (env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean)
  );
}

function isAllowedOrigin(origin: string, env: Env): boolean {
  return LOCAL_ORIGIN.test(origin) || configuredOrigins(env).has(origin);
}

function buildCorsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");

  if (origin && isAllowedOrigin(origin, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.append("Vary", "Origin");
    headers.set("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
    headers.set("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}

function withResponseHeaders(request: Request, env: Env, response: Response): Response {
  const headers = new Headers(response.headers);
  buildCorsHeaders(request, env).forEach((value, key) => headers.set(key, value));
  headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cache-Control", "no-store");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (url.pathname.startsWith("/api")) {
      if (origin && !isAllowedOrigin(origin, env)) {
        return withResponseHeaders(
          request,
          env,
          Response.json({ status: "error", message: "Origin is not allowed." }, { status: 403 })
        );
      }

      if (request.method === "OPTIONS") {
        return withResponseHeaders(request, env, new Response(null, { status: 204 }));
      }

      try {
        return withResponseHeaders(request, env, await handleApiRequest(request, env));
      } catch (error) {
        console.error("Unhandled API error", error);
        return withResponseHeaders(
          request,
          env,
          Response.json({ status: "error", message: "Internal server error." }, { status: 500 })
        );
      }
    }

    return withResponseHeaders(request, env, new Response(null, { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
