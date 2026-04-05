import type { RouteHandler } from "../types";

const APP_STATUS_KEY = "app_status";

type AppStatus = "ON" | "OFF";

interface ToggleRequestBody {
  status?: unknown;
}

function normalizeStatus(value: string | null): AppStatus {
  const upper = (value ?? "ON").trim().toUpperCase();
  return upper === "OFF" ? "OFF" : "ON";
}

function parseStatus(value: unknown): AppStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "ON" || normalized === "OFF") {
    return normalized;
  }

  return null;
}

export const adminToggleGetHandler: RouteHandler = async (ctx) => {
  try {
    const current = await ctx.env.APP_STATE.get(APP_STATUS_KEY);

    return Response.json({
      status: "success",
      data: {
        app_status: normalizeStatus(current)
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

export const adminToggleHandler: RouteHandler = async (ctx) => {
  let body: ToggleRequestBody;

  try {
    body = (await ctx.request.json()) as ToggleRequestBody;
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Invalid JSON body."
      },
      { status: 400 }
    );
  }

  const status = parseStatus(body.status);
  if (!status) {
    return Response.json(
      {
        status: "error",
        message: "`status` is required and must be `ON` or `OFF`."
      },
      { status: 400 }
    );
  }

  try {
    await ctx.env.APP_STATE.put(APP_STATUS_KEY, status);

    return Response.json({
      status: "success",
      data: {
        app_status: status
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to update app status."
      },
      { status: 500 }
    );
  }
};
