import type { Env } from "./index";

type PlaceholderHandler = (request: Request, env: Env) => Promise<Response>;

function placeholderResponse(endpoint: string): Response {
  return Response.json(
    {
      status: "success",
      data: {
        endpoint,
        implemented: false,
        message: "Placeholder handler only. Business logic is not implemented yet."
      }
    },
    { status: 200 }
  );
}

export const leaderboardHandler: PlaceholderHandler = async () => {
  return placeholderResponse("/api/leaderboard");
};

export const problemsHandler: PlaceholderHandler = async () => {
  return placeholderResponse("/api/problems");
};

export const submissionsHandler: PlaceholderHandler = async () => {
  return placeholderResponse("/api/submissions");
};

export const adminSubmissionsHandler: PlaceholderHandler = async () => {
  return placeholderResponse("/api/admin/submissions");
};

export const adminReviewHandler: PlaceholderHandler = async () => {
  return placeholderResponse("/api/admin/review");
};

export const adminToggleHandler: PlaceholderHandler = async () => {
  return placeholderResponse("/api/admin/toggle");
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
