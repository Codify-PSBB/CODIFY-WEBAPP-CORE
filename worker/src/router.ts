import type { Env } from "./index";
import {
  adminReviewHandler,
  adminSubmissionsHandler,
  adminToggleHandler,
  leaderboardHandler,
  notFoundHandler,
  problemsHandler,
  submissionsHandler
} from "./placeholders";

type RouteHandler = (request: Request, env: Env) => Promise<Response>;

interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

const routes: Route[] = [
  { method: "GET", path: "/api/leaderboard", handler: leaderboardHandler },
  { method: "GET", path: "/api/problems", handler: problemsHandler },
  { method: "POST", path: "/api/submissions", handler: submissionsHandler },
  { method: "GET", path: "/api/admin/submissions", handler: adminSubmissionsHandler },
  { method: "POST", path: "/api/admin/review", handler: adminReviewHandler },
  { method: "POST", path: "/api/admin/toggle", handler: adminToggleHandler }
];

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

  return match.handler(request, env);
}
