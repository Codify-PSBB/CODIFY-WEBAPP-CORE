import type { Middleware } from "../types";

const APP_STATUS_KEY = "app_status";

export const requireAppOnForMembers: Middleware = async (ctx) => {
  if (!ctx.user) {
    return Response.json(
      {
        status: "error",
        message: "Authentication context missing."
      },
      { status: 500 }
    );
  }

  if (ctx.user.role === "admin") {
    return ctx;
  }

  try {
    const value = await ctx.env.APP_STATE.get(APP_STATUS_KEY);
    const status = (value ?? "ON").trim().toUpperCase();

    if (status === "OFF") {
      return Response.json(
        {
          status: "error",
          message: "Competition is currently OFF."
        },
        { status: 403 }
      );
    }

    return ctx;
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to read competition status."
      },
      { status: 500 }
    );
  }
};
