import {
  adminProblemsArchiveHandler,
  adminProblemsDeleteHandler,
  adminProblemsGetHandler,
  adminProblemsPostHandler
} from "./handlers/adminProblems";
import {
  competitionEnterHandler,
  competitionRunHandler,
  competitionStatusHandler,
  competitionSubmitHandler,
} from "./handlers/competition";
import { appStatusHandler } from "./handlers/appStatus";
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
  { method: "GET", path: "/api/status", middlewares: authOnly, handler: appStatusHandler },
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
  {
    method: "POST",
    path: "/api/admin/problems/archive",
    middlewares: adminOnly,
    handler: adminProblemsArchiveHandler
  },
  {
    method: "POST",
    path: "/api/admin/problems/delete",
    middlewares: adminOnly,
    handler: adminProblemsDeleteHandler
  },
  { method: "GET", path: "/api/admin/toggle", middlewares: adminOnly, handler: adminToggleGetHandler },
  { method: "POST", path: "/api/admin/review", middlewares: adminOnly, handler: adminReviewHandler },
  { method: "POST", path: "/api/admin/toggle", middlewares: adminOnly, handler: adminToggleHandler },
  // Competition routes
  { method: "GET", path: "/api/competition/status", middlewares: authAndAppOn, handler: competitionStatusHandler },
  { method: "POST", path: "/api/competition/enter", middlewares: authAndAppOn, handler: competitionEnterHandler },
  { method: "POST", path: "/api/competition/run", middlewares: authAndAppOn, handler: competitionRunHandler },
  { method: "POST", path: "/api/competition/submit", middlewares: authAndAppOn, handler: competitionSubmitHandler }
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

  const pathMatches = routes.filter((route) => route.path === url.pathname);
  if (pathMatches.length === 0) {
    return notFoundHandler();
  }

  const match = pathMatches.find((route) => route.method === request.method);
  if (!match) {
    const allow = Array.from(new Set(pathMatches.map((route) => route.method))).join(", ");

    return Response.json(
      {
        status: "error",
        message: `Method ${request.method} not allowed for ${url.pathname}.`
      },
      {
        status: 405,
        headers: {
          Allow: allow
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
