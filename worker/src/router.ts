import { adminProblemsGetHandler, adminProblemsPostHandler } from "./handlers/adminProblems";
import { adminReviewHandler } from "./handlers/adminReview";
import { adminSubmissionsHandler } from "./handlers/adminSubmissions";
import { adminToggleGetHandler, adminToggleHandler } from "./handlers/adminToggle";
import { adminUsersHandler } from "./handlers/adminUsers";
import { leaderboardHandler } from "./handlers/leaderboard";
import { problemsHandler } from "./handlers/problems";
import { submissionsHandler } from "./handlers/submissions";
import { requireAdmin } from "./middleware/admin";
import { requireAuth } from "./middleware/auth";
import { requireAppOnForMembers } from "./middleware/appStatus";
import { notFoundHandler } from "./placeholders";
import type { Env, Middleware, RequestContext, RouteHandler } from "./types";

interface Route {
  method: string;
  path: string;
  middlewares: Middleware[];
  handler: RouteHandler;
}

const authOnly = [requireAuth];
const authAndAppOn = [requireAuth, requireAppOnForMembers];
const adminOnly = [requireAuth, requireAdmin];

const routes: Route[] = [
  { method: "GET", path: "/api/leaderboard", middlewares: authOnly, handler: leaderboardHandler },
  { method: "GET", path: "/api/problems", middlewares: authAndAppOn, handler: problemsHandler },
  { method: "POST", path: "/api/submissions", middlewares: authAndAppOn, handler: submissionsHandler },
  {
    method: "GET",
    path: "/api/admin/submissions",
    middlewares: adminOnly,
    handler: adminSubmissionsHandler
  },
  {
    method: "GET",
    path: "/api/admin/users",
    middlewares: adminOnly,
    handler: adminUsersHandler
  },
  {
    method: "GET",
    path: "/api/admin/problems",
    middlewares: adminOnly,
    handler: adminProblemsGetHandler
  },
  {
    method: "POST",
    path: "/api/admin/problems",
    middlewares: adminOnly,
    handler: adminProblemsPostHandler
  },
  { method: "GET", path: "/api/admin/toggle", middlewares: adminOnly, handler: adminToggleGetHandler },
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
        message: "API router ready.",
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
