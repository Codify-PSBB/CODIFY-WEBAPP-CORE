import { readCompetitionState } from "../lib/competition";
import type { Middleware } from "../types";

/**
 * Middleware: blocks non-admin members from submitting when competition is not live.
 * Replaces the old "app_status" KV key check with the new competition phase check.
 */
export const requireCompetitionLiveForMembers: Middleware = async (ctx) => {
  if (!ctx.user) {
    return Response.json({ status: "error", message: "Authentication context missing." }, { status: 500 });
  }

  // Admins always pass through
  if (ctx.user.role === "admin") {
    return ctx;
  }

  try {
    const state = await readCompetitionState(ctx.env.APP_STATE);
    if (state.phase !== "live") {
      return Response.json(
        { status: "error", message: "No competition is currently live." },
        { status: 403 }
      );
    }
    return ctx;
  } catch {
    return Response.json({ status: "error", message: "Failed to read competition status." }, { status: 500 });
  }
};

// Legacy alias so old imports still compile during transition
export const requireAppOnForMembers = requireCompetitionLiveForMembers;
