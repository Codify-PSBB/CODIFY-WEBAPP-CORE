// GET /api/competition/status — public(ish) endpoint, requires auth.
// Returns current competition phase and live problem list for members.
// Grade-targeted competitions are hidden (and their problems withheld) from
// members whose grade does not match.

import { isGradeEligible, readCompetitionState } from "../lib/competition";
import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

export const competitionStatusHandler: RouteHandler = async (ctx) => {
  try {
    const state = await readCompetitionState(ctx.env.DB);

    // Admins always see the true state; members must match the target grade.
    const isAdmin = ctx.user?.role === "admin";
    const eligible =
      isAdmin || isGradeEligible(state.target_grade, ctx.user?.grade ?? null);

    let problems: unknown[] = [];

    if (
      state.phase === "live" &&
      state.competition_id !== null &&
      eligible
    ) {
      const db = createDbClient(ctx.env.DB);
      problems = await db.all(
        `SELECT p.id, p.title, p.description, p.xp_reward,
                p.public_testcase_1_input, p.public_testcase_1_output,
                p.public_testcase_2_input, p.public_testcase_2_output,
                p.public_testcase_3_input, p.public_testcase_3_output,
                cp.display_order
         FROM competition_problems cp
         JOIN problems p ON p.id = cp.problem_id
         WHERE cp.competition_id = ?
         ORDER BY cp.display_order ASC, cp.id ASC`,
        [state.competition_id]
      );
    }

    return Response.json({
      status: "success",
      data: {
        phase: state.phase,
        competition_id: state.competition_id,
        started_at: state.started_at,
        target_grade: state.target_grade,
        eligible,
        problems,
      },
    });
  } catch (err) {
    console.error("competitionStatusHandler error:", err);
    return Response.json({ status: "error", message: "Failed to read competition status." }, { status: 500 });
  }
};
