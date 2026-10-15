// GET /api/competition/status — public(ish) endpoint, requires auth.
// Returns current competition phase and live problem list for members.
// Grade-targeted competitions are routed to students of that grade.
// Ineligible members receive empty problems list.

import { isGradeEligible, readCompetitionState } from "../lib/competition";
import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

export const competitionStatusHandler: RouteHandler = async (ctx) => {
  try {
    const userGrade = ctx.user?.grade ?? null;
    const isAdmin = ctx.user?.role === "admin";

    // For admins: optionally allow specifying a grade query e.g. ?grade=9 or ?grade=10
    const url = new URL(ctx.request.url);
    const requestedGradeParam = url.searchParams.get("grade");
    const requestedGrade = requestedGradeParam === "9" ? 9 : requestedGradeParam === "10" ? 10 : null;

    const lookupGrade = isAdmin ? requestedGrade : userGrade;
    const state = await readCompetitionState(ctx.env.DB, lookupGrade);

    const eligible =
      isAdmin || isGradeEligible(state.target_grade, userGrade);

    const db = createDbClient(ctx.env.DB);
    let gradeMissing = false;
    if (!isAdmin && userGrade === null) {
      const anyTargeted = await db.first<{ count: number }>(
        "SELECT COUNT(*) AS count FROM competitions WHERE reset_at IS NULL AND target_grade IS NOT NULL"
      );
      if ((anyTargeted?.count ?? 0) > 0 && state.competition_id === null) {
        gradeMissing = true;
      }
    }

    let problems: unknown[] = [];

    if (
      state.phase === "live" &&
      state.competition_id !== null &&
      eligible
    ) {
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
        grade_missing: gradeMissing,
        problems,
      },
    });
  } catch (err) {
    console.error("competitionStatusHandler error:", err);
    return Response.json({ status: "error", message: "Failed to read competition status." }, { status: 500 });
  }
};
