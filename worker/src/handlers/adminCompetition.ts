import { createDbClient } from "../lib/db";
import { readCompetitionState } from "../lib/competition";
import type { RouteHandler } from "../types";

// ── GET /api/admin/competition ────────────────────────────────────────────────
// Returns current competition state + full problem list for current competition.
export const adminCompetitionGetHandler: RouteHandler = async (ctx) => {
  try {
    const state = await readCompetitionState(ctx.env.DB);
    const db = createDbClient(ctx.env.DB);

    let competition = null;
    let competitionProblems: unknown[] = [];

    if (state.competition_id !== null) {
      competition = await db.first<{
        id: number;
        status: string;
        created_by: string;
        started_at: string | null;
        ended_at: string | null;
        created_at: string;
      }>("SELECT id, status, created_by, started_at, ended_at, created_at FROM competitions WHERE id = ?", [
        state.competition_id,
      ]);

      competitionProblems = await db.all<{
        id: number;
        problem_id: number;
        display_order: number;
        title: string;
        description: string;
        xp_reward: number;
        public_testcase_1_input: string | null;
        public_testcase_1_output: string | null;
        public_testcase_2_input: string | null;
        public_testcase_2_output: string | null;
        public_testcase_3_input: string | null;
        public_testcase_3_output: string | null;
        testcases: string | null;
      }>(
        `SELECT cp.id, cp.problem_id, cp.display_order,
                p.title, p.description, p.xp_reward,
                p.public_testcase_1_input, p.public_testcase_1_output,
                p.public_testcase_2_input, p.public_testcase_2_output,
                p.public_testcase_3_input, p.public_testcase_3_output,
                p.testcases
         FROM competition_problems cp
         JOIN problems p ON p.id = cp.problem_id
         WHERE cp.competition_id = ?
         ORDER BY cp.display_order ASC, cp.id ASC`,
        [state.competition_id]
      );
    }

    // Count live submissions if competition is live/ended
    let submissionGroupCount = 0;
    if (state.competition_id !== null && (state.phase === "live" || state.phase === "ended")) {
      const row = await db.first<{ count: number }>(
        "SELECT COUNT(*) AS count FROM submission_groups WHERE competition_id = ?",
        [state.competition_id]
      );
      submissionGroupCount = row?.count ?? 0;
    }

    return Response.json({
      status: "success",
      data: {
        phase: state.phase,
        competition,
        competition_problems: competitionProblems,
        submission_group_count: submissionGroupCount,
      },
    });
  } catch (err) {
    console.error("adminCompetitionGetHandler error:", err);
    return Response.json({ status: "error", message: "Failed to load competition state." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/create ────────────────────────────────────────
// Creates a new competition in 'setup' phase. Requires current phase to be 'idle'.
export const adminCompetitionCreateHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const state = await readCompetitionState(ctx.env.DB);
    if (state.phase !== "idle") {
      return Response.json(
        { status: "error", message: `Cannot create a competition while phase is '${state.phase}'. Reset first.` },
        { status: 409 }
      );
    }

    const db = createDbClient(ctx.env.DB);
    const inserted = await db.first<{ id: number }>(
      `INSERT INTO competitions (status, created_by)
       SELECT 'setup', ?
       WHERE NOT EXISTS (SELECT 1 FROM competitions WHERE reset_at IS NULL)
       RETURNING id`,
      [ctx.user.email]
    );

    if (!inserted) {
      return Response.json({ status: "error", message: "A competition is already active." }, { status: 409 });
    }

    return Response.json({
      status: "success",
      data: { competition_id: inserted.id, phase: "setup", message: "Competition created. Add problems, then go live." },
    });
  } catch (err) {
    console.error("adminCompetitionCreateHandler error:", err);
    return Response.json({ status: "error", message: "Failed to create competition." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/problems/add ──────────────────────────────────
// Adds a problem to the current setup competition.
export const adminCompetitionAddProblemHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const state = await readCompetitionState(ctx.env.DB);
    if (state.phase !== "setup" || state.competition_id === null) {
      return Response.json(
        { status: "error", message: "Can only add problems during 'setup' phase." },
        { status: 409 }
      );
    }

    const body = (await ctx.request.json()) as { problem_id?: unknown };
    const problemId = typeof body.problem_id === "number" ? body.problem_id : null;
    if (!problemId) {
      return Response.json({ status: "error", message: "`problem_id` is required." }, { status: 400 });
    }

    const db = createDbClient(ctx.env.DB);

    // Verify problem exists
    const problem = await db.first<{ id: number; title: string }>("SELECT id, title FROM problems WHERE id = ?", [problemId]);
    if (!problem) {
      return Response.json({ status: "error", message: "Problem not found." }, { status: 404 });
    }

    // Get next display_order
    const maxOrder = await db.first<{ max_order: number | null }>(
      "SELECT MAX(display_order) AS max_order FROM competition_problems WHERE competition_id = ?",
      [state.competition_id]
    );
    const nextOrder = (maxOrder?.max_order ?? -1) + 1;

    await db.run(
      "INSERT INTO competition_problems (competition_id, problem_id, display_order) VALUES (?, ?, ?) ON CONFLICT(competition_id, problem_id) DO NOTHING",
      [state.competition_id, problemId, nextOrder]
    );

    return Response.json({
      status: "success",
      data: { message: `Problem "${problem.title}" added to competition.` },
    });
  } catch (err) {
    console.error("adminCompetitionAddProblemHandler error:", err);
    return Response.json({ status: "error", message: "Failed to add problem." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/problems/remove ───────────────────────────────
// Removes a problem from the current setup competition.
export const adminCompetitionRemoveProblemHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const state = await readCompetitionState(ctx.env.DB);
    if (state.phase !== "setup" || state.competition_id === null) {
      return Response.json(
        { status: "error", message: "Can only remove problems during 'setup' phase." },
        { status: 409 }
      );
    }

    const body = (await ctx.request.json()) as { problem_id?: unknown };
    const problemId = typeof body.problem_id === "number" ? body.problem_id : null;
    if (!problemId) {
      return Response.json({ status: "error", message: "`problem_id` is required." }, { status: 400 });
    }

    const db = createDbClient(ctx.env.DB);
    await db.run(
      "DELETE FROM competition_problems WHERE competition_id = ? AND problem_id = ?",
      [state.competition_id, problemId]
    );

    return Response.json({ status: "success", data: { message: "Problem removed from competition." } });
  } catch (err) {
    console.error("adminCompetitionRemoveProblemHandler error:", err);
    return Response.json({ status: "error", message: "Failed to remove problem." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/go-live ───────────────────────────────────────
// Transitions setup → live. Requires at least 1 problem in the competition.
export const adminCompetitionGoLiveHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const state = await readCompetitionState(ctx.env.DB);
    if (state.phase !== "setup" || state.competition_id === null) {
      return Response.json(
        { status: "error", message: "Competition must be in 'setup' phase to go live." },
        { status: 409 }
      );
    }

    const db = createDbClient(ctx.env.DB);
    const problemCount = await db.first<{ count: number }>(
      "SELECT COUNT(*) AS count FROM competition_problems WHERE competition_id = ?",
      [state.competition_id]
    );

    if ((problemCount?.count ?? 0) === 0) {
      return Response.json(
        { status: "error", message: "Add at least 1 problem before going live." },
        { status: 422 }
      );
    }

    const startedAt = new Date().toISOString();
    await db.run(
      "UPDATE competitions SET status = 'live', started_at = ? WHERE id = ? AND status = 'setup' AND reset_at IS NULL",
      [startedAt, state.competition_id]
    );

    return Response.json({
      status: "success",
      data: { phase: "live", started_at: startedAt, message: "Competition is now LIVE!" },
    });
  } catch (err) {
    console.error("adminCompetitionGoLiveHandler error:", err);
    return Response.json({ status: "error", message: "Failed to go live." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/end ───────────────────────────────────────────
// Transitions live → ended. Single click, no vote required.
export const adminCompetitionEndHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const state = await readCompetitionState(ctx.env.DB);
    if (state.phase !== "live" || state.competition_id === null) {
      return Response.json(
        { status: "error", message: "Competition must be 'live' to end it." },
        { status: 409 }
      );
    }

    const endedAt = new Date().toISOString();
    const db = createDbClient(ctx.env.DB);
    await db.run(
      "UPDATE competitions SET status = 'ended', ended_at = ? WHERE id = ? AND status = 'live' AND reset_at IS NULL",
      [endedAt, state.competition_id]
    );

    return Response.json({
      status: "success",
      data: { phase: "ended", ended_at: endedAt, message: "Competition ended." },
    });
  } catch (err) {
    console.error("adminCompetitionEndHandler error:", err);
    return Response.json({ status: "error", message: "Failed to end competition." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/reset ─────────────────────────────────────────
// Transitions ended → idle. Clears KV state. Historical data is preserved in DB.
export const adminCompetitionResetHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const state = await readCompetitionState(ctx.env.DB);
    if (state.phase !== "ended") {
      return Response.json(
        { status: "error", message: "Can only reset after a competition has ended." },
        { status: 409 }
      );
    }

    const db = createDbClient(ctx.env.DB);
    const resetAt = new Date().toISOString();
    await db.run(
      "UPDATE competitions SET reset_at = ? WHERE id = ? AND status = 'ended' AND reset_at IS NULL",
      [resetAt, state.competition_id]
    );

    return Response.json({
      status: "success",
      data: { phase: "idle", message: "Reset to idle. Ready for a new competition." },
    });
  } catch (err) {
    console.error("adminCompetitionResetHandler error:", err);
    return Response.json({ status: "error", message: "Failed to reset." }, { status: 500 });
  }
};
