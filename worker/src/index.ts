import { handleApiRequest } from "./router";
import type { Env } from "./types";

const CORS_ALLOW_HEADERS = "Authorization, Content-Type";
const CORS_ALLOW_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";

function buildCorsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.append("Vary", "Origin");
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  headers.set("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
  headers.set("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
  headers.set("Access-Control-Max-Age", "86400");

  return headers;
}

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const corsHeaders = buildCorsHeaders(request);

  corsHeaders.forEach((value, key) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: buildCorsHeaders(request)
        });
      }

      const response = await handleApiRequest(request, env);
      return withCors(request, response);
    }

    return Response.json({
      status: "success",
      data: {
        service: "coding-club-worker",
        message: "Worker is running."
      }
    });
  }
};
