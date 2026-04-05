import { requireAdmin } from "./middleware/admin";
import { requireAuth } from "./middleware/auth";
import {
  adminReviewHandler,
  adminSubmissionsHandler,
  adminToggleHandler,
  leaderboardHandler,
  notFoundHandler,
  problemsHandler,
  submissionsHandler
} from "./placeholders";
import type { Env, Middleware, RequestContext, RouteHandler } from "./types";

interface Route {
  method: string;
  path: string;
  middlewares: Middleware[];
  handler: RouteHandler;
}

const authOnly = [requireAuth];
const adminOnly = [requireAuth, requireAdmin];

const routes: Route[] = [
  { method: "GET", path: "/api/leaderboard", middlewares: authOnly, handler: leaderboardHandler },
  { method: "GET", path: "/api/problems", middlewares: authOnly, handler: problemsHandler },
  { method: "POST", path: "/api/submissions", middlewares: authOnly, handler: submissionsHandler },
  {
    method: "GET",
    path: "/api/admin/submissions",
    middlewares: adminOnly,
    handler: adminSubmissionsHandler
  },
  { method: "POST", path: "/api/admin/review", middlewares: adminOnly, handler: adminReviewHandler },
  { method: "POST", path: "/api/admin/toggle", middlewares: adminOnly, handler: adminToggleHandler }
];

async function runMiddlewares(ctx: RequestContext, middlewares: Middleware[]): Promise<RequestContext | Response> {
  let current = ctx;

  for (const middleware of middlewares) {
    const result = await middleware(current);
    if (result instanceof Response) {
      return result;
    }

    current = result;
  }

  return current;
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api" || url.pathname === "/api/") {
    return Response.json({
      status: "success",
      data: {
        message: "API router scaffold ready.",
        routes: routes.map((route) => ({ method: route.method, path: route.path }))
      }
    });
  }

  const match = routes.find((route) => route.path === url.pathname);
  if (!match) {
    return notFoundHandler();
  }

  if (request.method !== match.method) {
    return Response.json(
      {
        status: "error",
        message: `Method ${request.method} not allowed for ${url.pathname}.`
      },
      {
        status: 405,
        headers: {
          Allow: match.method
        }
      }
    );
  }

  const baseContext: RequestContext = { request, env };
  const middlewareResult = await runMiddlewares(baseContext, match.middlewares);

  if (middlewareResult instanceof Response) {
    return middlewareResult;
  }

  return match.handler(middlewareResult);
}
