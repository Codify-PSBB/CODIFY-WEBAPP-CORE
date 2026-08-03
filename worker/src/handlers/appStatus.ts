// Legacy endpoint: GET /api/status
// Now wraps competition phase into old ON/OFF format for backwards compat.
// Frontend has been updated to use GET /api/competition/status instead.

import { readCompetitionState, phaseToLegacyStatus } from "../lib/competition";
import type { RouteHandler } from "../types";

export const appStatusHandler: RouteHandler = async (ctx) => {
  try {
    const state = await readCompetitionState(ctx.env.DB);
    const appStatus = phaseToLegacyStatus(state.phase);

    return Response.json({
      status: "success",
      data: {
        app_status: appStatus,
        phase: state.phase,
      },
    });
  } catch {
    return Response.json({ status: "error", message: "Failed to read app status." }, { status: 500 });
  }
};
