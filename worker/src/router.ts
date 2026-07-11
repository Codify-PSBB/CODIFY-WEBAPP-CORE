import {
  adminProblemsArchiveHandler,
  adminProblemsDeleteHandler,
  adminProblemsGetHandler,
  adminProblemsPostHandler
} from "./handlers/adminProblems";
import { handleLogin, handleRegister } from "./handlers/auth";
import { appStatusHandler } from "./handlers/appStatus";
import { adminReviewHandler } from "./handlers/adminReview";
import { adminSubmissionsHandler } from "./handlers/adminSubmissions";
import { adminUsersHandler, adminCreateUserHandler } from "./handlers/adminUsers";
import { leaderboardHandler } from "./handlers/leaderboard";
import { submissionsHandler } from "./handlers/submissions";
import { competitionStatusHandler } from "./handlers/publicCompetition";
import {
  adminCompetitionGetHandler,
  adminCompetitionCreateHandler,
  adminCompetitionAddProblemHandler,
  adminCompetitionRemoveProblemHandler,
  adminCompetitionGoLiveHandler,
  adminCompetitionEndHandler,
  adminCompetitionResetHandler,
} from "./handlers/adminCompetition";
import { requireAdmin } from "./middleware/admin";
import { requireAuth } from "./middleware/auth";
import { requireCompetitionLiveForMembers } from "./middleware/appStatus";
import { notFoundHandler } from "./placeholders";
import type { Env, Middleware, RequestContext, RouteHandler } from "./types";

interface Route {
  method: string;
  path: string;
  middlewares: Middleware[];
  handler: RouteHandler;
}

const authOnly = [requireAuth];
const authAndLive = [requireAuth, requireCompetitionLiveForMembers];
const adminOnly = [requireAuth, requireAdmin];

const routes: Route[] = [
  // ── Public auth ─────────────────────────────────────────────────────────────
  { method: "POST", path: "/api/auth/register", middlewares: [], handler: handleRegister },
  { method: "POST", path: "/api/auth/login", middlewares: [], handler: handleLogin },

  // ── Member endpoints ─────────────────────────────────────────────────────────
  { method: "GET", path: "/api/status", middlewares: authOnly, handler: appStatusHandler }, // legacy
  { method: "GET", path: "/api/competition/status", middlewares: authOnly, handler: competitionStatusHandler },
  { method: "GET", path: "/api/leaderboard", middlewares: authOnly, handler: leaderboardHandler },
  { method: "POST", path: "/api/submissions", middlewares: authAndLive, handler: submissionsHandler },

  // ── Admin: users ─────────────────────────────────────────────────────────────
  { method: "GET", path: "/api/admin/users", middlewares: adminOnly, handler: adminUsersHandler },
  { method: "POST", path: "/api/admin/users/create", middlewares: adminOnly, handler: adminCreateUserHandler },

  // ── Admin: problem bank ──────────────────────────────────────────────────────
  { method: "GET", path: "/api/admin/problems", middlewares: adminOnly, handler: adminProblemsGetHandler },
  { method: "POST", path: "/api/admin/problems", middlewares: adminOnly, handler: adminProblemsPostHandler },
  { method: "POST", path: "/api/admin/problems/archive", middlewares: adminOnly, handler: adminProblemsArchiveHandler },
  { method: "POST", path: "/api/admin/problems/delete", middlewares: adminOnly, handler: adminProblemsDeleteHandler },

  // ── Admin: competition lifecycle ─────────────────────────────────────────────
  { method: "GET", path: "/api/admin/competition", middlewares: adminOnly, handler: adminCompetitionGetHandler },
  { method: "POST", path: "/api/admin/competition/create", middlewares: adminOnly, handler: adminCompetitionCreateHandler },
  { method: "POST", path: "/api/admin/competition/problems/add", middlewares: adminOnly, handler: adminCompetitionAddProblemHandler },
  { method: "POST", path: "/api/admin/competition/problems/remove", middlewares: adminOnly, handler: adminCompetitionRemoveProblemHandler },
  { method: "POST", path: "/api/admin/competition/go-live", middlewares: adminOnly, handler: adminCompetitionGoLiveHandler },
  { method: "POST", path: "/api/admin/competition/end", middlewares: adminOnly, handler: adminCompetitionEndHandler },
  { method: "POST", path: "/api/admin/competition/reset", middlewares: adminOnly, handler: adminCompetitionResetHandler },

  // ── Admin: submissions & review ──────────────────────────────────────────────
  { method: "GET", path: "/api/admin/submissions", middlewares: adminOnly, handler: adminSubmissionsHandler },
  { method: "POST", path: "/api/admin/review", middlewares: adminOnly, handler: adminReviewHandler },
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
      { status: "error", message: `Method ${request.method} not allowed for ${url.pathname}.` },
      { status: 405, headers: { Allow: allow } }
    );
  }

  const baseContext: RequestContext = { request, env };
  const middlewareResult = await runMiddlewares(baseContext, match.middlewares);

  if (middlewareResult instanceof Response) {
    return middlewareResult;
  }

  return match.handler(middlewareResult);
}
