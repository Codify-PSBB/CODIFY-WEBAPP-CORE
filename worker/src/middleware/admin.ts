import type { Middleware } from "../types";

export const requireAdmin: Middleware = async (ctx) => {
  if (!ctx.user) {
    return Response.json(
      {
        status: "error",
        message: "Authentication context missing."
      },
      { status: 500 }
    );
  }

  if (ctx.user.role !== "admin") {
    return Response.json(
      {
        status: "error",
        message: "Admin access required."
      },
      { status: 403 }
    );
  }

  return ctx;
};
