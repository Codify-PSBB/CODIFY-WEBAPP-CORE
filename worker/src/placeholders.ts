import type { RouteHandler } from "./types";

function placeholderResponse(endpoint: string, user: { userId: string; email: string; role: string }): Response {
  return Response.json(
    {
      status: "success",
      data: {
        endpoint,
        implemented: false,
        user,
        message: "Placeholder handler only. Business logic is not implemented yet."
      }
    },
    { status: 200 }
  );
}

export const leaderboardHandler: RouteHandler = async (ctx) => {
  return placeholderResponse("/api/leaderboard", {
    userId: ctx.user?.userId ?? "",
    email: ctx.user?.email ?? "",
    role: ctx.user?.role ?? "member"
  });
};

export const problemsHandler: RouteHandler = async (ctx) => {
  return placeholderResponse("/api/problems", {
    userId: ctx.user?.userId ?? "",
    email: ctx.user?.email ?? "",
    role: ctx.user?.role ?? "member"
  });
};

export const submissionsHandler: RouteHandler = async (ctx) => {
  return placeholderResponse("/api/submissions", {
    userId: ctx.user?.userId ?? "",
    email: ctx.user?.email ?? "",
    role: ctx.user?.role ?? "member"
  });
};

export const adminSubmissionsHandler: RouteHandler = async (ctx) => {
  return placeholderResponse("/api/admin/submissions", {
    userId: ctx.user?.userId ?? "",
    email: ctx.user?.email ?? "",
    role: ctx.user?.role ?? "member"
  });
};

export const adminReviewHandler: RouteHandler = async (ctx) => {
  return placeholderResponse("/api/admin/review", {
    userId: ctx.user?.userId ?? "",
    email: ctx.user?.email ?? "",
    role: ctx.user?.role ?? "member"
  });
};

export const adminToggleHandler: RouteHandler = async (ctx) => {
  return placeholderResponse("/api/admin/toggle", {
    userId: ctx.user?.userId ?? "",
    email: ctx.user?.email ?? "",
    role: ctx.user?.role ?? "member"
  });
};

export function notFoundHandler(): Response {
  return Response.json(
    {
      status: "error",
      message: "API route not found."
    },
    { status: 404 }
  );
}
