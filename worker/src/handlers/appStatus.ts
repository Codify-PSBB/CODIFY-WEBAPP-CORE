import type { RouteHandler } from "../types";

const APP_STATUS_KEY = "app_status";

type AppStatus = "ON" | "OFF";

function normalizeStatus(value: string | null): AppStatus {
  const upper = (value ?? "ON").trim().toUpperCase();
  return upper === "OFF" ? "OFF" : "ON";
}

export const appStatusHandler: RouteHandler = async (ctx) => {
  try {
    const value = await ctx.env.APP_STATE.get(APP_STATUS_KEY);
    const appStatus = normalizeStatus(value);

    return Response.json({
      status: "success",
      data: {
        app_status: appStatus
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to read app status."
      },
      { status: 500 }
    );
  }
};
